import cron from 'node-cron';
import { rechargeTransactionRepository } from '../repositories/recharge.repository.js';
import { cronLogger } from '../config/logger.js';
import env from '../config/env.js';

let isRunning = false;

const runSettlement = async () => {
  if (isRunning) return;
  isRunning = true;

  try {
    const unsettled = await rechargeTransactionRepository.findUnsettled();
    if (!unsettled.length) return;

    cronLogger.info(`Settlement cron: settling ${unsettled.length} transactions`);

    for (const txn of unsettled) {
      try {
        await rechargeTransactionRepository.markSettled(txn.txnId);

        cronLogger.info('Transaction settled', {
          txnId: txn.txnId,
          commission: txn.commission,
        });
      } catch (err) {
        cronLogger.error('Settlement failed for txn', { txnId: txn.txnId, error: err.message });
      }
    }
  } catch (err) {
    cronLogger.error('Settlement cron error', { error: err.message });
  } finally {
    isRunning = false;
  }
};

export const startSettlementCron = () => {
  cron.schedule(env.cron.settlementSchedule, runSettlement, {
    scheduled: true,
    timezone: 'Asia/Kolkata',
  });
  cronLogger.info('Settlement cron started', { schedule: env.cron.settlementSchedule });
};
