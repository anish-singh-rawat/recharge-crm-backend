import { User } from '../models/index.js';
import { BaseRepository } from './base.repository.js';

class UserRepository extends BaseRepository {
  constructor() {
    super(User);
  }

  async findByEmail(email, selectPassword = false) {
    const query = User.findOne({ email: email.toLowerCase().trim() });
    if (selectPassword) query.select('+password +refreshTokens');
    return query.lean();
  }

  async findByPhone(phone) {
    return User.findOne({ phone: phone.trim() }).lean();
  }

  async findByEmailOrPhone(identifier) {
    const isEmail = identifier.includes('@');
    const filter = isEmail
      ? { email: identifier.toLowerCase().trim() }
      : { phone: identifier.trim() };
    return User.findOne(filter).select('+password').lean();
  }

  async findByIdWithPassword(id) {
    return User.findById(id).select('+password +refreshTokens').lean();
  }

  async findByPasswordResetToken(hashedToken) {
    return User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() },
    }).lean();
  }

  async findRetailersByAdmin(adminId, filter = {}) {
    return User.find({ parentId: adminId, ...filter }).lean();
  }

  async findAllRetailers(filter = {}) {
    return User.find({ role: 'retailer', ...filter }).lean();
  }

  async findPaginatedUsers(filter = {}, paginationOptions = {}) {
    return this.findPaginated(filter, {
      ...paginationOptions,
      populate: [{ path: 'wallet', select: 'balance status' }],
    });
  }

  async setPasswordResetToken(userId, hashedToken, expiresAt) {
    return User.findByIdAndUpdate(
      userId,
      {
        $set: {
          passwordResetToken: hashedToken,
          passwordResetExpires: expiresAt,
        },
      },
      { new: true },
    ).lean();
  }

  async clearPasswordResetToken(userId) {
    return User.findByIdAndUpdate(
      userId,
      {
        $unset: { passwordResetToken: '', passwordResetExpires: '' },
        $set: { passwordChangedAt: new Date() },
      },
      { new: true },
    ).lean();
  }

  async updateLastLogin(userId, ipAddress) {
    return User.findByIdAndUpdate(
      userId,
      {
        $set: {
          lastLoginAt: new Date(),
          lastLoginIp: ipAddress,
          loginAttempts: 0,
          lockUntil: null,
        },
      },
      { new: true },
    ).lean();
  }

  async addRefreshToken(userId, token) {
    return User.findByIdAndUpdate(
      userId,
      { $addToSet: { refreshTokens: token } },
      { new: true },
    ).lean();
  }

  async removeRefreshToken(userId, token) {
    return User.findByIdAndUpdate(
      userId,
      { $pull: { refreshTokens: token } },
      { new: true },
    ).lean();
  }

  async clearAllRefreshTokens(userId) {
    return User.findByIdAndUpdate(
      userId,
      { $set: { refreshTokens: [] } },
      { new: true },
    ).lean();
  }

  async addDevice(userId, deviceData) {
    return User.findByIdAndUpdate(
      userId,
      {
        $push: {
          devices: {
            $each: [deviceData],
            $slice: -10,
          },
        },
      },
      { new: true },
    ).lean();
  }

  async blockUser(userId, reason, blockedBy) {
    return User.findByIdAndUpdate(
      userId,
      {
        $set: {
          isBlocked: true,
          blockedReason: reason,
          blockedAt: new Date(),
          blockedBy,
        },
      },
      { new: true },
    ).lean();
  }

  async unblockUser(userId) {
    return User.findByIdAndUpdate(
      userId,
      {
        $set: {
          isBlocked: false,
          blockedReason: '',
          blockedAt: null,
          blockedBy: null,
        },
      },
      { new: true },
    ).lean();
  }

  async setWallet(userId, walletId) {
    return User.findByIdAndUpdate(
      userId,
      { $set: { wallet: walletId } },
      { new: true },
    ).lean();
  }
}

export const userRepository = new UserRepository();
