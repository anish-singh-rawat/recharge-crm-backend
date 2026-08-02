import mongoose from 'mongoose';
import { rechargeTransactionRepository } from '../repositories/recharge.repository.js';
import { walletRepository } from '../repositories/wallet.repository.js';
import { operatorRepository, circleRepository } from '../repositories/operator.repository.js';
import { notificationRepository } from '../repositories/notification.repository.js';
import { auditLogRepository } from '../repositories/log.repository.js';
import { walletService } from './wallet.service.js';
import { mroboticsProvider } from './providers/mrobotics/index.js';
import { generateTxnId, generateCorrelationId } from '../utils/id.util.js';
import { buildListQuery } from '../helpers/query.helper.js';
import { assertWalletCanDebit } from '../helpers/wallet.helper.js';
import { assertRetryable, assertRefundable, calcNextRetryAt } from '../helpers/recharge.helper.js';
import { NotFoundError, RechargeError, WalletError } from '../helpers/error.helper.js';
import { TRANSACTION_STATUS } from '../constants/transaction.js';
import { AUDIT_ACTION, AUDIT_SEVERITY } from '../constants/audit.js';
import { NOTIFICATION_EVENT, NOTIFICATION_TYPE } from '../constants/notification.js';
import { rechargeLogger } from '../config/logger.js';
import env from '../config/env.js';

