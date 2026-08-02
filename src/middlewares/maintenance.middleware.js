import { Setting } from '../models/index.js';
import { HTTP_STATUS } from '../constants/http.js';

let maintenanceMode = false;
let lastChecked = 0;
const CACHE_TTL_MS = 30000;

export const maintenanceMiddleware = async (req, res, next) => {
  const SKIP_PATHS = ['/api/v1/ping', '/api/v1/health', '/api/v1/version', '/api/v1/webhooks'];
  if (SKIP_PATHS.some((p) => req.path.startsWith(p.replace('/api/v1', '')))) {
    return next();
  }

  const now = Date.now();
  if (now - lastChecked > CACHE_TTL_MS) {
    try {
      const setting = await Setting.findOne({ key: 'app.maintenanceMode' }).lean();
      maintenanceMode = setting ? Boolean(setting.value) : false;
      lastChecked = now;
    } catch {
      maintenanceMode = false;
    }
  }

  if (maintenanceMode) {
    return res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({
      success: false,
      message: 'Service is temporarily under maintenance. Please try again later.',
      errors: [],
    });
  }

  next();
};
