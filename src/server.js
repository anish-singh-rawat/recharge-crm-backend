import { createServer } from 'http';
import app from './app.js';
import { connectDB } from './config/database.js';
import { initSocket } from './socket/socket.js';
import { startAllCronJobs } from './cron/index.js';
import './events/index.js';
import logger from './config/logger.js';
import env from './config/env.js';

const httpServer = createServer(app);

initSocket(httpServer);

const start = async () => {
  await connectDB();

  startAllCronJobs();

  httpServer.listen(env.app.port, () => {
    logger.info(`Server running on http://localhost:${env.app.port}`, {
      env: env.app.env,
      version: env.app.version,
    });

    if (env.swagger.enabled) {
      logger.info(`Swagger docs: http://localhost:${env.app.port}/api-docs`);
    }
  });
};

const shutdown = async (signal) => {
  logger.info(`${signal} received — shutting down gracefully`);
  httpServer.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });

  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', { reason: String(reason) });
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', { error: err.message, stack: err.stack });
  process.exit(1);
});

start().catch((err) => {
  logger.error('Server failed to start', { error: err.message });
  process.exit(1);
});