export const rechargeService = {
  /**
   * Full recharge flow as specified in requirements.
   */
  async initiateRecharge({ mobileNumber, amount, operatorId, circleId, type }, user, requestMeta = {}) {
    // 1. Validate operator
    const operator = await operatorRepository.findById(operatorId);
    if (!operator || !operator.isActive) throw new RechargeError('Invalid or inactive operator');

    // 2. Validate circle (optional for DTH etc.)
    let circle = null;
    if (circleId) {
      circle = await circleRepository.findById(circleId);
      if (!circle || !circle.isActive) throw new RechargeError('Invalid or inactive circle');
    }

    // 3. Validate amount
    if (amount < operator.minAmount) throw new RechargeError(`Minimum recharge amount for this operator is ₹${operator.minAmount}`);
    if (amount > operator.maxAmount) throw new RechargeError(`Maximum recharge amount for this operator is ₹${operator.maxAmount}`);
    if (amount < env.wallet.minRechargeAmount) throw new RechargeError(`Minimum recharge amount is ₹${env.wallet.minRechargeAmount}`);
    if (amount > env.wallet.maxRechargeAmount) throw new RechargeError(`Maximum recharge amount is ₹${env.wallet.maxRechargeAmount}`);

    // 4. Wallet check
    const wallet = await walletRepository.findByUserId(user.id);
    if (!wallet) throw new WalletError('Wallet not found');
    assertWalletCanDebit(wallet, amount);

    // 5. Create transaction in INITIATED state
    const txnId = generateTxnId();
    const correlationId = generateCorrelationId();
    const commissionRate = user.commissionRate || env.wallet.commissionRate;
    const commission = parseFloat((amount * commissionRate).toFixed(2));

    const txn = await rechargeTransactionRepository.create({
      txnId,
      correlationId,
      user: user._id,
      wallet: wallet._id,
      operator: operator._id,
      circle: circle?._id || null,
      mobileNumber,
      amount,
      type,
      status: TRANSACTION_STATUS.INITIATED,
      commissionRate,
      commission,
      netAmount: amount - commission,
      maxRetries: env.retry.maxAttempts,
      ipAddress: requestMeta.ipAddress || '',
      userAgent: requestMeta.userAgent || '',
      requestId: requestMeta.requestId || null,
    });

    rechargeLogger.info('Recharge initiated', { txnId, userId: user.id, amount, mobileNumber });

    // 6. Debit wallet (atomic)
    let walletTxn;
    try {
      const result = await walletService.debitForRecharge(wallet._id, amount, txnId, user._id);
      walletTxn = result.walletTxn;
    } catch (err) {
      await rechargeTransactionRepository.updateStatus(txnId, TRANSACTION_STATUS.FAILED, {
        statusMessage: `Wallet debit failed: ${err.message}`,
      });
      throw err;
    }

    // Link wallet txn
    await rechargeTransactionRepository.updateOne(
      { txnId },
      { $set: { walletTxn: walletTxn._id, status: TRANSACTION_STATUS.PROCESSING } },
    );

    // 7. Call provider
    let providerResult;
    try {
      providerResult = await mroboticsProvider.recharge({
        mobileNumber,
        amount,
        operatorCode: operator.providerCode || operator.code,
        circleCode: circle?.providerCode || circle?.code || '',
        txnId,
        correlationId,
        type,
      });
    } catch (providerErr) {
      rechargeLogger.error('Provider call failed', { txnId, error: providerErr.message });

      // Determine if retryable
      const isRetryable = providerErr.isRetryable !== false;
      const nextRetryAt = isRetryable ? calcNextRetryAt(0) : null;

      await rechargeTransactionRepository.updateOne(
        { txnId },
        {
          $set: {
            status: TRANSACTION_STATUS.FAILED,
            statusMessage: providerErr.message,
            isRetryable,
            nextRetryAt,
          },
        },
      );

      // Refund wallet for provider failure
      await walletService.refundFromRecharge(wallet._id, amount, txnId, user._id);

      // Re-link wallet txn to show refund
      notificationRepository.create({
        user: user._id,
        title: 'Recharge Failed',
        message: `Your recharge of ₹${amount} for ${mobileNumber} failed. Amount refunded to wallet.`,
        type: NOTIFICATION_TYPE.ERROR,
        event: NOTIFICATION_EVENT.RECHARGE_FAILED,
        referenceId: txnId,
      }).catch(() => {});

      throw new RechargeError(providerErr.message || 'Recharge failed. Amount has been refunded.');
    }

    // 8. Update transaction with provider response
    const finalStatus = providerResult.status;
    const updatedTxn = await rechargeTransactionRepository.updateStatus(txnId, finalStatus, {
      providerTxnId: providerResult.providerTxnId,
      providerStatus: providerResult.providerStatus,
      providerMessage: providerResult.message,
      providerResponseCode: providerResult.responseCode,
      operatorRef: providerResult.operatorRef,
      providerRequest: providerResult.rawRequest,
      providerResponse: providerResult.rawResponse,
    });

    // 9. If failed after provider response, refund
    if (finalStatus === TRANSACTION_STATUS.FAILED) {
      await walletService.refundFromRecharge(wallet._id, amount, txnId, user._id);
    }

    // 10. Audit log + notification
    const isSuccess = finalStatus === TRANSACTION_STATUS.SUCCESS;
    auditLogRepository.create({
      performedBy: user._id,
      action: isSuccess ? AUDIT_ACTION.RECHARGE_SUCCESS : AUDIT_ACTION.RECHARGE_FAILED,
      severity: AUDIT_SEVERITY.LOW,
      module: 'recharge',
      description: `Recharge ${txnId}: ₹${amount} for ${mobileNumber} — ${finalStatus}`,
      referenceId: txnId,
    }).catch(() => {});

    notificationRepository.create({
      user: user._id,
      title: isSuccess ? 'Recharge Successful' : 'Recharge Failed',
      message: isSuccess
        ? `Your recharge of ₹${amount} for ${mobileNumber} was successful. Ref: ${providerResult.operatorRef || txnId}`
        : `Your recharge of ₹${amount} for ${mobileNumber} failed. Amount refunded to wallet.`,
      type: isSuccess ? NOTIFICATION_TYPE.SUCCESS : NOTIFICATION_TYPE.ERROR,
      event: isSuccess ? NOTIFICATION_EVENT.RECHARGE_SUCCESS : NOTIFICATION_EVENT.RECHARGE_FAILED,
      referenceId: txnId,
    }).catch(() => {});

    rechargeLogger.info('Recharge completed', { txnId, status: finalStatus });
    return updatedTxn;
  },

  /**
   * Get transaction status (check provider if still pending).
   */
  async getStatus(txnId, userId = null) {
    const filter = { txnId };
    if (userId) filter.user = userId;

    const txn = await rechargeTransactionRepository.findByTxnIdFull(txnId);
    if (!txn) throw new NotFoundError('Transaction not found');
    if (userId && txn.user.toString() !== userId.toString()) {
      throw new NotFoundError('Transaction not found');
    }

    // If still pending, poll provider
    if ([TRANSACTION_STATUS.PENDING, TRANSACTION_STATUS.PROCESSING].includes(txn.status)) {
      try {
        const statusResult = await mroboticsProvider.checkStatus(txn.providerTxnId || txnId);
        if (statusResult.status !== txn.status) {
          await rechargeTransactionRepository.updateStatus(txnId, statusResult.status, {
            providerStatus: statusResult.providerStatus,
            providerMessage: statusResult.message,
          });
          txn.status = statusResult.status;
        }
      } catch (err) {
        rechargeLogger.warn('Status check from provider failed', { txnId, error: err.message });
      }
    }

    return txn;
  },

  /**
   * List transactions for a user.
   */
  async listByUser(userId, query) {
    const { filter, pagination, sort } = buildListQuery(query, {
      exactFields: ['status', 'type'],
      searchFields: ['mobileNumber', 'txnId', 'providerTxnId'],
      dateField: 'createdAt',
    });
    filter.user = userId;
    return rechargeTransactionRepository.findByUser(userId, filter, { ...pagination, sort });
  },

  /**
   * List all transactions (admin).
   */
  async listAll(query) {
    const { filter, pagination, sort } = buildListQuery(query, {
      exactFields: ['status', 'type', 'user', 'operator'],
      searchFields: ['mobileNumber', 'txnId', 'providerTxnId'],
      dateField: 'createdAt',
    });
    return rechargeTransactionRepository.findPaginatedWithDetails(filter, { ...pagination, sort });
  },

  /**
   * Retry a failed transaction.
   */
  async retry(txnId, performedBy) {
    const txn = await rechargeTransactionRepository.findByTxnId(txnId);
    if (!txn) throw new NotFoundError('Transaction not found');

    assertRetryable(txn);

    const operator = await operatorRepository.findById(txn.operator);
    const nextRetryAt = calcNextRetryAt(txn.retryCount);
    await rechargeTransactionRepository.markRetry(txnId, nextRetryAt);
    await rechargeTransactionRepository.updateStatus(txnId, TRANSACTION_STATUS.PROCESSING);

    // Debit wallet again (it was refunded on failure)
    const wallet = await walletRepository.findByUserId(txn.user.toString());
    assertWalletCanDebit(wallet, txn.amount);
    await walletService.debitForRecharge(wallet._id, txn.amount, txnId, txn.user);

    try {
      const providerResult = await mroboticsProvider.recharge({
        mobileNumber: txn.mobileNumber,
        amount: txn.amount,
        operatorCode: operator.providerCode || operator.code,
        txnId,
        correlationId: txn.correlationId,
        type: txn.type,
      });

      const updatedTxn = await rechargeTransactionRepository.updateStatus(txnId, providerResult.status, {
        providerTxnId: providerResult.providerTxnId,
        providerStatus: providerResult.providerStatus,
        providerMessage: providerResult.message,
        isRetryable: false,
      });

      if (providerResult.status === TRANSACTION_STATUS.FAILED) {
        await walletService.refundFromRecharge(wallet._id, txn.amount, txnId, txn.user);
      }

      auditLogRepository.create({
        performedBy,
        targetUser: txn.user,
        action: AUDIT_ACTION.RECHARGE_RETRY,
        severity: AUDIT_SEVERITY.MEDIUM,
        module: 'recharge',
        description: `Recharge retry #${txn.retryCount + 1} for txnId ${txnId}`,
        referenceId: txnId,
      }).catch(() => {});

      return updatedTxn;
    } catch (err) {
      const shouldDeadLetter = txn.retryCount + 1 >= txn.maxRetries;
      if (shouldDeadLetter) {
        await rechargeTransactionRepository.moveToDeadLetter(txnId);
      } else {
        await rechargeTransactionRepository.updateStatus(txnId, TRANSACTION_STATUS.FAILED, {
          statusMessage: err.message,
          isRetryable: true,
          nextRetryAt: calcNextRetryAt(txn.retryCount + 1),
        });
      }
      await walletService.refundFromRecharge(wallet._id, txn.amount, txnId, txn.user);
      throw new RechargeError(err.message || 'Retry failed');
    }
  },

  /**
   * Refund a transaction.
   */
  async refund(txnId, reason, performedBy) {
    const txn = await rechargeTransactionRepository.findByTxnId(txnId);
    if (!txn) throw new NotFoundError('Transaction not found');

    assertRefundable(txn);

    const wallet = await walletRepository.findByUserId(txn.user.toString());
    await walletService.refundFromRecharge(wallet._id, txn.amount, txnId, txn.user);

    const updated = await rechargeTransactionRepository.updateStatus(txnId, TRANSACTION_STATUS.REFUNDED, {
      refundAmount: txn.amount,
    });

    auditLogRepository.create({
      performedBy,
      targetUser: txn.user,
      action: AUDIT_ACTION.RECHARGE_REFUNDED,
      severity: AUDIT_SEVERITY.HIGH,
      module: 'recharge',
      description: `Manual refund for txnId ${txnId}: ${reason}`,
      referenceId: txnId,
    }).catch(() => {});

    notificationRepository.create({
      user: txn.user,
      title: 'Recharge Refunded',
      message: `₹${txn.amount} has been refunded for transaction ${txnId}`,
      type: NOTIFICATION_TYPE.INFO,
      event: NOTIFICATION_EVENT.RECHARGE_REFUNDED,
      referenceId: txnId,
    }).catch(() => {});

    return updated;
  },
};
