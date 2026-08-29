import { Router } from 'express';
import { rechargeController } from '../controllers/recharge.controller.js';
import { authenticateApiKey } from '../middlewares/authenticateApiKey.middleware.js';
import { requireApiAccess } from '../middlewares/requireApiAccess.middleware.js';
import { authorizePermissions } from '../middlewares/authorize.middleware.js';
import { rechargeRateLimiter } from '../middlewares/rateLimiter.middleware.js';
import {
  initiateRechargeValidator,
  rechargeStatusValidator,
  rechargeListValidator,
} from '../validators/recharge.validator.js';
import { operatorController } from '../controllers/operator.controller.js';
import { walletController } from '../controllers/wallet.controller.js';
import { PERMISSIONS } from '../constants/permissions.js';

const router = Router();

router.use(authenticateApiKey);
router.use(requireApiAccess);

const getMobileNumber = (txn, req) => {
  return String(
    txn?.mobileNumber ||
    req?.body?.mobileNumber ||
    req?.query?.mobileNumber ||
    req?.body?.number ||
    req?.query?.number ||
    req?.body?.mobile ||
    req?.query?.mobile ||
    req?.body?.phone ||
    req?.query?.phone ||
    ''
  );
};

const getAmount = (txn, req) => {
  if (txn?.amount !== undefined && txn?.amount !== null && txn?.amount !== '') {
    return txn.amount;
  }
  const amt = req?.body?.amount ?? req?.query?.amount ?? req?.body?.amt ?? req?.query?.amt;
  if (amt !== undefined && amt !== null && amt !== '') {
    return Number(amt) || amt;
  }
  return '';
};

const simplifyRechargeResponse = (req, res, next) => {
  const originalJson = res.json.bind(res);

  res.json = (body) => {
    const txn = body?.data?.transaction;
    if (!txn) {
      if (body && typeof body === 'object' && body.success === false) {
        const mobileNumber = getMobileNumber(null, req);
        const amount = getAmount(null, req);
        const message = body.message || (Array.isArray(body.errors) && body.errors.length > 0 ? (body.errors[0].message || body.errors[0].msg) : '') || 'Request failed';
        return originalJson({
          success: false,
          providerTxnId: '',
          mobileNumber,
          number: mobileNumber,
          amount,
          message,
        });
      }
      return originalJson(body);
    }

    const status = (txn.status || '').toUpperCase();

    let success;
    if (status === 'SUCCESS') {
      success = true;
    } else if (['PENDING', 'PROCESSING', 'INITIATED'].includes(status)) {
      success = 'PENDING';
    } else {
      success = false;
    }

    const providerTxnId = txn.providerTxnId || txn.operatorRef || txn.mroboticsRcId || '';
    const message = txn.providerMessage || txn.statusMessage || body.message || '';
    const mobileNumber = getMobileNumber(txn, req);
    const amount = getAmount(txn, req);

    return originalJson({
      success,
      providerTxnId,
      mobileNumber,
      number: mobileNumber,
      amount,
      message,
    });
  };

  next();
};

const normalizeRechargePayload = (req, res, next) => {
  req.body = { ...(req.query || {}), ...(req.body || {}) };

  const mobile = req.body.mobileNumber || req.body.mobile || req.body.number || req.body.phone;
  if (mobile) req.body.mobileNumber = String(mobile).trim();

  const amount = req.body.amount ?? req.body.amt;
  if (amount !== undefined && amount !== null && amount !== '') req.body.amount = Number(amount);

  const op = req.body.operatorId || req.body.operator || req.body.op;
  if (op) req.body.operatorId = String(op).trim();

  const circle = req.body.circleId || req.body.circle || req.body.state;
  if (circle) req.body.circleId = String(circle).trim();

  if (!req.body.type) {
    req.body.type = 'MOBILE_PREPAID';
  }

  next();
};

const handleGetRecharge = (req, res, next) => {
  const hasRechargeFields =
    req.query?.mobileNumber ||
    req.query?.mobile ||
    req.query?.number ||
    req.query?.phone ||
    req.body?.mobileNumber ||
    req.query?.amount ||
    req.body?.amount;

  if (hasRechargeFields) {
    return rechargeRateLimiter(req, res, () => {
      authorizePermissions(PERMISSIONS.RECHARGE_INITIATE)(req, res, () => {
        initiateRechargeValidator(req, res, () => {
          rechargeController.initiateRecharge(req, res, next);
        });
      });
    });
  }

  return authorizePermissions(PERMISSIONS.RECHARGE_LIST)(req, res, () => {
    rechargeListValidator(req, res, () => {
      rechargeController.getMyTransactions(req, res, next);
    });
  });
};

router.post(
  '/recharge',
  simplifyRechargeResponse,
  normalizeRechargePayload,
  rechargeRateLimiter,
  authorizePermissions(PERMISSIONS.RECHARGE_INITIATE),
  initiateRechargeValidator,
  rechargeController.initiateRecharge,
);

router.get(
  '/recharge',
  simplifyRechargeResponse,
  normalizeRechargePayload,
  handleGetRecharge,
);

router.get(
  '/recharge/:txnId',
  simplifyRechargeResponse,
  authorizePermissions(PERMISSIONS.RECHARGE_STATUS),
  rechargeStatusValidator,
  rechargeController.getStatus,
);

router.get(
  '/wallet',
  authorizePermissions(PERMISSIONS.WALLET_READ),
  walletController.getMyWallet,
);

router.get(
  '/operators',
  authorizePermissions(PERMISSIONS.OPERATOR_LIST),
  operatorController.listActiveOperators,
);

router.get(
  '/circles',
  authorizePermissions(PERMISSIONS.CIRCLE_LIST),
  operatorController.listCircles,
);

router.get(
  '/plans',
  authorizePermissions(PERMISSIONS.PLAN_LIST),
  operatorController.getPlanRecommendations,
);

router.use('/recharge', (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';
  const mobileNumber = getMobileNumber(null, req);
  const amount = getAmount(null, req);

  return res.status(statusCode).json({
    success: false,
    providerTxnId: '',
    mobileNumber,
    number: mobileNumber,
    amount,
    message,
  });
});

export default router;
