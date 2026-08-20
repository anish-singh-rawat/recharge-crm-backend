import cron from 'node-cron';
import { activityLogRepository, webhookLogRepository } from '../repositories/log.repository.js';
import { cronLogger } from '../config/logger.js';
import env from '../config/env.js';

const runLogCleanup = async () => {
  try {
    const activityCutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const webhookCutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    const [activity, apiLogs, webhooks] = await Promise.allSettled([
      activityLogRepository.deleteMany({ createdAt: { $lt: activityCutoff } }),
      webhookLogRepository.deleteMany({ createdAt: { $lt: webhookCutoff }, isProcessed: true }),
    ]);

    cronLogger.info('Log cleanup completed', {
      activityDeleted: activity.value?.deletedCount ?? 0,
      sDeleted: apiLogs.value?.deletedCount ?? 0,
      webhooksDeleted: webhooks.value?.deletedCount ?? 0,
    });
  } catch (err) {
    cronLogger.error('Log cleanup cron error', { error: err.message });
  }
};

export const startLogCleanupCron = () => {
  cron.schedule(env.cron.logCleanupSchedule, runLogCleanup, {
    scheduled: true,
    timezone: 'Asia/Kolkata',
  });
  cronLogger.info('Log cleanup cron started', { schedule: env.cron.logCleanupSchedule });
};
