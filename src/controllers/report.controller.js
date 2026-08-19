import { reportService } from '../services/report.service.js';
import { sendSuccess, paginatedResponse } from '../utils/response.util.js';
import { asyncHandler } from '../utils/async.util.js';
import { ROLES } from '../constants/roles.js';

const isAdmin = (user) =>
  user.role === ROLES.SUPER_ADMIN || user.role === ROLES.ADMIN;

const userScope = (req) =>
  isAdmin(req.user) ? req.query : { ...req.query, userId: req.user.id };

const walletScope = (req) =>
  isAdmin(req.user) ? req.query : { ...req.query, user: req.user.id };

export const reportController = {
  getDashboard: asyncHandler(async (req, res) => {
    const stats = await reportService.getDashboardStats(
      isAdmin(req.user) ? null : req.user.id,
      req.user.role,
    );
    sendSuccess(res, { message: 'Dashboard stats retrieved', data: stats });
  }),

  getSalesReport: asyncHandler(async (req, res) => {
    const result = await reportService.getSalesReport(userScope(req));
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
    const data = await reportService.getSalesByDay(userScope(req));
    sendSuccess(res, { message: 'Daily sales report retrieved', data: { report: data } });
  }),

  getSalesByOperator: asyncHandler(async (req, res) => {
    const data = await reportService.getSalesByOperator(userScope(req));
    sendSuccess(res, { message: 'Operator sales report retrieved', data: { report: data } });
  }),

  getRechargeReport: asyncHandler(async (req, res) => {
    const { items, total } = await reportService.getRechargeReport(userScope(req));
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
    const { items, total } = await reportService.getWalletReport(walletScope(req));
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
    const data = await reportService.getCommissionReport(userScope(req));
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

  exportRechargeReport: asyncHandler(async (req, res) => {
    const { items } = await reportService.getRechargeReport({
      ...userScope(req),
      limit: 10000,
      page: 1,
    });
    sendSuccess(res, { message: 'Export data retrieved', data: { items } });
  }),

  exportWalletReport: asyncHandler(async (req, res) => {
    const { items } = await reportService.getWalletReport({
      ...walletScope(req),
      limit: 10000,
      page: 1,
    });
    sendSuccess(res, { message: 'Export data retrieved', data: { items } });
  }),

  exportMyRechargeReport: asyncHandler(async (req, res) => {
    const { items } = await reportService.getRechargeReport({
      ...req.query,
      userId: req.user.id,
      limit: 10000,
      page: 1,
    });
    sendSuccess(res, { message: 'Export data retrieved', data: { items } });
  }),

  exportMyWalletReport: asyncHandler(async (req, res) => {
    const { items } = await reportService.getWalletReport({
      ...req.query,
      user: req.user.id,
      limit: 10000,
      page: 1,
    });
    sendSuccess(res, { message: 'Export data retrieved', data: { items } });
  }),
};
