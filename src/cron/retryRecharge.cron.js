import cron from 'node-cron';
import { rechargeTransactionRepository } from '../repositories/recharge.repository.js';
import { walletRepository } from '../repositories/wallet.repository.js';
import { walletService } from '../services/wallet.service.js';
import { mroboticsProvider } from '../services/providers/mrobotics/index.js';
import { operatorRepository } from '../repositories/operator.repository.js';
import { calcNextRetryAt } from '../helpers/recharge.helper.js';
import { assertWalletCanDebit } from '../helpers/wallet.helper.js';
import { TRANSACTION_STATUS } from '../constants/transaction.js';
import { cronLogger } from '../config/logger.js';
import env from '../config/env.js';

let isRunning = false;

const processRetryBatch = async () => {
  if (isRunning) return;
  isRunning = true;

  try {
    const retryable = await rechargeTransactionRepository.findRetryable();
    if (!retryable.length) return;

    cronLogger.info(`Retry cron: processing ${retryable.length} transactions`);

    for (const txn of retryable) {
      try {
        const wallet = await walletRepository.findByUserId(txn.user.toString());
        if (!wallet) {
          await rechargeTransactionRepository.moveToDeadLetter(txn.txnId);
          continue;
        }

        try {
          assertWalletCanDebit(wallet, txn.amount);
        } catch {
          await rechargeTransactionRepository.updateOne(
            { txnId: txn.txnId },
            { $set: { isRetryable: false, statusMessage: 'Insufficient balance for retry' } },
          );
          continue;
        }

        await walletService.debitForRecharge(wallet._id, txn.amount, txn.txnId, txn.user);

        const operator = await operatorRepository.findById(txn.operator);
        const providerResult = await mroboticsProvider.recharge({
          mobileNumber: txn.mobileNumber,
          amount: txn.amount,
          operatorCode: operator?.providerCode || operator?.code || '',
          txnId: txn.txnId,
          correlationId: txn.correlationId,
          type: txn.type,
        });

        const isLastAttempt = txn.retryCount + 1 >= txn.maxRetries;

        await rechargeTransactionRepository.updateOne(
          { txnId: txn.txnId },
          {
            $set: {
              status: providerResult.status,
              providerTxnId: providerResult.providerTxnId,
              providerStatus: providerResult.providerStatus,
              providerMessage: providerResult.message,
              isRetryable: false,
              lastRetryAt: new Date(),
            },
            $inc: { retryCount: 1 },
          },
        );

        if (providerResult.status === TRANSACTION_STATUS.FAILED) {
          await walletService.refundFromRecharge(wallet._id, txn.amount, txn.txnId, txn.user);
          if (isLastAttempt) {
            await rechargeTransactionRepository.moveToDeadLetter(txn.txnId);
          }
        }

        cronLogger.info('Retry processed', { txnId: txn.txnId, status: providerResult.status });
      } catch (err) {
        cronLogger.error('Retry failed for txn', { txnId: txn.txnId, error: err.message });

        const nextRetry = calcNextRetryAt(txn.retryCount + 1);
        const isLastAttempt = txn.retryCount + 1 >= txn.maxRetries;

        if (isLastAttempt) {
          await rechargeTransactionRepository.moveToDeadLetter(txn.txnId);
        } else {
          await rechargeTransactionRepository.updateOne(
            { txnId: txn.txnId },
            {
              $set: {
                nextRetryAt: nextRetry,
                isRetryable: true,
                statusMessage: err.message,
              },
              $inc: { retryCount: 1 },
            },
          );
        }

        try {
          const wallet = await walletRepository.findByUserId(txn.user.toString());
          if (wallet) {
            await walletService.refundFromRecharge(wallet._id, txn.amount, txn.txnId, txn.user);
          }
        } catch (refundErr) {
          cronLogger.error('Refund failed during retry error handling', {
            txnId: txn.txnId,
            error: refundErr.message,
          });
        }
      }
    }
  } catch (err) {
    cronLogger.error('Retry cron job error', { error: err.message });
  } finally {
    isRunning = false;
  }
};

export const startRetryRechargeCron = () => {
  cron.schedule(env.cron.retrySchedule, processRetryBatch, {
    scheduled: true,
    timezone: 'Asia/Kolkata',
  });
  cronLogger.info('Retry recharge cron started', { schedule: env.cron.retrySchedule });
};
