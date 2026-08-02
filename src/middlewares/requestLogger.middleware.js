import { generateRequestId } from '../utils/id.util.js';
import { maskSensitiveFields } from '../utils/sanitize.util.js';
import logger from '../config/logger.js';
import { ApiLog } from '../models/index.js';

const SENSITIVE_FIELDS = ['password', 'confirmPassword', 'currentPassword', 'newPassword', 'token', 'refreshToken', 'apiKey', 'secret'];

/**
 * Attach a unique requestId and correlationId to every request.
 */
export const requestIdMiddleware = (req, res, next) => {
  req.requestId = req.headers['x-request-id'] || generateRequestId();
  req.correlationId = req.headers['x-correlation-id'] || req.requestId;
  req.startTime = Date.now();

  res.setHeader('X-Request-Id', req.requestId);
  res.setHeader('X-Correlation-Id', req.correlationId);

  next();
};

/**
 * Log incoming requests and outgoing responses.
 * Saves API logs to MongoDB for audit trail.
 */
export const requestResponseLogger = (req, res, next) => {
  const originalJson = res.json.bind(res);

  res.json = (body) => {
    res._responseBody = body;
    return originalJson(body);
  };

  res.on('finish', async () => {
    const responseTime = Date.now() - (req.startTime || Date.now());
    const isError = res.statusCode >= 400;

    const logData = {
      requestId: req.requestId,
      correlationId: req.correlationId,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      responseTime,
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || '',
      userId: req.user?.id || null,
      isError,
    };

    logger.info('API Request', {
      ...logData,
      body: maskSensitiveFields(req.body || {}, SENSITIVE_FIELDS),
    });

    // Persist to DB only for errors or important paths
    if (isError || req.path.includes('/recharge') || req.path.includes('/wallet')) {
      ApiLog.create({
        requestId: req.requestId,
        correlationId: req.correlationId,
        user: req.user?._id || null,
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        requestBody: maskSensitiveFields(req.body || {}, SENSITIVE_FIELDS),
        responseBody: res._responseBody,
        requestHeaders: {
          'user-agent': req.headers['user-agent'],
          'content-type': req.headers['content-type'],
        },
        responseTime,
        ipAddress: req.ip || '',
        userAgent: req.headers['user-agent'] || '',
        isError,
        errorMessage: isError ? (res._responseBody?.message || '') : '',
      }).catch((err) =>
        logger.error('Failed to save API log', { error: err.message }),
      );
    }
  });

  next();
};
