import { ApiKey } from '../models/index.js';
import { User } from '../models/index.js';
import { sha256Hash } from '../utils/crypto.util.js';
import { AuthenticationError, AuthorizationError } from '../helpers/error.helper.js';
import { asyncHandler } from '../utils/async.util.js';

export const authenticateApiKey = asyncHandler(async (req, res, next) => {
  const raw = req.headers['x-api-key'];
  if (!raw) throw new AuthenticationError('API key is required. Pass it in the X-Api-Key header.');

  const keyHash = sha256Hash(raw);

  const apiKey = await ApiKey.findOne({ keyHash, isActive: true })
    .select('+keyHash')
    .lean();

  if (!apiKey) throw new AuthenticationError('Invalid or revoked API key.');

  if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
    throw new AuthenticationError('API key has expired.');
  }

  if (apiKey.allowedIps?.length) {
    const clientIp = req.ip || req.connection?.remoteAddress || '';
    const normalized = clientIp.replace('::ffff:', '');
    if (!apiKey.allowedIps.includes(normalized)) {
      throw new AuthorizationError('Request IP is not allowed for this API key.');
    }
  }

  const user = await User.findById(apiKey.user).lean();
  if (!user) throw new AuthenticationError('API key owner not found.');
  if (!user.isActive) throw new AuthenticationError('Account is deactivated.');
  if (user.isBlocked) throw new AuthenticationError('Account is blocked. Contact support.');

  await ApiKey.findByIdAndUpdate(apiKey._id, {
    $set: { lastUsedAt: new Date(), lastUsedIp: req.ip || '' },
    $inc: { usageCount: 1 },
  });

  req.user = {
    id: user._id.toString(),
    _id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    permissions: apiKey.permissions?.length ? apiKey.permissions : (user.permissions || []),
    wallet: user.wallet,
    commissionRate: user.commissionRate || 0,
  };

  req.apiKey = { id: apiKey._id, name: apiKey.name, keyPrefix: apiKey.keyPrefix };
  req.requestId = `EXT-${Date.now()}`;

  next();
});
