import cron from 'node-cron';
import { activityLogRepository, auditLogRepository, webhookLogRepository } from '../repositories/log.repository.js';
import { notificationRepository } from '../repositories/notification.repository.js';
import { cronLogger } from '../config/logger.js';
import env from '../config/env.js';
import { Session, WalletTransaction } from '../models/index.js';

const RETENTION_DAYS = 45;

const runCleanup = async () => {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);

  cronLogger.info('Starting 45-day data cleanup', { cutoff });

  const [
    activityResult,
    auditResult,
    webhookResult,
    notifResult,
    sessionResult,
    walletTxnResult,
  ] = await Promise.allSettled([
    activityLogRepository.deleteMany({ createdAt: { $lt: cutoff } }),
    auditLogRepository.deleteMany({ createdAt: { $lt: cutoff } }),
    webhookLogRepository.deleteMany({ createdAt: { $lt: cutoff } }),
    notificationRepository.deleteMany({ createdAt: { $lt: cutoff } }),
    Session.deleteMany({ createdAt: { $lt: cutoff } }),
    WalletTransaction.deleteMany({ createdAt: { $lt: cutoff } }),
  ]);

  const count = (r) => (r.status === 'fulfilled' ? (r.value?.deletedCount ?? 0) : 0);
  const err   = (r) => (r.status === 'rejected'  ? r.reason?.message : null);

  cronLogger.info('45-day cleanup completed', {
    activityLogs:        count(activityResult),
    auditLogs:           count(auditResult),
    webhookLogs:         count(webhookResult),
    notifications:       count(notifResult),
    sessions:            count(sessionResult),
    walletTransactions:  count(walletTxnResult),
    errors: [
      err(activityResult),
      err(auditResult),
      err(webhookResult),
      err(notifResult),
      err(sessionResult),
      err(walletTxnResult),
    ].filter(Boolean),
  });
};

export const startLogCleanupCron = () => {
  cron.schedule(env.cron.logCleanupSchedule, runCleanup, {
    scheduled: true,
    timezone: 'Asia/Kolkata',
  });
  cronLogger.info('Cleanup cron started (45-day retention)', { schedule: env.cron.logCleanupSchedule });
};
