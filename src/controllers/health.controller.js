import mongoose from 'mongoose';
import { sendSuccess } from '../utils/response.util.js';
import { asyncHandler } from '../utils/async.util.js';
import { getConnectionStatus } from '../config/database.js';
import env from '../config/env.js';

export const healthController = {
  ping: asyncHandler(async (req, res) => {
    sendSuccess(res, { message: 'pong', data: { timestamp: new Date().toISOString() } });
  }),

  health: asyncHandler(async (req, res) => {
    const db = getConnectionStatus();
    const isHealthy = db.isConnected && db.readyState === 1;

    res.status(isHealthy ? 200 : 503).json({
      success: isHealthy,
      message: isHealthy ? 'Service is healthy' : 'Service is degraded',
      data: {
        status: isHealthy ? 'UP' : 'DOWN',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: env.app.env,
        database: {
          status: db.isConnected ? 'CONNECTED' : 'DISCONNECTED',
          readyState: db.readyState,
          host: env.app.isProd ? '[redacted]' : db.host,
          name: env.app.isProd ? '[redacted]' : db.name,
        },
        memory: {
          heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
          heapTotal: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`,
          rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`,
        },
      },
    });
  }),

  version: asyncHandler(async (req, res) => {
    sendSuccess(res, {
      message: 'Version info',
      data: {
        name: env.app.name,
        version: env.app.version,
        nodeVersion: process.version,
        environment: env.app.env,
        timestamp: new Date().toISOString(),
      },
    });
  }),
};
