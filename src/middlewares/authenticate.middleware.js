import { verifyAccessToken, extractBearerToken } from '../utils/jwt.util.js';
import { User } from '../models/index.js';
import { AuthenticationError } from '../helpers/error.helper.js';
import { asyncHandler } from '../utils/async.util.js';
import logger from '../config/logger.js';

/**
 * Verify JWT access token and attach user to req.user.
 * Throws AuthenticationError on any failure.
 */
export const authenticate = asyncHandler(async (req, res, next) => {
  const token = extractBearerToken(req.headers.authorization)
    || req.cookies?.accessToken;

  if (!token) throw new AuthenticationError('Access token is required');

  let decoded;
  try {
    decoded = verifyAccessToken(token);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new AuthenticationError('Access token has expired');
    }
    throw new AuthenticationError('Invalid access token');
  }

  const user = await User.findById(decoded.userId).select('+refreshTokens').lean();

  if (!user) throw new AuthenticationError('User account not found');
  if (!user.isActive) throw new AuthenticationError('Account is deactivated');
  if (user.isBlocked) throw new AuthenticationError('Account is blocked. Contact support.');

  // Check if account is locked
  if (user.lockUntil && new Date(user.lockUntil) > new Date()) {
    throw new AuthenticationError('Account is temporarily locked due to failed login attempts');
  }

  // Check if password changed after token was issued
  if (user.passwordChangedAt) {
    const changedTs = Math.floor(new Date(user.passwordChangedAt).getTime() / 1000);
    if (decoded.iat < changedTs) {
      throw new AuthenticationError('Password was recently changed. Please log in again.');
    }
  }

  // Attach minimal user info to request
  req.user = {
    id: user._id.toString(),
    _id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    permissions: user.permissions || [],
    wallet: user.wallet,
  };

  req.requestId = req.requestId || `REQ-${Date.now()}`;

  logger.debug('User authenticated', {
    userId: req.user.id,
    role: req.user.role,
    path: req.path,
  });

  next();
});

/**
 * Optional authentication — sets req.user if token present, continues regardless.
 */
export const optionalAuthenticate = asyncHandler(async (req, res, next) => {
  const token = extractBearerToken(req.headers.authorization)
    || req.cookies?.accessToken;

  if (!token) return next();

  try {
    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.userId).lean();
    if (user && user.isActive && !user.isBlocked) {
      req.user = {
        id: user._id.toString(),
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        permissions: user.permissions || [],
        wallet: user.wallet,
      };
    }
  } catch {
    // Token invalid/expired — continue unauthenticated
  }

  next();
});
