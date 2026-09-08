import { Router } from "express";
import { rechargeController } from "../controllers/recharge.controller.js";
import { authenticateApiKey } from "../middlewares/authenticateApiKey.middleware.js";
import { requireApiAccess } from "../middlewares/requireApiAccess.middleware.js";
import { authorizePermissions } from "../middlewares/authorize.middleware.js";
import { rechargeRateLimiter } from "../middlewares/rateLimiter.middleware.js";
import {
  externalInitiateRechargeValidator,
  rechargeStatusValidator,
  rechargeListValidator,
} from "../validators/recharge.validator.js";
import { operatorController } from "../controllers/operator.controller.js";
import { walletController } from "../controllers/wallet.controller.js";
import { PERMISSIONS } from "../constants/permissions.js";
import RechargeTransaction from "../models/RechargeTransaction.model.js";

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
      "",
  );
};

const getAmount = (txn, req) => {
  if (txn?.amount !== undefined && txn?.amount !== null && txn?.amount !== "") {
    return txn.amount;
  }
  const amt =
    req?.body?.amount ??
    req?.query?.amount ??
    req?.body?.amt ??
    req?.query?.amt;
  if (amt !== undefined && amt !== null && amt !== "") {
    return Number(amt) || amt;
  }
  return "";
};

const formatAsDocumentedResponse = (body, req) => {
  const txn = body?.data?.transaction || body?.transaction || null;

  const rawStatus = String(
    txn?.status ||
      body?.status ||
      (body?.success === true
        ? "SUCCESS"
        : body?.success === false
          ? "FAILURE"
          : "FAILURE"),
  ).toUpperCase();

  let status = "failure";
  if (rawStatus === "SUCCESS" || rawStatus === "TRUE") {
    status = "success";
  } else if (["PENDING", "PROCESSING", "INITIATED"].includes(rawStatus)) {
    status = "pending";
  }

  const txnId = txn?.txnId || body?.txnId || null;
  const clientTxnId =
    txn?.clientTxnId ||
    body?.clientTxnId ||
    req.body?.clientTxnId ||
    req.query?.clientTxnId ||
    null;

  const providerTxnId =
    txn?.providerTxnId ||
    body?.providerTxnId ||
    txn?.operatorRef ||
    body?.operatorRef ||
    (status === "pending" ? txnId : null);

  const operatorRef = txn?.operatorRef || body?.operatorRef || null;
  const number =
    getMobileNumber(txn, req) ||
    body?.number ||
    body?.mobileNumber ||
    "";
  const amount =
    txn?.amount !== undefined
      ? Number(txn.amount)
      : body?.amount !== undefined
        ? Number(body.amount)
        : getAmount(null, req) !== ""
          ? Number(getAmount(null, req))
          : 0;

  const operator =
    (txn?.operator && typeof txn.operator === "object"
      ? txn.operator.name
      : txn?.operator) ||
    (body?.operator && typeof body.operator === "object"
      ? body.operator.name
      : body?.operator) ||
    null;

  const circle =
    (txn?.circle && typeof txn.circle === "object"
      ? txn.circle.name
      : txn?.circle) ||
    (body?.circle && typeof body.circle === "object"
      ? body.circle.name
      : body?.circle) ||
    null;

  let message;
  if (status === "success") {
    message =
      txn?.providerMessage ||
      txn?.statusMessage ||
      body?.message ||
      "Recharge successful";
  } else if (status === "pending") {
    message =
      txn?.providerMessage ||
      txn?.statusMessage ||
      body?.message ||
      "Recharge is currently processing";
  } else {
    const errMsg =
      txn?.providerMessage ||
      txn?.statusMessage ||
      body?.message ||
      (Array.isArray(body?.errors) && body.errors.length > 0
        ? body.errors[0]?.message || body.errors[0]?.msg
        : "") ||
      "Recharge failed";
    message = errMsg;
  }

  const createdAt = txn?.createdAt
    ? new Date(txn.createdAt).toISOString()
    : body?.createdAt
      ? new Date(body.createdAt).toISOString()
      : new Date().toISOString();

  return {
    status,
    txnId,
    clientTxnId,
    providerTxnId,
    operatorRef,
    number,
    amount,
    operator,
    circle,
    message,
    createdAt,
  };
};

const simplifyRechargeResponse = (req, res, next) => {
  const originalJson = res.json.bind(res);

  res.json = (body) => {
    return originalJson(formatAsDocumentedResponse(body, req));
  };

  next();
};

