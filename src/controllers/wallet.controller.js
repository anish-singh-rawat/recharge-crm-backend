import { walletService } from '../services/wallet.service.js';
import { sendSuccess, paginatedResponse } from '../utils/response.util.js';
import { asyncHandler } from '../utils/async.util.js';

export const walletController = {
  getMyWallet: asyncHandler(async (req, res) => {
    const wallet = await walletService.getWallet(req.user.id);
    sendSuccess(res, { message: 'Wallet retrieved', data: { wallet } });
  }),

  getWalletByUserId: asyncHandler(async (req, res) => {
    const wallet = await walletService.getWallet(req.params.userId);
    sendSuccess(res, { message: 'Wallet retrieved', data: { wallet } });
  }),

  creditWallet: asyncHandler(async (req, res) => {
    const { amount, description, remarks, referenceId } = req.body;
    const result = await walletService.credit(
      req.params.userId, amount, description, remarks, req.user.id,
    );
    sendSuccess(res, {
      message: `Wallet credited ₹${amount} successfully`,
      data: result,
    });
  }),

  debitWallet: asyncHandler(async (req, res) => {
    const { amount, description, remarks } = req.body;
    const result = await walletService.debit(
      req.params.userId, amount, description, remarks, req.user.id,
    );
    sendSuccess(res, {
      message: `Wallet debited ₹${amount} successfully`,
      data: result,
    });
  }),

  freezeWallet: asyncHandler(async (req, res) => {
    const wallet = await walletService.freeze(req.params.userId, req.body.reason, req.user.id);
    sendSuccess(res, { message: 'Wallet frozen successfully', data: { wallet } });
  }),

  unfreezeWallet: asyncHandler(async (req, res) => {
    const wallet = await walletService.unfreeze(req.params.userId, req.user.id);
    sendSuccess(res, { message: 'Wallet unfrozen successfully', data: { wallet } });
  }),

  getMyStatement: asyncHandler(async (req, res) => {
    const { items, total } = await walletService.getStatement(req.user.id, req.query);
    sendSuccess(res, {
      message: 'Wallet statement retrieved',
      data: paginatedResponse(items, {
        page: parseInt(req.query.page, 10) || 1,
        limit: parseInt(req.query.limit, 10) || 20,
        total,
      }),
    });
  }),

  getStatementByUserId: asyncHandler(async (req, res) => {
    const { items, total } = await walletService.getStatement(req.params.userId, req.query);
    sendSuccess(res, {
      message: 'Wallet statement retrieved',
      data: paginatedResponse(items, {
        page: parseInt(req.query.page, 10) || 1,
        limit: parseInt(req.query.limit, 10) || 20,
        total,
      }),
    });
  }),

  getLedger: asyncHandler(async (req, res) => {
    const { items, total } = await walletService.getLedger(req.query);
    sendSuccess(res, {
      message: 'Wallet ledger retrieved',
      data: paginatedResponse(items, {
        page: parseInt(req.query.page, 10) || 1,
        limit: parseInt(req.query.limit, 10) || 20,
        total,
      }),
    });
  }),
};
