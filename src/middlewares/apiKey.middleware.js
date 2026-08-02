import { ApiKey, User } from '../models/index.js';
import { sha256Hash } from '../utils/crypto.util.js';
import { AuthenticationError, AuthorizationError } from '../helpers/error.helper.js';
import { asyncHandler } from '../utils/async.util.js';
import logger from '../config/logger.js';

/**
 * API Key authentication middleware.
 * Reads X-API-Key header, verifies it, and attaches user to req.user.
 * Also increments usage count and checks IP allowlist.
 */
export const authenticateApiKey = asyncHandler(async (req, res, next) => {
  const rawKey = req.headers['x-api-key'];
  if (!rawKey) throw new AuthenticationError('API key is required');

  const keyHash = sha256Hash(rawKey);
  const apiKey = await ApiKey.findOne({ keyHash, isActive: true }).lean();

  if (!apiKey) throw new AuthenticationError('Invalid or revoked API key');

  // Expiry check
  if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
    throw new AuthenticationError('API key has expired');
  }

  // IP allowlist check
  if (apiKey.allowedIps && apiKey.allowedIps.length > 0) {
    const clientIp = req.ip || req.connection?.remoteAddress || '';
    const normalizedIp = clientIp.replace('::ffff:', '');
    if (!apiKey.allowedIps.includes(normalizedIp)) {
      logger.warn('API key IP not allowed', {
        keyPrefix: apiKey.keyPrefix,
        clientIp: normalizedIp,
        allowedIps: apiKey.allowedIps,
      });
      throw new AuthorizationError('API key not allowed from this IP address');
    }
  }

  // Load the owning user
  const user = await User.findById(apiKey.user).lean();
  if (!user || !user.isActive || user.isBlocked) {
    throw new AuthenticationError('API key owner account is inactive or blocked');
  }

  // Attach user and key permissions to request
  req.user = {
    id: user._id.toString(),
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    permissions: apiKey.permissions.length > 0 ? apiKey.permissions : (user.permissions || []),
    wallet: user.wallet,
    apiKeyId: apiKey._id,
    apiKeyName: apiKey.name,
  };

  req.authMethod = 'api_key';

  // Async update usage stats — don't await, fire and forget
  ApiKey.updateOne(
    { _id: apiKey._id },
    {
      $inc: { usageCount: 1 },
      $set: { lastUsedAt: new Date(), lastUsedIp: req.ip },
    },
  ).catch((err) =>
    logger.error('Failed to update API key usage', { error: err.message }),
  );

  next();
});
