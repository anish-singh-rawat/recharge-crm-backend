import { ActivityLog } from '../models/index.js';
import logger from '../config/logger.js';

export const logActivity = (action, module, descFn = null) => (req, res, next) => {
  const originalJson = res.json.bind(res);

  res.json = (body) => {
    if (body?.success) {
      const description = descFn ? descFn(req, body) : `${action} performed`;
      ActivityLog.create({
        user: req.user?._id || null,
        action,
        module,
        description,
        ipAddress: req.ip || '',
        userAgent: req.headers['user-agent'] || '',
        referenceId: req.params?.id || body?.data?.id || body?.data?._id || null,
        referenceType: module,
        metadata: {
          requestId: req.requestId,
          method: req.method,
          path: req.originalUrl,
        },
      }).catch((err) =>
        logger.error('Failed to save activity log', { error: err.message }),
      );
    }
    return originalJson(body);
  };

  next();
};