const parseRawJsonString = (str) => {
  if (!str || typeof str !== "string") return null;
  const trimmed = str.trim();
  if (!trimmed.includes("{") || !trimmed.includes("}")) return null;

  const startIdx = trimmed.indexOf("{");
  const endIdx = trimmed.lastIndexOf("}");
  if (startIdx === -1 || endIdx <= startIdx) return null;

  const jsonSubstring = trimmed.slice(startIdx, endIdx + 1);

  try {
    const parsed = JSON.parse(jsonSubstring);
    if (parsed && typeof parsed === "object") return parsed;
  } catch (_) {}

  try {
    const fixed = jsonSubstring
      .replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)"(\s*:)/g, '$1"$2"$3')
      .replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)(\s*:)/g, '$1"$2"$3');
    const parsed = JSON.parse(fixed);
    if (parsed && typeof parsed === "object") return parsed;
  } catch (_) {}

  const res = {};
  const mobileMatch = jsonSubstring.match(
    /"(?:mobileNumber|mobile|number|phone)"\s*:\s*"([^"]+)"/i,
  );
  if (mobileMatch) res.mobileNumber = mobileMatch[1];

  const amountMatch = jsonSubstring.match(
    /[,{]\s*(?:")?amount(?:")?\s*:\s*([0-9.]+)/i,
  );
  if (amountMatch) res.amount = amountMatch[1];

  const opMatch = jsonSubstring.match(
    /"(?:operatorId|operator|op)"\s*:\s*"([^"]+)"/i,
  );
  if (opMatch) res.operatorId = opMatch[1];

  const circleMatch = jsonSubstring.match(
    /"(?:circleId|circle|state)"\s*:\s*"([^"]+)"/i,
  );
  if (circleMatch) res.circleId = circleMatch[1];

  const typeMatch = jsonSubstring.match(/"type"\s*:\s*"([^"]+)"/i);
  if (typeMatch) res.type = typeMatch[1];

  const clientTxnMatch = jsonSubstring.match(
    /"(?:clientTxnId|customTxnId|retailerTxnId|externalTxnId|order_id|orderId|refId)"\s*:\s*"([^"]+)"/i,
  );
  if (clientTxnMatch) res.clientTxnId = clientTxnMatch[1];

  return Object.keys(res).length ? res : null;
};

const normalizeRechargePayload = (req, res, next) => {
  req.body = { ...(req.query || {}), ...(req.body || {}) };

  const allKeys = [
    ...Object.keys(req.query || {}),
    ...Object.keys(req.body || {}),
  ];
  const mergedFromRaw = {};

  for (const k of allKeys) {
    if (k.includes("{")) {
      const parsed = parseRawJsonString(k);
      if (parsed) {
        Object.assign(mergedFromRaw, parsed);
      }
      delete req.body[k];
    }
  }

  const fullUrl = `${req.originalUrl || ""} ${req.url || ""}`;
  if (fullUrl.includes("{")) {
    const parsedFromUrl = parseRawJsonString(fullUrl);
    if (parsedFromUrl) {
      Object.assign(mergedFromRaw, parsedFromUrl);
    }
  }

  Object.entries(mergedFromRaw).forEach(([key, val]) => {
    const lk = key.toLowerCase();
    if (
      ![
        "x-api-key",
        "apikey",
        "api_key",
        "key",
        "token",
        "content-type",
        "authorization",
      ].includes(lk)
    ) {
      if (
        req.body[key] === undefined ||
        req.body[key] === "" ||
        key === "clientTxnId"
      ) {
        req.body[key] = val;
      }
    }
  });

  const mobile =
    req.body.mobileNumber ||
    req.body.mobile ||
    req.body.number ||
    req.body.phone;
  if (mobile) req.body.mobileNumber = String(mobile).trim();

  const amount = req.body.amount ?? req.body.amt;
  if (amount !== undefined && amount !== null && amount !== "")
    req.body.amount = Number(amount);

  const op = req.body.operatorId || req.body.operator || req.body.op;
  if (op) req.body.operatorId = String(op).trim();

  const circle = req.body.circleId || req.body.circle || req.body.state;
  if (circle) req.body.circleId = String(circle).trim();

  let clientTxn =
    req.body.clientTxnId ||
    req.body.customTxnId ||
    req.body.retailerTxnId ||
    req.body.externalTxnId ||
    req.body.order_id ||
    req.body.orderId ||
    req.body.refId ||
    req.query?.clientTxnId ||
    req.query?.customTxnId ||
    req.query?.retailerTxnId ||
    req.query?.externalTxnId ||
    req.query?.order_id ||
    req.query?.orderId ||
    req.query?.refId;

  if (!clientTxn) {
    const m = fullUrl.match(
      /(?:clientTxnId|customTxnId|retailerTxnId|externalTxnId|order_id|orderId|refId)["']?\s*[:=]\s*["']?([a-zA-Z0-9_\-]+)["']?/i,
    );
    if (m && m[1]) {
      clientTxn = m[1].trim();
    }
  }

  if (clientTxn) {
    req.body.clientTxnId = String(clientTxn).trim();
  }

  if (!req.body.type) {
    req.body.type = "MOBILE_PREPAID";
  }

  next();
};

