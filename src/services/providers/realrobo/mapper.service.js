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

    return {
      status: internalStatus,
      providerStatus,
      providerTxnId: raw.txid?.toString() ?? null,
      mroboticsRcId: raw.txid?.toString() ?? null,
      operatorRef: raw.req_id?.toString() ?? null,
      message: raw.message ?? raw.msg ?? '',
      balance: raw.lapu_balance ?? null,
      lapuNo: raw.lapu?.lapu_no ?? null,
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

    return {
      status: internalStatus,
      providerStatus: String(raw.status ?? '').toLowerCase(),
      providerTxnId: raw.txid?.toString() ?? null,
      message: raw.message ?? raw.msg ?? '',
    };
  },
};
