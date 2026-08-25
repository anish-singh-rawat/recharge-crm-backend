import cron from 'node-cron';
import { rechargeTransactionRepository } from '../repositories/recharge.repository.js';
import { walletRepository } from '../repositories/wallet.repository.js';
import { walletService } from '../services/wallet.service.js';
import { mroboticsProvider } from '../services/providers/mrobotics/index.js';
import { TRANSACTION_STATUS } from '../constants/transaction.js';
import { cronLogger } from '../config/logger.js';
import env from '../config/env.js';

let isRunning = false;

const checkPendingBatch = async () => {
  if (isRunning) return;
  isRunning = true;

  try {
    const pending = await rechargeTransactionRepository.findPending();
    if (!pending.length) return;

    cronLogger.info(`Pending check cron: checking ${pending.length} transactions`);

    for (const txn of pending) {
      try {
        // Use providerTxnId if available, fallback to txnId; skip if neither exists
        const checkId = txn.providerTxnId || txn.txnId;
        if (!checkId) {
          cronLogger.warn('Skipping txn with no checkable ID', { txnId: txn.txnId });
          continue;
        }

        const statusResult = await mroboticsProvider.checkStatus(
          checkId,
          txn.txnId,
        );

        if (statusResult.status === txn.status) continue;

        await rechargeTransactionRepository.updateStatus(txn.txnId, statusResult.status, {
          providerStatus: statusResult.providerStatus,
          providerMessage: statusResult.message,
          operatorRef: statusResult.operatorRef,
        });

        if (statusResult.status === TRANSACTION_STATUS.FAILED) {
          const wallet = await walletRepository.findByUserId(txn.user.toString());
          if (wallet) {
            await walletService.refundFromRecharge(wallet._id, txn.amount, txn.txnId, txn.user);
          }
        }

        cronLogger.info('Pending txn status updated', {
          txnId: txn.txnId,
          from: txn.status,
          to: statusResult.status,
        });
      } catch (err) {
        cronLogger.warn('Status check failed for txn', { txnId: txn.txnId, error: err.message });
      }
    }
  } catch (err) {
    cronLogger.error('Pending check cron error', { error: err.message });
  } finally {
    isRunning = false;
  }
};

export const startPendingStatusCheckCron = () => {
  cron.schedule(env.cron.pendingCheckSchedule, checkPendingBatch, {
    scheduled: true,
    timezone: 'Asia/Kolkata',
  });
  cronLogger.info('Pending status check cron started', { schedule: env.cron.pendingCheckSchedule });
};
