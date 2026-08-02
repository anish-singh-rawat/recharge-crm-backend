import mongoose from 'mongoose';
import { walletRepository, walletTransactionRepository } from '../repositories/wallet.repository.js';
import { userRepository } from '../repositories/user.repository.js';
import { notificationRepository } from '../repositories/notification.repository.js';
import { auditLogRepository } from '../repositories/log.repository.js';
import { generateWalletTxnId } from '../utils/id.util.js';
import { buildListQuery } from '../helpers/query.helper.js';
import { assertWalletCanDebit, assertWalletCanCredit } from '../helpers/wallet.helper.js';
import { NotFoundError, WalletError } from '../helpers/error.helper.js';
import { WALLET_TRANSACTION_TYPE } from '../constants/wallet.js';
import { AUDIT_ACTION, AUDIT_SEVERITY } from '../constants/audit.js';
import { NOTIFICATION_EVENT, NOTIFICATION_TYPE } from '../constants/notification.js';
import { walletLogger } from '../config/logger.js';

export const walletService = {
  async getWallet(userId) {
    const wallet = await walletRepository.findByUserId(userId);
    if (!wallet) throw new NotFoundError('Wallet not found');
    return wallet;
  },

  async credit(targetUserId, amount, description, remarks = '', performedBy) {
    const targetUser = await userRepository.findById(targetUserId);
    if (!targetUser) throw new NotFoundError('User not found');

    const wallet = await walletRepository.findByUserId(targetUserId);
    if (!wallet) throw new NotFoundError('Wallet not found');

    assertWalletCanCredit(wallet, amount);

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const updatedWallet = await walletRepository.creditBalance(wallet._id, amount, session);
      const txnId = generateWalletTxnId();

      const txn = await walletTransactionRepository.create({
        wallet: wallet._id,
        user: targetUserId,
        txnId,
        type: WALLET_TRANSACTION_TYPE.CREDIT,
        amount,
        balanceBefore: wallet.balance,
        balanceAfter: updatedWallet.balance,
        description,
        remarks,
        referenceType: 'MANUAL',
        performedBy,
      });

      await session.commitTransaction();

      notificationRepository.create({
        user: targetUserId,
        title: 'Wallet Credited',
        message: `₹${amount.toFixed(2)} has been credited to your wallet. New balance: ₹${updatedWallet.balance.toFixed(2)}`,
        type: NOTIFICATION_TYPE.SUCCESS,
        event: NOTIFICATION_EVENT.WALLET_CREDITED,
        referenceId: txnId,
        referenceType: 'WalletTransaction',
      }).catch(() => {});

      auditLogRepository.create({
        performedBy,
        targetUser: targetUserId,
        action: AUDIT_ACTION.WALLET_CREDITED,
        severity: AUDIT_SEVERITY.MEDIUM,
        module: 'wallet',
        description: `Wallet credited ₹${amount} by admin`,
        referenceId: txnId,
      }).catch(() => {});

      walletLogger.info('Wallet credited', { userId: targetUserId, amount, txnId });
      return { wallet: updatedWallet, transaction: txn };
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  },

  async debit(targetUserId, amount, description, remarks = '', performedBy) {
    const targetUser = await userRepository.findById(targetUserId);
    if (!targetUser) throw new NotFoundError('User not found');

    const wallet = await walletRepository.findByUserId(targetUserId);
    if (!wallet) throw new NotFoundError('Wallet not found');

    assertWalletCanDebit(wallet, amount);

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const updatedWallet = await walletRepository.debitBalance(wallet._id, amount, session);
      const txnId = generateWalletTxnId();

      const txn = await walletTransactionRepository.create({
        wallet: wallet._id,
        user: targetUserId,
        txnId,
        type: WALLET_TRANSACTION_TYPE.DEBIT,
        amount,
        balanceBefore: wallet.balance,
        balanceAfter: updatedWallet.balance,
        description,
        remarks,
        referenceType: 'MANUAL',
        performedBy,
      });

      await session.commitTransaction();

      notificationRepository.create({
        user: targetUserId,
        title: 'Wallet Debited',
        message: `₹${amount.toFixed(2)} has been debited from your wallet. New balance: ₹${updatedWallet.balance.toFixed(2)}`,
        type: NOTIFICATION_TYPE.WARNING,
        event: NOTIFICATION_EVENT.WALLET_DEBITED,
        referenceId: txnId,
      }).catch(() => {});

      auditLogRepository.create({
        performedBy,
        targetUser: targetUserId,
        action: AUDIT_ACTION.WALLET_DEBITED,
        severity: AUDIT_SEVERITY.MEDIUM,
        module: 'wallet',
        description: `Wallet debited ₹${amount} by admin`,
        referenceId: txnId,
      }).catch(() => {});

      return { wallet: updatedWallet, transaction: txn };
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  },

  async freeze(targetUserId, reason, performedBy) {
    const wallet = await walletRepository.findByUserId(targetUserId);
    if (!wallet) throw new NotFoundError('Wallet not found');
    if (wallet.status === 'FROZEN') throw new WalletError('Wallet is already frozen');

    const updated = await walletRepository.freeze(wallet._id, performedBy, reason);

    auditLogRepository.create({
      performedBy,
      targetUser: targetUserId,
      action: AUDIT_ACTION.WALLET_FROZEN,
      severity: AUDIT_SEVERITY.HIGH,
      module: 'wallet',
      description: `Wallet frozen: ${reason}`,
    }).catch(() => {});

    notificationRepository.create({
      user: targetUserId,
      title: 'Wallet Frozen',
      message: 'Your wallet has been frozen. Contact support for assistance.',
      type: NOTIFICATION_TYPE.ERROR,
      event: NOTIFICATION_EVENT.WALLET_FROZEN,
    }).catch(() => {});

    return updated;
  },

  async unfreeze(targetUserId, performedBy) {
    const wallet = await walletRepository.findByUserId(targetUserId);
    if (!wallet) throw new NotFoundError('Wallet not found');
    if (wallet.status !== 'FROZEN') throw new WalletError('Wallet is not frozen');

    const updated = await walletRepository.unfreeze(wallet._id);

    auditLogRepository.create({
      performedBy,
      targetUser: targetUserId,
      action: AUDIT_ACTION.WALLET_UNFROZEN,
      severity: AUDIT_SEVERITY.MEDIUM,
      module: 'wallet',
      description: 'Wallet unfrozen by admin',
    }).catch(() => {});

    notificationRepository.create({
      user: targetUserId,
      title: 'Wallet Unfrozen',
      message: 'Your wallet has been unfrozen. You can now transact normally.',
      type: NOTIFICATION_TYPE.SUCCESS,
      event: NOTIFICATION_EVENT.WALLET_UNFROZEN,
    }).catch(() => {});

    return updated;
  },

  async getStatement(userId, query) {
    const { filter, pagination, sort } = buildListQuery(query, {
      exactFields: ['type', 'status'],
      dateField: 'createdAt',
    });

    const wallet = await walletRepository.findByUserId(userId);
    if (!wallet) throw new NotFoundError('Wallet not found');

    return walletTransactionRepository.findByWallet(wallet._id, filter, { ...pagination, sort });
  },

  async getLedger(query) {
    const { filter, pagination, sort } = buildListQuery(query, {
      exactFields: ['type', 'status'],
      dateField: 'createdAt',
    });
    return walletTransactionRepository.findPaginated(filter, { ...pagination, sort });
  },

  async debitForRecharge(walletId, amount, txnId, userId, session = null) {
    const wallet = await walletRepository.model.findById(walletId);
    assertWalletCanDebit(wallet, amount);

    const updatedWallet = await walletRepository.debitBalance(walletId, amount, session);
    const walletTxnId = generateWalletTxnId();

    const walletTxn = await walletTransactionRepository.create({
      wallet: walletId,
      user: userId,
      txnId: walletTxnId,
      type: WALLET_TRANSACTION_TYPE.DEBIT,
      amount,
      balanceBefore: wallet.balance,
      balanceAfter: updatedWallet.balance,
      description: 'Recharge debit',
      referenceId: txnId,
      referenceType: 'RECHARGE',
    });

    return { updatedWallet, walletTxn };
  },

  async refundFromRecharge(walletId, amount, txnId, userId) {
    const wallet = await walletRepository.model.findById(walletId);
    const updatedWallet = await walletRepository.creditBalance(walletId, amount);
    const walletTxnId = generateWalletTxnId();

    await walletTransactionRepository.create({
      wallet: walletId,
      user: userId,
      txnId: walletTxnId,
      type: WALLET_TRANSACTION_TYPE.REFUND,
      amount,
      balanceBefore: wallet.balance,
      balanceAfter: updatedWallet.balance,
      description: 'Recharge refund',
      referenceId: txnId,
      referenceType: 'RECHARGE',
    });

    return updatedWallet;
  },
};
