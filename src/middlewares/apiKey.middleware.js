import { ApiKey, User } from '../models/index.js';
import { sha256Hash } from '../utils/crypto.util.js';
import { AuthenticationError, AuthorizationError } from '../helpers/error.helper.js';
import { asyncHandler } from '../utils/async.util.js';
import logger from '../config/logger.js';

export const authenticateApiKey = asyncHandler(async (req, res, next) => {
  const rawKey = req.headers['x-api-key'];
  if (!rawKey) throw new AuthenticationError('API key is required');

  const keyHash = sha256Hash(rawKey);
  const apiKey = await ApiKey.findOne({ keyHash, isActive: true }).lean();

  if (!apiKey) throw new AuthenticationError('Invalid or revoked API key');

  if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
    throw new AuthenticationError('API key has expired');
  }

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

  const user = await User.findById(apiKey.user).lean();
  if (!user || !user.isActive || user.isBlocked) {
    throw new AuthenticationError('API key owner account is inactive or blocked');
  }

  req.user = {
    id: user._id.toString(),
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    permissions: apiKey.permissions.length > 0 ? apiKey.permissions : (user.permissions || []),
    wallet: user.wallet,
    commissionRate: user.commissionRate || 0,
    operatorCommissions: user.operatorCommissions || [],
    apiKeyId: apiKey._id,
    apiKeyName: apiKey.name,
  };

  req.authMethod = 'api_key';

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
