import { Router } from 'express';
import { rechargeController } from '../controllers/recharge.controller.js';
import { authenticateApiKey } from '../middlewares/authenticateApiKey.middleware.js';
import { requireApiAccess } from '../middlewares/requireApiAccess.middleware.js';
import { authorizePermissions } from '../middlewares/authorize.middleware.js';
import { rechargeRateLimiter } from '../middlewares/rateLimiter.middleware.js';
import {
  externalInitiateRechargeValidator,
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

const isExactMroboticsRawResponse = (body) => {
  if (!body || typeof body !== 'object') return false;
  return (
    'tnx_id' in body &&
    'mobile_no' in body &&
    'status' in body &&
    'recharge_date' in body
  );
};

const formatAsMroboticsResponse = (body, req) => {
  const txn = body?.data?.transaction || body?.transaction || null;
  const rawData = body?.raw || body?.rawResponse || txn?.providerResponse || {};

  const nowIso = new Date().toISOString();
  const createdAtIso = txn?.createdAt
    ? new Date(txn.createdAt).toISOString()
    : (rawData.createdAt || rawData.recharge_date || nowIso);
  const updatedAtIso = txn?.updatedAt
    ? new Date(txn.updatedAt).toISOString()
    : (rawData.updatedAt || nowIso);

  const rawStatus = String(
    body?.status ||
    txn?.status ||
    rawData.status ||
    (body?.success === true ? 'success' : (body?.success === false ? 'failure' : 'failure'))
  ).toLowerCase();

  let finalStatus = 'failure';
  if (rawStatus === 'success' || rawStatus === 'true') {
    finalStatus = 'success';
  } else if (['pending', 'processing', 'initiated'].includes(rawStatus)) {
    finalStatus = 'pending';
  } else {
    finalStatus = 'failure';
  }

  const responseMsg =
    rawData.response ||
    rawData.errorMessage ||
    rawData.message ||
    txn?.providerMessage ||
    txn?.statusMessage ||
    body?.message ||
    body?.response ||
    (Array.isArray(body?.errors) && body.errors.length > 0 ? (body.errors[0]?.message || body.errors[0]?.msg) : '') ||
    'No records found';

  const mobileNo =
    rawData.mobile_no ||
    getMobileNumber(txn, req) ||
    '';

  const amountVal =
    rawData.amount !== undefined
      ? Number(rawData.amount)
      : (txn?.amount !== undefined ? Number(txn.amount) : (getAmount(txn, req) !== '' ? Number(getAmount(txn, req)) : 0));

  const clientIp = (req.ip || req.connection?.remoteAddress || '171.61.26.226').replace('::ffff:', '');

  const orderId =
    rawData.order_id ||
    txn?.txnId ||
    req.body?.order_id ||
    req.query?.order_id ||
    req.body?.clientTxnId ||
    ('TXN' + Date.now());

  const tnxId =
    rawData.tnx_id ||
    rawData.id?.toString() ||
    txn?.providerTxnId ||
    txn?.operatorRef ||
    txn?.txnId ||
    ('BR' + Math.random().toString(36).substring(2, 12).toUpperCase());

  const idVal =
    typeof rawData.id === 'number'
      ? rawData.id
      : (Number(txn?.mroboticsRcId) || Math.floor(6130000000 + Math.random() * 9000000));

  const lapuIdVal =
    rawData.lapu_id !== undefined
      ? rawData.lapu_id
      : (txn?.operatorRef ? Number(txn.operatorRef) || txn.operatorRef : 2564502);

  const userIdVal =
    rawData.user_id !== undefined
      ? rawData.user_id
      : (req.user?.id ? (parseInt(String(req.user.id).slice(-6), 16) || 110429) : 110429);

  const companyIdVal =
    rawData.company_id !== undefined
      ? rawData.company_id
      : (req.body?.operatorId || req.body?.company_id || 5);

  const balanceVal =
    typeof rawData.balance === 'number'
      ? rawData.balance
      : (typeof req.user?.wallet?.balance === 'number' ? req.user.wallet.balance : 18267.53);

  return {
    lapu_no: rawData.lapu_no ?? '',
    balance: balanceVal,
    roffer: rawData.roffer ?? 0,
    status: finalStatus,
    recharge_date: createdAtIso,
    id: idVal,
    lapu_id: lapuIdVal,
    user_id: userIdVal,
    company_id: typeof companyIdVal === 'number' ? companyIdVal : (Number(companyIdVal) || 5),
    mobile_no: mobileNo,
    amount: amountVal,
    order_id: orderId,
    ip_address: rawData.ip_address || clientIp,
    updatedAt: updatedAtIso,
    createdAt: createdAtIso,
    response: typeof responseMsg === 'string' ? responseMsg : JSON.stringify(responseMsg),
    tnx_id: tnxId,
  };
};

const simplifyRechargeResponse = (req, res, next) => {
  const originalJson = res.json.bind(res);

  res.json = (body) => {
    // If the body is already the exact mrobotics response shape, pass it through directly
    if (isExactMroboticsRawResponse(body)) {
      return originalJson(body);
    }

    // Otherwise, convert whatever response came (from realrobo, validation error, etc.) to the exact mrobotics format
    return originalJson(formatAsMroboticsResponse(body, req));
  };

  next();
};

const normalizeRechargePayload = (req, res, next) => {
  req.body = { ...(req.query || {}), ...(req.body || {}) };

  // Client sends all params as a JSON blob in the query string
  // e.g. ?{"X-Api-Key":"...","mobileNumber":"639560766",amount":10,...}=
  // Express parses the entire blob as a single key — extract fields from it.
  if (!req.body.mobileNumber && !req.body.mobile && !req.body.number && !req.body.phone) {
    for (const rawKey of Object.keys(req.query)) {
      let parsed = null;

      // Attempt 1: direct JSON.parse (rawKey is already URL-decoded by Express)
      try { parsed = JSON.parse(rawKey); } catch (_) { /* not valid JSON */ }

      // Attempt 2: fix malformed JSON then parse
      // Handles: ,amount":10 → ,"amount":10  and  ,key:val → ,"key":val
      if (!parsed) {
        try {
          const fixed = rawKey
            .replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)"(\s*:)/g, '$1"$2"$3')
            .replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)(\s*:)/g, '$1"$2"$3');
          parsed = JSON.parse(fixed);
        } catch (_) { /* still not parseable */ }
      }

      // Attempt 3: regex extraction directly on rawKey (already URL-decoded)
      if (!parsed) {
        const fromRaw = {};
        const mobileMatch = rawKey.match(/"(?:mobileNumber|mobile|number|phone)"\s*:\s*"([^"]+)"/i);
        if (mobileMatch) fromRaw.mobileNumber = mobileMatch[1];
        const amountMatch = rawKey.match(/[,{]\s*(?:")?amount(?:")?\s*:\s*([0-9.]+)/i);
        if (amountMatch) fromRaw.amount = amountMatch[1];
        const opMatch = rawKey.match(/"operatorId"\s*:\s*"([^"]+)"/i);
        if (opMatch) fromRaw.operatorId = opMatch[1];
        const circleMatch = rawKey.match(/"circleId"\s*:\s*"([^"]+)"/i);
        if (circleMatch) fromRaw.circleId = circleMatch[1];
        const typeMatch = rawKey.match(/"type"\s*:\s*"([^"]+)"/i);
        if (typeMatch) fromRaw.type = typeMatch[1];
        if (Object.keys(fromRaw).length) { parsed = fromRaw; }
      }

      if (parsed && typeof parsed === 'object') {
        Object.entries(parsed).forEach(([k, v]) => {
          const lk = k.toLowerCase();
          if (!['x-api-key', 'apikey', 'api_key', 'key', 'token', 'content-type', 'authorization'].includes(lk)) {
            if (req.body[k] === undefined || req.body[k] === '') req.body[k] = v;
          }
        });
        break;
      }
    }
  }

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
        externalInitiateRechargeValidator(req, res, () => {
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
  externalInitiateRechargeValidator,
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
  const providerTxnId = message || 'FAILED';

  return res.status(statusCode).json({
    success: false,
    providerTxnId,
    number: mobileNumber,
    amount,
    message,
  });
});

export default router;
