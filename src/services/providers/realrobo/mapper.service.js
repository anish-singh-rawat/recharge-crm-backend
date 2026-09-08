import { TRANSACTION_STATUS } from '../../../constants/transaction.js';

const STATUS_MAP = {
  success: TRANSACTION_STATUS.SUCCESS,
  SUCCESS: TRANSACTION_STATUS.SUCCESS,
  failure: TRANSACTION_STATUS.FAILED,
  FAILURE: TRANSACTION_STATUS.FAILED,
  failed: TRANSACTION_STATUS.FAILED,
  FAILED: TRANSACTION_STATUS.FAILED,
  pending: TRANSACTION_STATUS.PENDING,
  PENDING: TRANSACTION_STATUS.PENDING,
  processing: TRANSACTION_STATUS.PROCESSING,
};

function buildMessage(raw) {
  const parts = [raw.message ?? raw.msg, raw.remark].filter(Boolean);
  return parts.join(' — ');
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
    const internalStatus = STATUS_MAP[raw.status] ?? TRANSACTION_STATUS.FAILED;

    const providerTxnId =
      (raw.recharge_id ? String(raw.recharge_id) : null) ||
      (raw.txid ? String(raw.txid) : null) ||
      null;

    const operatorRef =
      (raw.txid && raw.recharge_id && String(raw.txid) !== String(raw.recharge_id)
        ? String(raw.txid)
        : null) ||
      raw.opref?.toString() ||
      raw.operator_ref?.toString() ||
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

    const internalStatus = STATUS_MAP[raw.status] ?? TRANSACTION_STATUS.PENDING;

    const providerTxnId =
      (raw.recharge_id ? String(raw.recharge_id) : null) ||
      (raw.txid ? String(raw.txid) : null) ||
      null;

    const operatorRef =
      (raw.txid && raw.recharge_id && String(raw.txid) !== String(raw.recharge_id)
        ? String(raw.txid)
        : null) ||
      raw.opref?.toString() ||
      raw.operator_ref?.toString() ||
      null;

    return {
      status: internalStatus,
      providerStatus: String(raw.status ?? '').toLowerCase(),
      providerTxnId,
      operatorRef,
      message: buildMessage(raw),
    };
  },
};
