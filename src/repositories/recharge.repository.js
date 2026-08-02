import mongoose from 'mongoose';
import { RechargeTransaction } from '../models/index.js';
import { BaseRepository } from './base.repository.js';
import { TRANSACTION_STATUS } from '../constants/transaction.js';

class RechargeTransactionRepository extends BaseRepository {
  constructor() {
    super(RechargeTransaction);
  }

  async findByTxnId(txnId) {
    return RechargeTransaction.findOne({ txnId }).lean();
  }

  async findByTxnIdFull(txnId) {
    return RechargeTransaction.findOne({ txnId })
      .select('+providerRequest +providerResponse')
      .populate('operator', 'name code type')
      .populate('circle', 'name code')
      .populate('provider', 'name code')
      .lean();
  }

  async findByProviderTxnId(providerTxnId) {
    return RechargeTransaction.findOne({ providerTxnId }).lean();
  }

  async findByUser(userId, filter = {}, paginationOptions = {}) {
    return this.findPaginated(
      { user: userId, ...filter },
      {
        ...paginationOptions,
        sort: paginationOptions.sort || { createdAt: -1 },
        populate: [
          { path: 'operator', select: 'name code type logo' },
          { path: 'circle', select: 'name code' },
        ],
      },
    );
  }

  async findPaginatedWithDetails(filter = {}, paginationOptions = {}) {
    return this.findPaginated(filter, {
      ...paginationOptions,
      sort: paginationOptions.sort || { createdAt: -1 },
      populate: [
        { path: 'user', select: 'name email phone' },
        { path: 'operator', select: 'name code type' },
        { path: 'circle', select: 'name code' },
      ],
    });
  }

  async updateStatus(txnId, status, updateData = {}) {
    return RechargeTransaction.findOneAndUpdate(
      { txnId },
      {
        $set: {
          status,
          ...updateData,
          ...(status === TRANSACTION_STATUS.SUCCESS && { completedAt: new Date() }),
          ...(status === TRANSACTION_STATUS.REFUNDED && { refundedAt: new Date() }),
        },
      },
      { new: true },
    ).lean();
  }

  async markRetry(txnId, nextRetryAt) {
    return RechargeTransaction.findOneAndUpdate(
      { txnId },
      {
        $inc: { retryCount: 1 },
        $set: {
          lastRetryAt: new Date(),
          nextRetryAt,
          isRetryable: true,
        },
      },
      { new: true },
    ).lean();
  }

  async moveToDeadLetter(txnId) {
    return RechargeTransaction.findOneAndUpdate(
      { txnId },
      {
        $set: {
          isInDeadLetter: true,
          isRetryable: false,
          status: TRANSACTION_STATUS.FAILED,
        },
      },
      { new: true },
    ).lean();
  }

  async findRetryable() {
    return RechargeTransaction.find({
      isRetryable: true,
      isInDeadLetter: false,
      nextRetryAt: { $lte: new Date() },
      status: {
        $in: [TRANSACTION_STATUS.FAILED, TRANSACTION_STATUS.TIMEOUT, TRANSACTION_STATUS.PENDING],
      },
    })
      .limit(50)
      .lean();
  }

  async findPending() {
    return RechargeTransaction.find({
      status: { $in: [TRANSACTION_STATUS.PENDING, TRANSACTION_STATUS.PROCESSING] },
      initiatedAt: { $lt: new Date(Date.now() - 5 * 60 * 1000) },
    })
      .limit(100)
      .lean();
  }

  async findUnsettled() {
    return RechargeTransaction.find({
      status: TRANSACTION_STATUS.SUCCESS,
      isSettled: false,
    })
      .limit(500)
      .lean();
  }

  async markSettled(txnId) {
    return RechargeTransaction.findOneAndUpdate(
      { txnId },
      { $set: { isSettled: true, settledAt: new Date() } },
      { new: true },
    ).lean();
  }


  async getSalesSummary(filter = {}) {
    return RechargeTransaction.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalTransactions: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          totalCommission: { $sum: '$commission' },
          successCount: {
            $sum: { $cond: [{ $eq: ['$status', 'SUCCESS'] }, 1, 0] },
          },
          failedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'FAILED'] }, 1, 0] },
          },
          refundedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'REFUNDED'] }, 1, 0] },
          },
          successAmount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'SUCCESS'] }, '$amount', 0],
            },
          },
        },
      },
    ]);
  }

  async getSalesByDay(filter = {}) {
    return RechargeTransaction.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' },
          },
          count: { $sum: 1 },
          amount: { $sum: '$amount' },
          commission: { $sum: '$commission' },
          successCount: {
            $sum: { $cond: [{ $eq: ['$status', 'SUCCESS'] }, 1, 0] },
          },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
    ]);
  }

  async getSalesByOperator(filter = {}) {
    return RechargeTransaction.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$operator',
          count: { $sum: 1 },
          amount: { $sum: '$amount' },
          successCount: {
            $sum: { $cond: [{ $eq: ['$status', 'SUCCESS'] }, 1, 0] },
          },
        },
      },
      {
        $lookup: {
          from: 'operatormasters',
          localField: '_id',
          foreignField: '_id',
          as: 'operator',
        },
      },
      { $unwind: '$operator' },
      { $sort: { amount: -1 } },
    ]);
  }

  async getCommissionByUser(filter = {}) {
    return RechargeTransaction.aggregate([
      { $match: { ...filter, status: TRANSACTION_STATUS.SUCCESS } },
      {
        $group: {
          _id: '$user',
          totalCommission: { $sum: '$commission' },
          totalAmount: { $sum: '$amount' },
          transactionCount: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      {
        $project: {
          'user.password': 0,
          'user.refreshTokens': 0,
        },
      },
      { $sort: { totalCommission: -1 } },
    ]);
  }
}

export const rechargeTransactionRepository = new RechargeTransactionRepository();
