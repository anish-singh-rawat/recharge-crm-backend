import mongoose from 'mongoose';
import { rechargeTransactionRepository } from '../repositories/recharge.repository.js';
import { walletRepository } from '../repositories/wallet.repository.js';
import { operatorRepository, circleRepository } from '../repositories/operator.repository.js';
import { notificationRepository } from '../repositories/notification.repository.js';
import { auditLogRepository } from '../repositories/log.repository.js';
import { walletService } from './wallet.service.js';
import { mroboticsProvider } from './providers/mrobotics/index.js';
import { realroboProvider } from './providers/realrobo/index.js';
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
import { Setting } from '../models/index.js';

const MROBOTICS_OPERATOR_CODE_MAP = {
  JIO: '5', AIRTEL: '2', VI: '1', IDEA: '3', BSNL: '4',
  JIO_POST: '17', AIRTEL_POST: '2',
};

const REALROBO_OPERATOR_CODE_MAP = {
  AIRTEL: '1', BSNL: '2', JIO: '3', VI: '4', IDEA: '4',
};


async function getProviderPriority() {
  try {
    const setting = await Setting.findOne({ key: 'recharge.provider.priority' }).lean();
    if (setting && Array.isArray(setting.value) && setting.value.length > 0) {
      return setting.value;
    }
  } catch {
  }
  return ['mrobotics'];
}

async function getRealroboOperatorCodes() {
  try {
    const setting = await Setting.findOne({ key: 'recharge.realrobo.operatorCodes' }).lean();
    if (setting && setting.value && typeof setting.value === 'object') {
      return setting.value;
    }
  } catch {
  }
  return REALROBO_OPERATOR_CODE_MAP;
}

async function callProviderWithFallback({ mobileNumber, amount, operator, circle, txnId, correlationId, type }) {
  // --- Per-operator routing ---
  // If operator has explicit primaryProvider set, build priority from that.
  // Otherwise fall back to the global setting.
  let priority;

  if (operator.primaryProvider) {
    priority = [operator.primaryProvider];
    if (operator.secondaryProvider && operator.secondaryProvider !== operator.primaryProvider) {
      priority.push(operator.secondaryProvider);
    }
  } else {
    priority = await getProviderPriority();
  }

  const realroboCodesMap = await getRealroboOperatorCodes();

  const mroboticsOperatorCode =
    operator.providerCode ||
    MROBOTICS_OPERATOR_CODE_MAP[operator.code?.toUpperCase()] ||
    operator.code;

  const realroboOperatorCode =
    operator.realroboProviderCode ||
    realroboCodesMap[operator.code?.toUpperCase()] ||
    REALROBO_OPERATOR_CODE_MAP[operator.code?.toUpperCase()] ||
    operator.code;

  const circleCode = circle?.providerCode || circle?.code || '';

  let lastError = null;

  for (const providerName of priority) {
    try {
      rechargeLogger.info('Trying provider', { provider: providerName, txnId });

      let result;

      if (providerName === 'realrobo') {
        if (!env.realrobo.apiToken) {
          rechargeLogger.warn('RealRobo token not configured, skipping', { txnId });
          continue;
        }
        result = await realroboProvider.recharge({
          mobileNumber,
          amount,
          operatorCode: realroboOperatorCode,
          circleCode,
          txnId,
          correlationId,
        });
      } else {
        result = await mroboticsProvider.recharge({
          mobileNumber,
          amount,
          operatorCode: mroboticsOperatorCode,
          circleCode,
          txnId,
          correlationId,
          type,
        });
      }

      rechargeLogger.info('Provider responded', {
        provider: providerName,
        txnId,
        status: result.status,
      });

      if (result.status === 'FAILED') {
        const failMsg = result.message || `${providerName} recharge failed`;
        rechargeLogger.warn(`Provider ${providerName} returned FAILED, trying next`, {
          txnId,
          provider: providerName,
          message: failMsg,
        });
        lastError = new Error(failMsg);
        lastError.isRetryable = false;
        continue;
      }

      return { result, usedProvider: providerName };
    } catch (err) {
      const errMsg = typeof err.message === 'string'
        ? err.message
        : err.errorMessage || 'Provider error';

      rechargeLogger.warn(`Provider ${providerName} failed, trying next`, {
        txnId,
        provider: providerName,
        error: errMsg,
      });

      lastError = err;
    }
  }

  const finalErr = lastError || new Error('All providers failed');
  finalErr.isRetryable = false;
  throw finalErr;
}

