import { Session } from '../models/index.js';
import { BaseRepository } from './base.repository.js';
import { sha256Hash } from '../utils/crypto.util.js';

class SessionRepository extends BaseRepository {
  constructor() {
    super(Session);
  }

  async findByRefreshTokenHash(hash) {
    return Session.findOne({ refreshTokenHash: hash, isActive: true }).lean();
  }

  async createSession(data) {
    const { refreshToken, ...rest } = data;
    const refreshTokenHash = sha256Hash(refreshToken);
    return Session.create({ refreshToken, refreshTokenHash, ...rest });
  }

  async revokeSession(hash, reason = 'logout') {
    return Session.findOneAndUpdate(
      { refreshTokenHash: hash },
      {
        $set: {
          isActive: false,
          revokedAt: new Date(),
          revokedReason: reason,
        },
      },
      { new: true },
    ).lean();
  }

  async revokeAllUserSessions(userId, reason = 'all_sessions_revoked') {
    return Session.updateMany(
      { user: userId, isActive: true },
      {
        $set: {
          isActive: false,
          revokedAt: new Date(),
          revokedReason: reason,
        },
      },
    );
  }

  async findActiveSessions(userId) {
    return Session.find({
      user: userId,
      isActive: true,
      expiresAt: { $gt: new Date() },
    })
      .sort({ lastAccessedAt: -1 })
      .lean();
  }

  async updateLastAccessed(hash) {
    return Session.findOneAndUpdate(
      { refreshTokenHash: hash },
      { $set: { lastAccessedAt: new Date() } },
    ).lean();
  }

  async getLoginHistory(userId, limit = 20) {
    return Session.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('-refreshToken -refreshTokenHash')
      .lean();
  }
}

export const sessionRepository = new SessionRepository();
