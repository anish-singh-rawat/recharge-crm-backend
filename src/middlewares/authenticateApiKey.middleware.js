import { ApiKey } from '../models/index.js';
import { User } from '../models/index.js';
import { sha256Hash } from '../utils/crypto.util.js';
import { AuthenticationError, AuthorizationError } from '../helpers/error.helper.js';
import { asyncHandler } from '../utils/async.util.js';

export const authenticateApiKey = asyncHandler(async (req, res, next) => {
  let raw =
    req.headers['x-api-key'] ||
    req.headers['apikey'] ||
    req.headers['api-key'] ||
    req.query?.['x-api-key'] ||
    req.query?.['X-Api-Key'] ||
    req.query?.apiKey ||
    req.query?.api_key ||
    req.query?.key ||
    req.query?.token ||
    req.body?.['x-api-key'] ||
    req.body?.['X-Api-Key'] ||
    req.body?.apiKey ||
    req.body?.api_key;

  // Fallback 1: Inspect req.query keys/values if Express parsed them weirdly
  if (!raw && req.query) {
    for (const [k, v] of Object.entries(req.query)) {
      const combined = `${k}=${typeof v === 'string' ? v : JSON.stringify(v)}`;
      const m = combined.match(/(?:x-api-key|apiKey|api_key|key|token)["']?\s*[:=]\s*["']?([a-zA-Z0-9_\-]+)["']?/i) ||
                combined.match(/(crm_[a-fA-F0-9]+)/i);
      if (m && m[1]) {
        raw = m[1];
        break;
      }
    }
  }

  // Fallback 2: Inspect raw URL and originalUrl
  if (!raw) {
    const fullUrl = `${req.originalUrl || ''} ${req.url || ''}`;
    const m = fullUrl.match(/(?:x-api-key|apiKey|api_key|key|token)["']?\s*[:=]\s*["']?([a-zA-Z0-9_\-]+)["']?/i) ||
              fullUrl.match(/(crm_[a-fA-F0-9]+)/i);
    if (m && m[1]) {
      raw = m[1];
    }
  }

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
    apiAccessEnabled: user.apiAccessEnabled || false,
  };

  req.apiKey = { id: apiKey._id, name: apiKey.name, keyPrefix: apiKey.keyPrefix };
  req.requestId = `EXT-${Date.now()}`;

  next();
});
