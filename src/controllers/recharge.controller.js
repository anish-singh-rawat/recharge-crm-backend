import { rechargeService } from '../services/recharge.service.js';
import { sendSuccess, paginatedResponse } from '../utils/response.util.js';
import { asyncHandler } from '../utils/async.util.js';
import { HTTP_STATUS } from '../constants/http.js';

export const rechargeController = {
  initiateRecharge: asyncHandler(async (req, res) => {
    const requestMeta = {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || '',
      requestId: req.requestId,
    };
    const txn = await rechargeService.initiateRecharge(req.body, req.user, requestMeta);
    const isSuccess = txn.status === 'SUCCESS';
    sendSuccess(res, {
      message: isSuccess ? 'Recharge successful' : `Recharge ${txn.status.toLowerCase()}: ${txn.providerMessage || txn.statusMessage}`,
      data: { transaction: txn },
      statusCode: isSuccess ? HTTP_STATUS.CREATED : HTTP_STATUS.OK,
    });
  }),

  getStatus: asyncHandler(async (req, res) => {
    const txn = await rechargeService.getStatus(req.params.txnId, req.user.id);
    sendSuccess(res, { message: 'Transaction status retrieved', data: { transaction: txn } });
  }),

  getStatusAdmin: asyncHandler(async (req, res) => {
    const txn = await rechargeService.getStatus(req.params.txnId);
    sendSuccess(res, { message: 'Transaction status retrieved', data: { transaction: txn } });
  }),

  getMyTransactions: asyncHandler(async (req, res) => {
    const { items, total } = await rechargeService.listByUser(req.user.id, req.query);
    sendSuccess(res, {
      message: 'Transactions retrieved',
      data: paginatedResponse(items, {
        page: parseInt(req.query.page, 10) || 1,
        limit: parseInt(req.query.limit, 10) || 20,
        total,
      }),
    });
  }),

  listAllTransactions: asyncHandler(async (req, res) => {
    const { items, total } = await rechargeService.listAll(req.query);
    sendSuccess(res, {
      message: 'Transactions retrieved',
      data: paginatedResponse(items, {
        page: parseInt(req.query.page, 10) || 1,
        limit: parseInt(req.query.limit, 10) || 20,
        total,
      }),
    });
  }),

  retryRecharge: asyncHandler(async (req, res) => {
    const txn = await rechargeService.retry(req.params.txnId, req.user.id);
    sendSuccess(res, { message: 'Recharge retry initiated', data: { transaction: txn } });
  }),

  refundRecharge: asyncHandler(async (req, res) => {
    const txn = await rechargeService.refund(req.params.txnId, req.body.reason, req.user.id);
    sendSuccess(res, { message: 'Recharge refunded successfully', data: { transaction: txn } });
  }),
};
