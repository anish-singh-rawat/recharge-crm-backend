import { WALLET_STATUS } from '../constants/wallet.js';
import { WalletError } from './error.helper.js';

/**
 * Assert a wallet can perform a debit.
 * Throws WalletError if validation fails.
 *
 * @param {object} wallet  Wallet document
 * @param {number} amount
 */
export const assertWalletCanDebit = (wallet, amount) => {
  if (!wallet) throw new WalletError('Wallet not found');
  if (wallet.status === WALLET_STATUS.FROZEN)
    throw new WalletError('Wallet is frozen. Contact support.');
  if (wallet.status === WALLET_STATUS.SUSPENDED)
    throw new WalletError('Wallet is suspended. Contact support.');
  if (wallet.status === WALLET_STATUS.CLOSED)
    throw new WalletError('Wallet is closed.');
  if (wallet.balance < amount)
    throw new WalletError(`Insufficient wallet balance. Available: ₹${wallet.balance.toFixed(2)}, Required: ₹${amount.toFixed(2)}`);
};

/**
 * Assert a wallet can receive a credit.
 *
 * @param {object} wallet
 * @param {number} amount
 */
export const assertWalletCanCredit = (wallet, amount) => {
  if (!wallet) throw new WalletError('Wallet not found');
  if (wallet.status === WALLET_STATUS.CLOSED)
    throw new WalletError('Wallet is closed. Cannot credit a closed wallet.');
  if (wallet.status === WALLET_STATUS.SUSPENDED)
    throw new WalletError('Wallet is suspended. Contact support.');
  if (wallet.balance + amount > wallet.walletLimit)
    throw new WalletError(`Credit would exceed wallet limit of ₹${wallet.walletLimit.toFixed(2)}`);
};

/**
 * Calculate commission amount.
 * @param {number} amount
 * @param {number} rate  Commission rate (0–1), e.g. 0.02 = 2%
 * @returns {number}
 */
export const calculateCommission = (amount, rate) =>
  parseFloat((amount * rate).toFixed(2));
