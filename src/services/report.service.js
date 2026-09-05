import { rechargeTransactionRepository } from '../repositories/recharge.repository.js';
import { walletTransactionRepository } from '../repositories/wallet.repository.js';
import { buildListQuery } from '../helpers/query.helper.js';
import { buildDateRangeFilter } from '../utils/pagination.util.js';
import { startOfDay, endOfDay } from '../utils/date.util.js';
import { TRANSACTION_STATUS } from '../constants/transaction.js';
import mongoose from 'mongoose';

export const reportService = {
  async getSalesReport(query) {
    const { filter, pagination, sort } = buildListQuery(query, {
      exactFields: ['status', 'type', 'operator'],
      dateField: 'createdAt',
    });
    if (query.userId) filter.user = new mongoose.Types.ObjectId(query.userId);

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
    const extraFilter = {};
    if (query.userId) extraFilter.user = new mongoose.Types.ObjectId(query.userId);
    return rechargeTransactionRepository.getSalesByOperator({ ...dateFilter, ...extraFilter });
  },

  async getRechargeReport(query) {
    const { filter, pagination, sort } = buildListQuery(query, {
      exactFields: ['status', 'type', 'operator'],
      searchFields: ['mobileNumber', 'txnId'],
      dateField: 'createdAt',
    });
    if (query.userId) filter.user = new mongoose.Types.ObjectId(query.userId);
    return rechargeTransactionRepository.findPaginatedWithDetails(filter, { ...pagination, sort });
  },

  async getWalletReport(query) {
    const { filter, pagination, sort } = buildListQuery(query, {
      exactFields: ['type', 'status'],
      dateField: 'createdAt',
    });
    if (query.user) filter.user = new mongoose.Types.ObjectId(query.user);
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
    const todayStart = startOfDay();
    const todayEnd = endOfDay();

    const [todayStats, allTimeStats, statusBreakdown] = await Promise.all([
      rechargeTransactionRepository.getSalesSummary({
        ...baseFilter,
        createdAt: { $gte: todayStart, $lte: todayEnd },
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
