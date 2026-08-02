import mongoose from 'mongoose';
import { userRepository } from '../repositories/user.repository.js';
import { sessionRepository } from '../repositories/session.repository.js';
import { walletRepository } from '../repositories/wallet.repository.js';
import { auditLogRepository } from '../repositories/log.repository.js';
import { notificationRepository } from '../repositories/notification.repository.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../utils/jwt.util.js';
import {
  sha256Hash,
  generateSecureToken,
} from '../utils/crypto.util.js';
import { generateOpaqueToken } from '../utils/id.util.js';
import { addMinutes } from '../utils/date.util.js';
import {
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendAccountLockedEmail,
} from '../utils/mailer.util.js';
import {
  AuthenticationError,
  NotFoundError,
  ConflictError,
  BusinessError,
} from '../helpers/error.helper.js';
import { AUDIT_ACTION, AUDIT_SEVERITY } from '../constants/audit.js';
import { NOTIFICATION_EVENT, NOTIFICATION_TYPE } from '../constants/notification.js';
import { ROLES } from '../constants/roles.js';
import logger, { authLogger } from '../config/logger.js';
import env from '../config/env.js';

// ── Token pair builder ────────────────────────────────────────────────────────
const buildTokenPayload = (user) => ({
  userId: user._id.toString(),
  role: user.role,
  email: user.email,
});

const issueTokenPair = (user) => ({
  accessToken: signAccessToken(buildTokenPayload(user)),
  refreshToken: signRefreshToken(buildTokenPayload(user)),
});

