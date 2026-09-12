import { TRANSACTION_STATUS } from '../../../constants/transaction.js';

const STATUS_MAP = {
  success: TRANSACTION_STATUS.SUCCESS,
  true: TRANSACTION_STATUS.SUCCESS,
  failure: TRANSACTION_STATUS.FAILED,
  failed: TRANSACTION_STATUS.FAILED,
  false: TRANSACTION_STATUS.FAILED,
  pending: TRANSACTION_STATUS.PENDING,
  processing: TRANSACTION_STATUS.PROCESSING,
};

function buildMessage(raw) {
  const parts = [raw.message ?? raw.msg, raw.remark, raw.response].filter(Boolean);
  return parts.join(' — ');
}

function resolveInternalStatus(statusVal, fallback = TRANSACTION_STATUS.FAILED) {
  if (statusVal === true) return TRANSACTION_STATUS.SUCCESS;
  if (statusVal === false) return TRANSACTION_STATUS.FAILED;
  if (typeof statusVal === 'string') {
    const key = statusVal.trim().toLowerCase();
    if (STATUS_MAP[key]) return STATUS_MAP[key];
  }
  return fallback;
}

export const realroboMapperService = {
  mapRechargeResponse(raw) {
    if (!raw || typeof raw !== 'object') {
      return {
        status: TRANSACTION_STATUS.FAILED,
        providerStatus: 'unknown',
        providerTxnId: null,
        mroboticsRcId: null,
        operatorRef: null,
        message: 'Invalid response from RealRobo',
        balance: null,
        rawResponse: raw,
      };
    }

    const providerStatus = String(raw.status ?? '').toLowerCase();
    const internalStatus = resolveInternalStatus(raw.status, TRANSACTION_STATUS.FAILED);

    const providerTxnId =
      (raw.recharge_id ? String(raw.recharge_id) : null) ||
      (raw.txid ? String(raw.txid) : null) ||
      (raw.id ? String(raw.id) : null) ||
      null;

    const operatorRef =
      (raw.txid && raw.recharge_id && String(raw.txid) !== String(raw.recharge_id)
        ? String(raw.txid)
        : null) ||
      raw.opref?.toString() ||
      raw.operator_ref?.toString() ||
      raw.operator_id?.toString() ||
      null;

    return {
      status: internalStatus,
      providerStatus,
      providerTxnId,
      mroboticsRcId: null,
      operatorRef,
      message: buildMessage(raw),
      balance: raw.lapu_balance ?? null,
      rawResponse: raw,
    };
  },

  mapStatusResponse(raw) {
    if (!raw || typeof raw !== 'object') {
      return {
        status: TRANSACTION_STATUS.PENDING,
        providerStatus: 'unknown',
        message: 'Invalid status response from RealRobo',
      };
    }

    const internalStatus = resolveInternalStatus(raw.status, TRANSACTION_STATUS.PENDING);

    const providerTxnId =
      (raw.recharge_id ? String(raw.recharge_id) : null) ||
      (raw.txid ? String(raw.txid) : null) ||
      (raw.id ? String(raw.id) : null) ||
      null;

    const operatorRef =
      (raw.txid && raw.recharge_id && String(raw.txid) !== String(raw.recharge_id)
        ? String(raw.txid)
        : null) ||
      raw.opref?.toString() ||
      raw.operator_ref?.toString() ||
      raw.operator_id?.toString() ||
      null;

    return {
      status: internalStatus,
      providerStatus: String(raw.status ?? '').toLowerCase(),
      providerTxnId,
      operatorRef,
      message: buildMessage(raw),
      rawResponse: raw,
    };
  },

  mapWebhookPayload(payload) {
    if (!payload || typeof payload !== 'object') {
      return {
        internalStatus: TRANSACTION_STATUS.PENDING,
        providerStatus: 'unknown',
        providerTxnId: null,
        internalTxnId: null,
        operatorRef: null,
        message: '',
        raw: payload,
      };
    }

    const rawStatus = payload.status ?? payload.Status ?? payload.txstatus;
    const internalStatus = resolveInternalStatus(rawStatus, TRANSACTION_STATUS.PENDING);

    const internalTxnId =
      payload.req_id?.toString() ||
      payload.order_id?.toString() ||
      payload.clientTxnId?.toString() ||
      payload.apirefid?.toString() ||
      payload.custom_id?.toString() ||
      null;

    const providerTxnId =
      payload.recharge_id?.toString() ||
      payload.txid?.toString() ||
      payload.id?.toString() ||
      payload.txn_id?.toString() ||
      null;

    const operatorRef =
      (payload.txid && payload.recharge_id && String(payload.txid) !== String(payload.recharge_id)
        ? String(payload.txid)
        : null) ||
      payload.opref?.toString() ||
      payload.operator_ref?.toString() ||
      payload.operator_id?.toString() ||
      null;

    return {
      internalStatus,
      providerStatus: String(rawStatus ?? '').toLowerCase(),
      providerTxnId,
      internalTxnId,
      operatorRef,
      message: buildMessage(payload),
      raw: payload,
    };
  },
};