export const rechargeService = {
  async initiateRecharge({ mobileNumber, amount, operatorId, circleId, type }, user, requestMeta = {}) {
    const operator = await operatorRepository.findById(operatorId);
    if (!operator || !operator.isActive) throw new RechargeError('Invalid or inactive operator');

    let circle = null;
    if (circleId) {
      circle = await circleRepository.findById(circleId);
      if (!circle || !circle.isActive) throw new RechargeError('Invalid or inactive circle');
    }

    if (amount < operator.minAmount) throw new RechargeError(`Minimum recharge amount for this operator is ₹${operator.minAmount}`);
    if (amount > operator.maxAmount) throw new RechargeError(`Maximum recharge amount for this operator is ₹${operator.maxAmount}`);
    if (amount < env.wallet.minRechargeAmount) throw new RechargeError(`Minimum recharge amount is ₹${env.wallet.minRechargeAmount}`);
    if (amount > env.wallet.maxRechargeAmount) throw new RechargeError(`Maximum recharge amount is ₹${env.wallet.maxRechargeAmount}`);

    const wallet = await walletRepository.findByUserId(user.id);
    if (!wallet) throw new WalletError('Wallet not found');
    assertWalletCanDebit(wallet, amount);

    const txnId = generateTxnId();
    const correlationId = generateCorrelationId();
    const operatorCommissionEntry = user.operatorCommissions?.find(
      (c) => c.operator?.toString() === operator._id.toString(),
    );
    const commissionRate =
      operatorCommissionEntry?.rate ?? user.commissionRate ?? env.wallet.commissionRate;
    const commission = parseFloat((amount * commissionRate).toFixed(2));

    await rechargeTransactionRepository.create({
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

    await rechargeTransactionRepository.updateOne(
      { txnId },
      { $set: { walletTxn: walletTxn._id, status: TRANSACTION_STATUS.PROCESSING } },
    );

    let providerResult;
    let usedProvider;

    try {
      ({ result: providerResult, usedProvider } = await callProviderWithFallback({
        mobileNumber,
        amount,
        operator,
        circle,
        txnId,
        correlationId,
        type,
      }));
    } catch (providerErr) {
      const errMsg = typeof providerErr.message === 'string'
        ? providerErr.message
        : 'Recharge failed';

      rechargeLogger.error('All providers failed', { txnId, error: errMsg });

      const isRetryable = providerErr.isRetryable !== false;
      const nextRetryAt = isRetryable ? calcNextRetryAt(0) : null;

      await rechargeTransactionRepository.updateOne(
        { txnId },
        {
          $set: {
            status: TRANSACTION_STATUS.FAILED,
            statusMessage: errMsg,
            isRetryable,
            nextRetryAt,
          },
        },
      );

      await walletService.refundFromRecharge(wallet._id, amount, txnId, user._id);
      await rechargeTransactionRepository.updateOne(
        { txnId },
        { $set: { refundAmount: amount } },
      );

      notificationRepository.create({
        user: user._id,
        title: 'Recharge Failed',
        message: `Your recharge of ₹${amount} for ${mobileNumber} failed. Amount refunded to wallet.`,
        type: NOTIFICATION_TYPE.ERROR,
        event: NOTIFICATION_EVENT.RECHARGE_FAILED,
        referenceId: txnId,
      }).catch(() => {});

      throw new RechargeError(errMsg || 'Recharge failed. Amount has been refunded.');
    }

    const finalStatus = providerResult.status;
    const updatedTxn = await rechargeTransactionRepository.updateStatus(txnId, finalStatus, {
      providerTxnId: providerResult.providerTxnId,
      mroboticsRcId: providerResult.mroboticsRcId ?? null,
      providerStatus: providerResult.providerStatus,
      providerMessage: providerResult.message,
      providerResponseCode: providerResult.responseCode,
      operatorRef: providerResult.operatorRef,
      providerRequest: providerResult.rawRequest,
      providerResponse: providerResult.rawResponse,
      usedProvider,
    });

    if (finalStatus === TRANSACTION_STATUS.FAILED) {
      await walletService.refundFromRecharge(wallet._id, amount, txnId, user._id);
      await rechargeTransactionRepository.updateOne(
        { txnId },
        { $set: { refundAmount: amount } },
      );
      updatedTxn.refundAmount = amount;
    }

    const isSuccess = finalStatus === TRANSACTION_STATUS.SUCCESS;

    auditLogRepository.create({
      performedBy: user._id,
      action: isSuccess ? AUDIT_ACTION.RECHARGE_SUCCESS : AUDIT_ACTION.RECHARGE_FAILED,
      severity: AUDIT_SEVERITY.LOW,
      module: 'recharge',
      description: `Recharge ${txnId}: ₹${amount} for ${mobileNumber} via ${usedProvider} — ${finalStatus}`,
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

    rechargeLogger.info('Recharge completed', { txnId, status: finalStatus, usedProvider });
    return updatedTxn;
  },

  async getStatus(txnId, userId = null) {
    const txn = await rechargeTransactionRepository.findByTxnIdFull(txnId);
    if (!txn) throw new NotFoundError('Transaction not found');
    if (userId && txn.user.toString() !== userId.toString()) {
      throw new NotFoundError('Transaction not found');
    }

    if ([TRANSACTION_STATUS.PENDING, TRANSACTION_STATUS.PROCESSING].includes(txn.status)) {
      try {
        const provider = txn.usedProvider === 'realrobo' ? realroboProvider : mroboticsProvider;
        const statusResult = await provider.checkStatus(txnId);
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

  async listByUser(userId, query) {
    const { filter, pagination, sort } = buildListQuery(query, {
      exactFields: ['status', 'type'],
      searchFields: ['mobileNumber', 'txnId', 'providerTxnId'],
      dateField: 'createdAt',
    });
    filter.user = userId;
    return rechargeTransactionRepository.findByUser(userId, filter, { ...pagination, sort });
  },

  async listAll(query) {
    const { filter, pagination, sort } = buildListQuery(query, {
      exactFields: ['status', 'type', 'user', 'operator'],
      searchFields: ['mobileNumber', 'txnId', 'providerTxnId'],
      dateField: 'createdAt',
    });
    return rechargeTransactionRepository.findPaginatedWithDetails(filter, { ...pagination, sort });
  },

  async retry(txnId, performedBy) {
    const txn = await rechargeTransactionRepository.findByTxnId(txnId);
    if (!txn) throw new NotFoundError('Transaction not found');

    assertRetryable(txn);

    const operator = await operatorRepository.findById(txn.operator);
    const circle   = txn.circle ? await circleRepository.findById(txn.circle) : null;
    const nextRetryAt = calcNextRetryAt(txn.retryCount);
    await rechargeTransactionRepository.markRetry(txnId, nextRetryAt);
    await rechargeTransactionRepository.updateStatus(txnId, TRANSACTION_STATUS.PROCESSING);

    const wallet = await walletRepository.findByUserId(txn.user.toString());
    assertWalletCanDebit(wallet, txn.amount);
    await walletService.debitForRecharge(wallet._id, txn.amount, txnId, txn.user);

    try {
      const { result: providerResult, usedProvider } = await callProviderWithFallback({
        mobileNumber: txn.mobileNumber,
        amount: txn.amount,
        operator,
        circle,
        txnId,
        correlationId: txn.correlationId,
        type: txn.type,
      });

      const updatedTxn = await rechargeTransactionRepository.updateStatus(txnId, providerResult.status, {
        providerTxnId: providerResult.providerTxnId,
        mroboticsRcId: providerResult.mroboticsRcId ?? null,
        providerStatus: providerResult.providerStatus,
        providerMessage: providerResult.message,
        isRetryable: false,
        usedProvider,
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
        description: `Recharge retry #${txn.retryCount + 1} for txnId ${txnId} via ${usedProvider}`,
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
