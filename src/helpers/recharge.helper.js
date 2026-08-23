import { TRANSACTION_STATUS, TERMINAL_STATUSES } from '../constants/transaction.js';
import { RechargeError } from './error.helper.js';

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

export const assertRefundable = (txn, { forceRefundSuccess = false } = {}) => {
  if (!txn) throw new RechargeError('Transaction not found');

  if (txn.status === TRANSACTION_STATUS.SUCCESS && !forceRefundSuccess) {
    throw new RechargeError(
      'Cannot refund a successful recharge without explicit confirmation. ' +
      'Pass forceRefundSuccess=true to override (admin only).',
    );
  }

  if (
    txn.status !== TRANSACTION_STATUS.FAILED &&
    txn.status !== TRANSACTION_STATUS.SUCCESS
  ) {
    throw new RechargeError(
      `Only FAILED or SUCCESS transactions can be refunded. Current status: ${txn.status}`,
    );
  }

  if (txn.refundAmount > 0) {
    throw new RechargeError('Transaction has already been refunded');
  }
};


export const isProviderSuccess = (providerStatus, successCodes = ['1', 'SUCCESS', 'success', 'TXN_SUCCESS']) =>
  successCodes.includes(String(providerStatus));

export const calcNextRetryAt = (retryCount, baseDelayMs = 60000) => {
  const delay = baseDelayMs * Math.pow(2, retryCount);
  const maxDelay = 30 * 60 * 1000;
  return new Date(Date.now() + Math.min(delay, maxDelay));
};
