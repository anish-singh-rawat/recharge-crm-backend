import { rechargeTransactionRepository } from '../repositories/recharge.repository.js';
import { walletTransactionRepository } from '../repositories/wallet.repository.js';
import { buildListQuery } from '../helpers/query.helper.js';
import { buildDateRangeFilter } from '../utils/pagination.util.js';
import { TRANSACTION_STATUS } from '../constants/transaction.js';
import mongoose from 'mongoose';

export const reportService = {
  async getSalesReport(query) {
    const { filter, pagination, sort } = buildListQuery(query, {
      exactFields: ['status', 'type', 'user', 'operator'],
      dateField: 'createdAt',
    });

    const [summary, paginated] = await Promise.all([
      rechargeTransactionRepository.getSalesSummary(filter),
      rechargeTransactionRepository.findPaginatedWithDetails(filter, { ...pagination, sort }),
    ]);

    return {
      summary: summary[0] || {
        totalTransactions: 0,
        totalAmount: 0,
        totalCommission: 0,
        successCount: 0,
        failedCount: 0,
        refundedCount: 0,
        successAmount: 0,
      },
      ...paginated,
    };
  },

  async getSalesByDay(query) {
    const dateFilter = buildDateRangeFilter(query.startDate, query.endDate);
    const extraFilter = {};
    if (query.userId) extraFilter.user = new mongoose.Types.ObjectId(query.userId);
    return rechargeTransactionRepository.getSalesByDay({ ...dateFilter, ...extraFilter });
  },

  async getSalesByOperator(query) {
    const dateFilter = buildDateRangeFilter(query.startDate, query.endDate);
    return rechargeTransactionRepository.getSalesByOperator(dateFilter);
  },

  async getRechargeReport(query) {
    const { filter, pagination, sort } = buildListQuery(query, {
      exactFields: ['status', 'type', 'operator', 'user'],
      searchFields: ['mobileNumber', 'txnId'],
      dateField: 'createdAt',
    });
    return rechargeTransactionRepository.findPaginatedWithDetails(filter, { ...pagination, sort });
  },

  async getWalletReport(query) {
    const { filter, pagination, sort } = buildListQuery(query, {
      exactFields: ['type', 'status', 'user'],
      dateField: 'createdAt',
    });
    return walletTransactionRepository.findPaginated(filter, {
      ...pagination,
      sort,
      populate: [{ path: 'user', select: 'name email phone role' }],
    });
  },

  async getCommissionReport(query) {
    const dateFilter = buildDateRangeFilter(query.startDate, query.endDate);
    const extraFilter = {};
    if (query.userId) extraFilter.user = new mongoose.Types.ObjectId(query.userId);

    return rechargeTransactionRepository.getCommissionByUser({
      ...dateFilter,
      ...extraFilter,
    });
  },

  async getDashboardStats(userId = null, role = 'admin') {
    const baseFilter = userId && role === 'retailer' ? { user: new mongoose.Types.ObjectId(userId) } : {};
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [todayStats, allTimeStats, statusBreakdown] = await Promise.all([
      rechargeTransactionRepository.getSalesSummary({
        ...baseFilter,
        createdAt: { $gte: todayStart },
      }),
      rechargeTransactionRepository.getSalesSummary(baseFilter),
      rechargeTransactionRepository.aggregate([
        { $match: baseFilter },
        { $group: { _id: '$status', count: { $sum: 1 }, amount: { $sum: '$amount' } } },
      ]),
    ]);

    return {
      today: todayStats[0] || {},
      allTime: allTimeStats[0] || {},
      statusBreakdown,
    };
  },
};