// ── Auth Service ──────────────────────────────────────────────────────────────
export const authService = {
  /**
   * Register a new user (admin creates retailer, or super admin creates admin).
   */
  async register(data, createdBy = null) {
    const { name, email, phone, password, role = ROLES.RETAILER, businessName, commissionRate } = data;

    const [emailExists, phoneExists] = await Promise.all([
      userRepository.findByEmail(email),
      userRepository.findByPhone(phone),
    ]);

    if (emailExists) throw new ConflictError('Email address already registered');
    if (phoneExists) throw new ConflictError('Phone number already registered');

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const user = await userRepository.create({
        name,
        email,
        phone,
        password,
        role,
        businessName: businessName || '',
        commissionRate: commissionRate || env.wallet.commissionRate,
        createdBy,
        parentId: createdBy,
      });

      // Create wallet for the user
      const wallet = await walletRepository.create({
        user: user._id,
        walletLimit: env.wallet.defaultLimit,
      });

      // Link wallet to user
      await userRepository.setWallet(user._id, wallet._id);

      await session.commitTransaction();

      // Send welcome email (non-blocking)
      sendWelcomeEmail(email, { name }).catch((err) =>
        authLogger.error('Welcome email failed', { error: err.message }),
      );

      // Audit
      auditLogRepository.create({
        performedBy: createdBy,
        targetUser: user._id,
        action: AUDIT_ACTION.USER_CREATED,
        severity: AUDIT_SEVERITY.MEDIUM,
        module: 'auth',
        description: `User ${email} registered with role ${role}`,
      }).catch(() => {});

      authLogger.info('User registered', { userId: user._id, role });
      return user;
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  },

  /**
   * Login with email/phone and password.
   */
  async login(identifier, password, deviceInfo = {}, ipAddress = '') {
    const user = await userRepository.findByEmailOrPhone(identifier);

    if (!user) throw new AuthenticationError('Invalid credentials');

    // Check account state
    if (user.isBlocked) throw new AuthenticationError('Account is blocked. Contact support.');
    if (!user.isActive) throw new AuthenticationError('Account is deactivated');

    // Check if account is locked
    if (user.lockUntil && new Date(user.lockUntil) > new Date()) {
      const unlockTime = new Date(user.lockUntil).toLocaleString('en-IN');
      throw new AuthenticationError(`Account locked until ${unlockTime}`);
    }

    // Verify password — need a full document for bcrypt
    const userDoc = await userRepository.model.findById(user._id).select('+password');
    const isPasswordValid = await userDoc.comparePassword(password);

    if (!isPasswordValid) {
      await userDoc.incrementLoginAttempts();

      // If just locked, send notification
      if (userDoc.lockUntil && new Date(userDoc.lockUntil) > new Date()) {
        const unlockTime = new Date(userDoc.lockUntil).toLocaleString('en-IN');
        sendAccountLockedEmail(user.email, { name: user.name, unlockTime }).catch(() => {});

        auditLogRepository.create({
          targetUser: user._id,
          action: AUDIT_ACTION.ACCOUNT_LOCKED,
          severity: AUDIT_SEVERITY.HIGH,
          module: 'auth',
          description: 'Account locked due to multiple failed login attempts',
          ipAddress,
        }).catch(() => {});
      }

      throw new AuthenticationError('Invalid credentials');
    }

    // Reset failed attempts
    await userRepository.updateLastLogin(user._id, ipAddress);

    // Issue tokens
    const tokens = issueTokenPair(user);
    const refreshTokenHash = sha256Hash(tokens.refreshToken);
    const expiresAt = addMinutes(new Date(), 7 * 24 * 60); // 7 days

    // Persist session
    await sessionRepository.createSession({
      user: user._id,
      refreshToken: tokens.refreshToken,
      expiresAt,
      ipAddress,
      userAgent: deviceInfo.userAgent || '',
      deviceId: deviceInfo.deviceId || '',
      deviceName: deviceInfo.deviceName || 'Unknown Device',
      deviceType: deviceInfo.deviceType || 'unknown',
    });

    // Add device
    userRepository.addDevice(user._id, {
      deviceId: deviceInfo.deviceId || `auto-${Date.now()}`,
      deviceName: deviceInfo.deviceName || 'Unknown Device',
      deviceType: deviceInfo.deviceType || 'unknown',
      ipAddress,
      userAgent: deviceInfo.userAgent || '',
      lastLoginAt: new Date(),
    }).catch(() => {});

    // Audit
    auditLogRepository.create({
      performedBy: user._id,
      action: AUDIT_ACTION.LOGIN,
      severity: AUDIT_SEVERITY.LOW,
      module: 'auth',
      description: `User logged in from ${ipAddress}`,
      ipAddress,
    }).catch(() => {});

    authLogger.info('User logged in', { userId: user._id, role: user.role, ip: ipAddress });

    const safeUser = {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      wallet: user.wallet,
      lastLoginAt: user.lastLoginAt,
    };

    return { user: safeUser, ...tokens };
  },

  /**
   * Refresh access token using a valid refresh token.
   */
  async refreshToken(rawRefreshToken) {
    let decoded;
    try {
      decoded = verifyRefreshToken(rawRefreshToken);
    } catch {
      throw new AuthenticationError('Invalid or expired refresh token');
    }

    const hash = sha256Hash(rawRefreshToken);
    const session = await sessionRepository.findByRefreshTokenHash(hash);

    if (!session || !session.isActive) {
      throw new AuthenticationError('Session not found or revoked');
    }

    if (new Date(session.expiresAt) < new Date()) {
      throw new AuthenticationError('Refresh token has expired');
    }

    const user = await userRepository.findById(decoded.userId);
    if (!user || !user.isActive || user.isBlocked) {
      throw new AuthenticationError('User account is unavailable');
    }

    // Rotate refresh token — revoke old, issue new
    await sessionRepository.revokeSession(hash, 'token_rotation');
    const newTokens = issueTokenPair(user);
    const newHash = sha256Hash(newTokens.refreshToken);
    const expiresAt = addMinutes(new Date(), 7 * 24 * 60);

    await sessionRepository.createSession({
      user: user._id,
      refreshToken: newTokens.refreshToken,
      expiresAt,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      deviceId: session.deviceId,
      deviceName: session.deviceName,
    });

    return newTokens;
  },

  /**
   * Logout — revoke session.
   */
  async logout(rawRefreshToken, userId) {
    if (rawRefreshToken) {
      const hash = sha256Hash(rawRefreshToken);
      await sessionRepository.revokeSession(hash, 'logout');
    }

    auditLogRepository.create({
      performedBy: userId,
      action: AUDIT_ACTION.LOGOUT,
      severity: AUDIT_SEVERITY.LOW,
      module: 'auth',
      description: 'User logged out',
    }).catch(() => {});
  },

  /**
   * Logout from all devices.
   */
  async logoutAll(userId) {
    await sessionRepository.revokeAllUserSessions(userId, 'logout_all');
    authLogger.info('User logged out from all devices', { userId });
  },

  /**
   * Initiate forgot-password flow.
   */
  async forgotPassword(email) {
    const user = await userRepository.findByEmail(email);
    // Always return success (don't reveal if email exists)
    if (!user) return;

    const rawToken = generateOpaqueToken();
    const hashedToken = sha256Hash(rawToken);
    const expiresAt = addMinutes(new Date(), 15);

    await userRepository.setPasswordResetToken(user._id, hashedToken, expiresAt);

    const resetUrl = `${env.app.frontendUrl}/reset-password?token=${rawToken}`;
    await sendPasswordResetEmail(email, { name: user.name, resetUrl });

    auditLogRepository.create({
      targetUser: user._id,
      action: AUDIT_ACTION.PASSWORD_RESET_REQUESTED,
      severity: AUDIT_SEVERITY.MEDIUM,
      module: 'auth',
      description: `Password reset requested for ${email}`,
    }).catch(() => {});
  },

  /**
   * Complete password reset.
   */
  async resetPassword(token, newPassword) {
    const hashedToken = sha256Hash(token);
    const user = await userRepository.findByPasswordResetToken(hashedToken);

    if (!user) throw new BusinessError('Invalid or expired password reset token');

    // Update password
    const userDoc = await userRepository.model.findById(user._id);
    userDoc.password = newPassword;
    await userDoc.save();

    await userRepository.clearPasswordResetToken(user._id);
    await sessionRepository.revokeAllUserSessions(user._id, 'password_reset');

    auditLogRepository.create({
      targetUser: user._id,
      action: AUDIT_ACTION.PASSWORD_RESET_COMPLETED,
      severity: AUDIT_SEVERITY.HIGH,
      module: 'auth',
      description: 'Password reset completed',
    }).catch(() => {});
  },

  /**
   * Change password (authenticated).
   */
  async changePassword(userId, currentPassword, newPassword) {
    const userDoc = await userRepository.model.findById(userId).select('+password');
    if (!userDoc) throw new NotFoundError('User not found');

    const isValid = await userDoc.comparePassword(currentPassword);
    if (!isValid) throw new AuthenticationError('Current password is incorrect');

    userDoc.password = newPassword;
    await userDoc.save();

    await sessionRepository.revokeAllUserSessions(userId, 'password_changed');

    auditLogRepository.create({
      performedBy: userId,
      action: AUDIT_ACTION.PASSWORD_CHANGED,
      severity: AUDIT_SEVERITY.HIGH,
      module: 'auth',
      description: 'Password changed by user',
    }).catch(() => {});
  },

  /**
   * Update user profile.
   */
  async updateProfile(userId, updateData) {
    const allowed = ['name', 'businessName', 'gstNumber', 'panNumber', 'address', 'avatar'];
    const sanitized = {};
    for (const key of allowed) {
      if (updateData[key] !== undefined) sanitized[key] = updateData[key];
    }
    const user = await userRepository.updateById(userId, { $set: sanitized });
    if (!user) throw new NotFoundError('User not found');
    return user;
  },

  /**
   * Get active sessions for a user.
   */
  async getSessions(userId) {
    return sessionRepository.findActiveSessions(userId);
  },

  /**
   * Get login history.
   */
  async getLoginHistory(userId) {
    return sessionRepository.getLoginHistory(userId, 20);
  },
};
