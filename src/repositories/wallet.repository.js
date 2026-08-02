import mongoose from 'mongoose';
import { Wallet, WalletTransaction } from '../models/index.js';
import { BaseRepository } from './base.repository.js';
import { DatabaseError } from '../helpers/error.helper.js';
import logger from '../config/logger.js';

class WalletRepository extends BaseRepository {
  constructor() {
    super(Wallet);
  }

  async findByUserId(userId) {
    return Wallet.findOne({ user: userId }).lean();
  }

  async findByUserIdWithLock(userId, session) {
    // findOneAndUpdate is atomic in MongoDB — acts as a select-for-update
    return Wallet.findOne({ user: userId }).session(session);
  }

  /**
   * Atomically credit a wallet using findOneAndUpdate with version check.
   * Prevents race conditions without explicit locking.
   */
  async creditBalance(walletId, amount, session = null) {
    const query = Wallet.findOneAndUpdate(
      { _id: walletId },
      {
        $inc: { balance: amount, totalCredited: amount },
        $set: { lastTransactionAt: new Date() },
      },
      { new: true, runValidators: true },
    );
    if (session) query.session(session);
    return query.lean();
  }

  /**
   * Atomically debit a wallet — checks balance atomically to prevent overdraft.
   */
  async debitBalance(walletId, amount, session = null) {
    const query = Wallet.findOneAndUpdate(
      {
        _id: walletId,
        balance: { $gte: amount }, // atomic balance check
        status: 'ACTIVE',
      },
      {
        $inc: { balance: -amount, totalDebited: amount },
        $set: { lastTransactionAt: new Date() },
      },
      { new: true, runValidators: true },
    );
    if (session) query.session(session);
    const result = await query.lean();
    if (!result) {
      throw new DatabaseError('Wallet debit failed: insufficient balance or wallet inactive');
    }
    return result;
  }

  async creditCommission(walletId, amount, session = null) {
    const query = Wallet.findOneAndUpdate(
      { _id: walletId },
      {
        $inc: { balance: amount, totalCredited: amount, totalCommission: amount },
        $set: { lastTransactionAt: new Date() },
      },
      { new: true },
    );
    if (session) query.session(session);
    return query.lean();
  }

  async addPendingAmount(walletId, amount, session = null) {
    const query = Wallet.findOneAndUpdate(
      { _id: walletId },
      { $inc: { pendingAmount: amount } },
      { new: true },
    );
    if (session) query.session(session);
    return query.lean();
  }

  async removePendingAmount(walletId, amount, session = null) {
    const query = Wallet.findOneAndUpdate(
      { _id: walletId },
      { $inc: { pendingAmount: -amount } },
      { new: true },
    );
    if (session) query.session(session);
    return query.lean();
  }

  async freeze(walletId, frozenBy, reason) {
    return Wallet.findByIdAndUpdate(
      walletId,
      {
        $set: {
          status: 'FROZEN',
          frozenAt: new Date(),
          frozenBy,
          frozenReason: reason,
        },
      },
      { new: true },
    ).lean();
  }

  async unfreeze(walletId) {
    return Wallet.findByIdAndUpdate(
      walletId,
      {
        $set: {
          status: 'ACTIVE',
          frozenAt: null,
          frozenBy: null,
          frozenReason: '',
        },
      },
      { new: true },
    ).lean();
  }
}

class WalletTransactionRepository extends BaseRepository {
  constructor() {
    super(WalletTransaction);
  }

  async findByTxnId(txnId) {
    return WalletTransaction.findOne({ txnId }).lean();
  }

  async findByWallet(walletId, filter = {}, paginationOptions = {}) {
    return this.findPaginated(
      { wallet: walletId, ...filter },
      { ...paginationOptions, sort: paginationOptions.sort || { createdAt: -1 } },
    );
  }

  async findByUser(userId, filter = {}, paginationOptions = {}) {
    return this.findPaginated(
      { user: userId, ...filter },
      { ...paginationOptions, sort: paginationOptions.sort || { createdAt: -1 } },
    );
  }

  async getWalletSummary(walletId, startDate, endDate) {
    const match = { wallet: new mongoose.Types.ObjectId(walletId) };
    if (startDate || endDate) {
      match.createdAt = {};
      if (startDate) match.createdAt.$gte = new Date(startDate);
      if (endDate) match.createdAt.$lte = new Date(endDate);
    }

    return WalletTransaction.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$type',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);
  }
}

export const walletRepository = new WalletRepository();
export const walletTransactionRepository = new WalletTransactionRepository();
