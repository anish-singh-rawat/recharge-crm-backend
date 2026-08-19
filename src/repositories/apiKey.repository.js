import { ApiKey } from '../models/index.js';
import { BaseRepository } from './base.repository.js';

class ApiKeyRepository extends BaseRepository {
  constructor() {
    super(ApiKey);
  }

  async findByHash(keyHash) {
    return ApiKey.findOne({ keyHash, isActive: true }).lean();
  }

  async findByUser(userId, filter = {}) {
    return ApiKey.find({ user: userId, ...filter })
      .select('-keyHash -encryptedKey')
      .sort({ createdAt: -1 })
      .lean();
  }

  async revoke(id, revokedBy, reason = '') {
    // return ApiKey.findByIdAndUpdate(
    //   id,
    //   {
    //     $set: {
    //       isActive: false,
    //       revokedAt: new Date(),
    //       revokedBy,
    //       revokedReason: reason,
    //     },
    //   },
    //   { new: true },
    // ).lean();
    return ApiKey.findByIdAndDelete(id).lean();
  }

  async findActiveByUser(userId) {
    return ApiKey.find({
      user: userId,
      isActive: true,
      $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
    })
      .select('-keyHash -encryptedKey')
      .lean();
  }
}

export const apiKeyRepository = new ApiKeyRepository();
