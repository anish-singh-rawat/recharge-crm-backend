import cron from 'node-cron';
import { rechargeTransactionRepository } from '../repositories/recharge.repository.js';
import { walletRepository } from '../repositories/wallet.repository.js';
import { walletService } from '../services/wallet.service.js';
import { mroboticsProvider } from '../services/providers/mrobotics/index.js';
import { realroboProvider } from '../services/providers/realrobo/index.js';
import { notificationRepository } from '../repositories/notification.repository.js';
import { TRANSACTION_STATUS } from '../constants/transaction.js';
import { NOTIFICATION_EVENT, NOTIFICATION_TYPE } from '../constants/notification.js';
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
        // Route to correct provider based on which one processed this txn
        const isRealRobo = txn.usedProvider === 'realrobo';
        const provider = isRealRobo ? realroboProvider : mroboticsProvider;

        // RealRobo uses our internal txnId (req_id); MRobotics uses providerTxnId or txnId
        const checkId = isRealRobo
          ? txn.txnId
          : (txn.providerTxnId || txn.txnId);

        if (!checkId) {
          cronLogger.warn('Skipping txn with no checkable ID', { txnId: txn.txnId });
          continue;
        }

        const statusResult = isRealRobo
          ? await provider.checkStatus(checkId)
          : await provider.checkStatus(checkId, txn.txnId);

        if (statusResult.status === txn.status) continue;

        await rechargeTransactionRepository.updateStatus(txn.txnId, statusResult.status, {
          providerStatus: statusResult.providerStatus,
          providerMessage: statusResult.message,
          ...(statusResult.operatorRef && { operatorRef: statusResult.operatorRef }),
          ...(statusResult.providerTxnId && { providerTxnId: statusResult.providerTxnId }),
        });

        if (statusResult.status === TRANSACTION_STATUS.FAILED && !(txn.refundAmount > 0)) {
          const wallet = await walletRepository.findByUserId(txn.user.toString());
          if (wallet) {
            await walletService.refundFromRecharge(wallet._id, txn.amount, txn.txnId, txn.user);
            await rechargeTransactionRepository.updateOne(
              { txnId: txn.txnId },
              { $set: { refundAmount: txn.amount } },
            );
          }
        }

        // Notify user on resolution
        const isSuccess = statusResult.status === TRANSACTION_STATUS.SUCCESS;
        notificationRepository.create({
          user: txn.user,
          title: isSuccess ? 'Recharge Successful' : 'Recharge Failed',
          message: isSuccess
            ? `Recharge of ₹${txn.amount} for ${txn.mobileNumber} confirmed. Ref: ${statusResult.operatorRef || txn.txnId}`
            : `Recharge of ₹${txn.amount} for ${txn.mobileNumber} failed. Amount refunded.`,
          type: isSuccess ? NOTIFICATION_TYPE.SUCCESS : NOTIFICATION_TYPE.ERROR,
          event: isSuccess ? NOTIFICATION_EVENT.RECHARGE_SUCCESS : NOTIFICATION_EVENT.RECHARGE_FAILED,
          referenceId: txn.txnId,
        }).catch(() => {});

        cronLogger.info('Pending txn status updated', {
          txnId: txn.txnId,
          provider: txn.usedProvider,
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
