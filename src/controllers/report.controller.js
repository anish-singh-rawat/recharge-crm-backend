import { reportService } from '../services/report.service.js';
import { sendSuccess, paginatedResponse } from '../utils/response.util.js';
import { asyncHandler } from '../utils/async.util.js';

export const reportController = {
  getDashboard: asyncHandler(async (req, res) => {
    const isRetailer = req.user.role === 'retailer';
    const stats = await reportService.getDashboardStats(
      isRetailer ? req.user.id : null,
      req.user.role,
    );
    sendSuccess(res, { message: 'Dashboard stats retrieved', data: stats });
  }),

  getSalesReport: asyncHandler(async (req, res) => {
    const result = await reportService.getSalesReport(req.query);
    sendSuccess(res, {
      message: 'Sales report retrieved',
      data: {
        summary: result.summary,
        ...paginatedResponse(result.items, {
          page: parseInt(req.query.page, 10) || 1,
          limit: parseInt(req.query.limit, 10) || 20,
          total: result.total,
        }),
      },
    });
  }),

  getSalesByDay: asyncHandler(async (req, res) => {
    const data = await reportService.getSalesByDay(req.query);
    sendSuccess(res, { message: 'Daily sales report retrieved', data: { report: data } });
  }),

  getSalesByOperator: asyncHandler(async (req, res) => {
    const data = await reportService.getSalesByOperator(req.query);
    sendSuccess(res, { message: 'Operator sales report retrieved', data: { report: data } });
  }),

  getRechargeReport: asyncHandler(async (req, res) => {
    const { items, total } = await reportService.getRechargeReport(req.query);
    sendSuccess(res, {
      message: 'Recharge report retrieved',
      data: paginatedResponse(items, {
        page: parseInt(req.query.page, 10) || 1,
        limit: parseInt(req.query.limit, 10) || 20,
        total,
      }),
    });
  }),

  getWalletReport: asyncHandler(async (req, res) => {
    const { items, total } = await reportService.getWalletReport(req.query);
    sendSuccess(res, {
      message: 'Wallet report retrieved',
      data: paginatedResponse(items, {
        page: parseInt(req.query.page, 10) || 1,
        limit: parseInt(req.query.limit, 10) || 20,
        total,
      }),
    });
  }),

  getCommissionReport: asyncHandler(async (req, res) => {
    const data = await reportService.getCommissionReport(req.query);
    sendSuccess(res, { message: 'Commission report retrieved', data: { report: data } });
  }),

  getMyRechargeReport: asyncHandler(async (req, res) => {
    const { items, total } = await reportService.getRechargeReport({
      ...req.query,
      userId: req.user.id,
    });
    sendSuccess(res, {
      message: 'My recharge report retrieved',
      data: paginatedResponse(items, {
        page: parseInt(req.query.page, 10) || 1,
        limit: parseInt(req.query.limit, 10) || 20,
        total,
      }),
    });
  }),

  getMyWalletReport: asyncHandler(async (req, res) => {
    const { items, total } = await reportService.getWalletReport({
      ...req.query,
      user: req.user.id,
    });
    sendSuccess(res, {
      message: 'My wallet report retrieved',
      data: paginatedResponse(items, {
        page: parseInt(req.query.page, 10) || 1,
        limit: parseInt(req.query.limit, 10) || 20,
        total,
      }),
    });
  }),
};
