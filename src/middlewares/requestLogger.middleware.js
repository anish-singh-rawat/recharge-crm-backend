import { generateRequestId } from '../utils/id.util.js';
import { maskSensitiveFields } from '../utils/sanitize.util.js';
import logger from '../config/logger.js';

const SENSITIVE_FIELDS = ['password', 'confirmPassword', 'currentPassword', 'newPassword', 'token', 'refreshToken', 'apiKey', 'secret'];

export const requestIdMiddleware = (req, res, next) => {
  req.requestId = req.headers['x-request-id'] || generateRequestId();
  req.correlationId = req.headers['x-correlation-id'] || req.requestId;
  req.startTime = Date.now();

  res.setHeader('X-Request-Id', req.requestId);
  res.setHeader('X-Correlation-Id', req.correlationId);

  next();
};

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
  });

  next();
};
