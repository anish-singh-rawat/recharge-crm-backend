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

    const isExternalApiRequest = !!req.apiKey;

    let txn;
    try {
      txn = await rechargeService.initiateRecharge(req.body, req.user, requestMeta);
    } catch (err) {
      if (isExternalApiRequest) {
        const failedTxn = err.transaction || {};
        return res.status(HTTP_STATUS.OK).json({
          data: {
            transaction: {
              txnId:          failedTxn.txnId          || null,
              clientTxnId:    failedTxn.clientTxnId    || req.body?.clientTxnId || null,
              providerTxnId:  failedTxn.providerTxnId  || null,
              operatorRef:    failedTxn.operatorRef     || null,
              mobileNumber:   failedTxn.mobileNumber    || req.body?.mobileNumber || '',
              amount:         failedTxn.amount          || req.body?.amount || 0,
              status:         'FAILED',
              operator:       failedTxn.operator        || null,
              circle:         failedTxn.circle          || null,
              providerMessage: err.message              || 'Recharge failed',
              statusMessage:  err.message               || 'Recharge failed',
              createdAt:      failedTxn.createdAt       || new Date(),
            },
          },
        });
      }
      throw err;
    }

    const isSuccess = txn.status === 'SUCCESS';

    if (isExternalApiRequest) {
      return res.status(isSuccess ? HTTP_STATUS.CREATED : HTTP_STATUS.OK).json({
        data: {
          transaction: {
            txnId:          txn.txnId,
            clientTxnId:    txn.clientTxnId    || req.body?.clientTxnId || null,
            providerTxnId:  txn.providerTxnId  || null,
            operatorRef:    txn.operatorRef     || null,
            mobileNumber:   txn.mobileNumber,
            amount:         txn.amount,
            status:         txn.status,
            operator:       txn.operator,
            circle:         txn.circle,
            providerMessage: txn.providerMessage || txn.statusMessage || (isSuccess ? 'Recharge successful' : 'Recharge failed'),
            statusMessage:  txn.statusMessage   || '',
            createdAt:      txn.createdAt,
          },
        },
      });
    }

    const isAdmin = ['admin', 'super_admin'].includes(req.user?.role);
    const transactionData = {
      txnId:           txn.txnId,
      status:          txn.status,
      mobileNumber:    txn.mobileNumber,
      amount:          txn.amount,
      operator:        txn.operator,
      circle:          txn.circle,
      providerTxnId:   txn.providerTxnId,
      providerStatus:  txn.providerStatus,
      providerMessage: txn.providerMessage,
      operatorRef:     txn.operatorRef,
      commission:      txn.commission,
      refundAmount:    txn.refundAmount,
      createdAt:       txn.createdAt,
    };

    if (isAdmin) {
      transactionData.usedProvider = txn.usedProvider;
    }

    sendSuccess(res, {
      message: isSuccess
        ? 'Recharge successful'
        : `Recharge ${txn.status.toLowerCase()}: ${txn.providerMessage || txn.statusMessage}`,
      data: {
        transaction: transactionData,
      },
      statusCode: isSuccess ? HTTP_STATUS.CREATED : HTTP_STATUS.OK,
    });
  }),

  getStatus: asyncHandler(async (req, res) => {
    const txn = await rechargeService.getStatus(req.params.txnId, req.user.id);
    const txnObj = txn?.toObject ? txn.toObject() : (txn ? { ...txn } : txn);
    if (!['admin', 'super_admin'].includes(req.user?.role) && txnObj) {
      delete txnObj.usedProvider;
    }
    sendSuccess(res, { message: 'Transaction status retrieved', data: { transaction: txnObj } });
  }),

  getStatusAdmin: asyncHandler(async (req, res) => {
    const txn = await rechargeService.getStatus(req.params.txnId);
    sendSuccess(res, { message: 'Transaction status retrieved', data: { transaction: txn } });
  }),

  getMyTransactions: asyncHandler(async (req, res) => {
    const { items, total } = await rechargeService.listByUser(req.user.id, req.query);
    const isAdmin = ['admin', 'super_admin'].includes(req.user?.role);
    const sanitizedItems = isAdmin
      ? items
      : items.map((item) => {
          const doc = item?.toObject ? item.toObject() : { ...item };
          delete doc.usedProvider;
          return doc;
        });

    sendSuccess(res, {
      message: 'Transactions retrieved',
      data: paginatedResponse(sanitizedItems, {
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
    const txn = await rechargeService.refund(req.params.txnId, req.body.reason, req.user.id, {
      forceRefundSuccess: req.body.forceRefundSuccess === true,
    });
    sendSuccess(res, { message: 'Recharge refunded successfully', data: { transaction: txn } });
  }),

  syncStatusAdmin: asyncHandler(async (req, res) => {
    const { changed, txn, newStatus, statusResult } = await rechargeService.syncStatusAdmin(
      req.params.txnId,
      req.user.id,
    );
    sendSuccess(res, {
      message: changed
        ? `Status synced to ${newStatus}`
        : `Status unchanged (${newStatus})`,
      data: { transaction: txn, changed, newStatus, statusResult },
    });
  }),
};


