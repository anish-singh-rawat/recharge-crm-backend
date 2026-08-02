import { startRetryRechargeCron } from './retryRecharge.cron.js';
import { startPendingStatusCheckCron } from './pendingStatusCheck.cron.js';
import { startSettlementCron } from './settlement.cron.js';
import { startLogCleanupCron } from './logCleanup.cron.js';
import { cronLogger } from '../config/logger.js';

export const startAllCronJobs = () => {
  startRetryRechargeCron();
  startPendingStatusCheckCron();
  startSettlementCron();
  startLogCleanupCron();
  cronLogger.info('All cron jobs started');
};