const simplifyStatusResponse = (req, res, next) => {
  const originalJson = res.json.bind(res);

  res.json = (body) => {
    const txn = body?.data?.transaction || body?.transaction;
    if (!txn) {
      if (body && typeof body === "object") {
        const mobileNumber = getMobileNumber(null, req);
        const amount = getAmount(null, req) || 0;
        const message =
          body.message ||
          (Array.isArray(body.errors) && body.errors.length > 0
            ? body.errors[0]?.message || body.errors[0]?.msg
            : "") ||
          "Transaction not found";
        const providerTxnId = body.providerTxnId || message || "FAILED";
        return originalJson({
          status: "failure",
          txnId: null,
          clientTxnId:
            req.params?.txnId ||
            req.body?.clientTxnId ||
            req.query?.clientTxnId ||
            null,
          providerTxnId,
          operatorRef: null,
          number: mobileNumber,
          amount,
          message,
        });
      }
      return originalJson(body);
    }

    const rawStatus = String(txn.status || "").toUpperCase();
    let status = "failure";
    if (rawStatus === "SUCCESS") {
      status = "success";
    } else if (["PENDING", "PROCESSING", "INITIATED"].includes(rawStatus)) {
      status = "pending";
    } else {
      status = "failure";
    }

    const message =
      txn.providerMessage ||
      txn.statusMessage ||
      body.message ||
      (status === "success"
        ? "Recharge successful"
        : status === "pending"
          ? "Recharge is currently processing"
          : "Recharge failed");
    const providerTxnId =
      txn.providerTxnId ||
      txn.operatorRef ||
      txn.mroboticsRcId ||
      (txn.txnId ? String(txn.txnId) : "") ||
      message ||
      "FAILED";
    const mobileNumber = getMobileNumber(txn, req);
    const amount = getAmount(txn, req);

    return originalJson({
      status,
      txnId: txn.txnId || null,
      clientTxnId: txn.clientTxnId || null,
      providerTxnId,
      operatorRef: txn.operatorRef || null,
      number: mobileNumber,
      amount: amount !== "" ? Number(amount) : 0,
      operator:
        txn.operator?.name || txn.operator?.code || txn.operator || null,
      circle: txn.circle?.name || txn.circle?.code || txn.circle || null,
      message,
      createdAt: txn.createdAt || null,
    });
  };

  next();
};

const checkDuplicateClientTxnId = async (req, res, next) => {
  const clientTxnId = req.body?.clientTxnId;
  if (!clientTxnId) return next();

  const userId = req.user?._id || req.user?.id;
  if (!userId) return next();

  try {
    const existing = await RechargeTransaction.findOne(
      { user: userId, clientTxnId },
      {
        txnId: 1,
        status: 1,
        amount: 1,
        mobileNumber: 1,
        createdAt: 1,
        operator: 1,
        circle: 1,
        providerTxnId: 1,
        operatorRef: 1,
      },
    )
      .populate("operator", "name code")
      .populate("circle", "name code")
      .lean();

    if (existing) {
      return res.status(409).json({
        status: "failure",
        txnId: existing.txnId || null,
        clientTxnId,
        providerTxnId: existing.providerTxnId || null,
        operatorRef: existing.operatorRef || null,
        number: existing.mobileNumber || getMobileNumber(null, req),
        amount: Number(existing.amount) || 0,
        operator: existing.operator?.name || null,
        circle: existing.circle?.name || null,
        message: `Duplicate clientTxnId: "${clientTxnId}" has already been used for a recharge by this account.`,
        createdAt: existing.createdAt
          ? new Date(existing.createdAt).toISOString()
          : new Date().toISOString(),
      });
    }

    return next();
  } catch (err) {
    return next();
  }
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
        checkDuplicateClientTxnId(req, res, () => {
          externalInitiateRechargeValidator(req, res, () => {
            rechargeController.initiateRecharge(req, res, next);
          });
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
  "/recharge",
  simplifyRechargeResponse,
  normalizeRechargePayload,
  rechargeRateLimiter,
  authorizePermissions(PERMISSIONS.RECHARGE_INITIATE),
  checkDuplicateClientTxnId,
  externalInitiateRechargeValidator,
  rechargeController.initiateRecharge,
);

router.get(
  "/recharge",
  simplifyRechargeResponse,
  normalizeRechargePayload,
  handleGetRecharge,
);

router.get(
  "/recharge/:txnId",
  simplifyStatusResponse,
  authorizePermissions(PERMISSIONS.RECHARGE_STATUS),
  rechargeStatusValidator,
  rechargeController.getStatus,
);

router.get(
  "/wallet",
  authorizePermissions(PERMISSIONS.WALLET_READ),
  walletController.getMyWallet,
);

router.get(
  "/operators",
  authorizePermissions(PERMISSIONS.OPERATOR_LIST),
  operatorController.listActiveOperators,
);

router.get(
  "/circles",
  authorizePermissions(PERMISSIONS.CIRCLE_LIST),
  operatorController.listCircles,
);

router.get(
  "/plans",
  authorizePermissions(PERMISSIONS.PLAN_LIST),
  operatorController.getPlanRecommendations,
);

router.use("/recharge", (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal server error";
  const mobileNumber = getMobileNumber(null, req);
  const amount = getAmount(null, req) || 0;

  return res.status(statusCode).json({
    status: "failure",
    txnId: null,
    clientTxnId: req.body?.clientTxnId || req.query?.clientTxnId || null,
    providerTxnId: null,
    operatorRef: null,
    number: mobileNumber,
    amount: Number(amount) || 0,
    operator: null,
    circle: null,
    message,
    createdAt: new Date().toISOString(),
  });
});

export default router;
