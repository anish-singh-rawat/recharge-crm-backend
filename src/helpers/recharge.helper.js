import { TRANSACTION_STATUS, TERMINAL_STATUSES } from '../constants/transaction.js';
import { RechargeError } from './error.helper.js';

/**
 * Assert a transaction can be retried.
 */
export const assertRetryable = (txn) => {
  if (!txn) throw new RechargeError('Transaction not found');
  if (TERMINAL_STATUSES.includes(txn.status) && txn.status !== TRANSACTION_STATUS.FAILED && txn.status !== TRANSACTION_STATUS.TIMEOUT) {
    throw new RechargeError(`Transaction in ${txn.status} state cannot be retried`);
  }
  if (txn.retryCount >= txn.maxRetries) {
    throw new RechargeError(`Maximum retry attempts (${txn.maxRetries}) reached`);
  }
  if (txn.isInDeadLetter) {
    throw new RechargeError('Transaction is in dead letter queue');
  }
};

/**
 * Assert a transaction can be refunded.
 */
export const assertRefundable = (txn) => {
  if (!txn) throw new RechargeError('Transaction not found');
  if (txn.status !== TRANSACTION_STATUS.FAILED && txn.status !== TRANSACTION_STATUS.SUCCESS) {
    throw new RechargeError(`Only FAILED or SUCCESS transactions can be refunded. Current status: ${txn.status}`);
  }
  if (txn.refundAmount > 0) {
    throw new RechargeError('Transaction has already been refunded');
  }
};

/**
 * Determine if a provider status represents success.
 */
export const isProviderSuccess = (providerStatus, successCodes = ['1', 'SUCCESS', 'success', 'TXN_SUCCESS']) =>
  successCodes.includes(String(providerStatus));

/**
 * Calculate next retry time using exponential backoff.
 */
export const calcNextRetryAt = (retryCount, baseDelayMs = 60000) => {
  const delay = baseDelayMs * Math.pow(2, retryCount);
  const maxDelay = 30 * 60 * 1000; // max 30 minutes
  return new Date(Date.now() + Math.min(delay, maxDelay));
};
