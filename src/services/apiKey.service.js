import { apiKeyRepository } from '../repositories/apiKey.repository.js';
import {
  generateApiKey,
  getApiKeyPrefix,
  sha256Hash,
  encryptAES,
  decryptAES,
} from '../utils/crypto.util.js';
import { NotFoundError, AuthorizationError } from '../helpers/error.helper.js';

export const apiKeyService = {
  async create(userId, { name, permissions = [], allowedIps = [], expiresAt = null }) {
    const rawKey = generateApiKey();
    const keyPrefix = getApiKeyPrefix(rawKey);
    const keyHash = sha256Hash(rawKey);
    const encryptedKey = encryptAES(rawKey);

    const apiKey = await apiKeyRepository.create({
      user: userId,
      name,
      keyPrefix,
      keyHash,
      encryptedKey,
      permissions,
      allowedIps,
      expiresAt,
    });

    return { ...apiKey, rawKey };
  },

  async list(userId) {
    return apiKeyRepository.findByUser(userId);
  },

  async revoke(keyId, userId, role, reason = '') {
    const key = await apiKeyRepository.findById(keyId);
    if (!key) throw new NotFoundError('API key not found');

    if (role !== 'super_admin' && role !== 'admin' && key.user.toString() !== userId) {
      throw new AuthorizationError('Cannot revoke another user\'s API key');
    }

    return apiKeyRepository.revoke(keyId, userId, reason);
  },

  async getById(keyId, userId, role) {
    const key = await apiKeyRepository.findById(keyId);
    if (!key) throw new NotFoundError('API key not found');

    if (role !== 'super_admin' && role !== 'admin' && key.user.toString() !== userId) {
      throw new AuthorizationError('Access denied');
    }
    return key;
  },
};
