import { TRANSACTION_STATUS } from '../../../constants/transaction.js';

const STATUS_MAP = {
  success:  TRANSACTION_STATUS.SUCCESS,
  failure:  TRANSACTION_STATUS.FAILED,
  failed:   TRANSACTION_STATUS.FAILED,
  pending:  TRANSACTION_STATUS.PENDING,
  refunded: TRANSACTION_STATUS.REFUNDED,
};

export const mapperService = {
  mapRechargeResponse(raw) {
    if (!raw) {
      return {
        status:        TRANSACTION_STATUS.FAILED,
        providerStatus: null,
        providerTxnId: null,
        operatorRef:   null,
        message:       'Empty response from provider',
        responseCode:  null,
        rawResponse:   raw,
      };
    }

    const isErrorResponse = raw.error === true;
    const providerStatus = isErrorResponse
      ? 'failure'
      : String(raw.status ?? '').toLowerCase();
    const internalStatus = STATUS_MAP[providerStatus] ?? TRANSACTION_STATUS.PENDING;

    return {
      status:        internalStatus,
      providerStatus,
      providerTxnId: raw.tnx_id ?? raw.id?.toString() ?? null,
      operatorRef:   raw.lapu_id?.toString() ?? null,
      message:       typeof raw.response === 'string' ? (() => { try { const p = JSON.parse(raw.response); return p.responseMessage ?? raw.response; } catch { return raw.response; } })() : (raw.response ?? raw.errorMessage ?? ''),
      balance:       raw.balance ?? null,
      rawResponse:   raw,
    };
  },

  mapStatusResponse(raw) {
    return this.mapRechargeResponse(raw);
  },

  mapBalanceResponse(raw) {
    const data = raw?.data ?? raw ?? {};
    const total = Object.values(data).reduce((sum, v) => sum + (parseFloat(v) || 0), 0);
    return {
      balance:  total,
      currency: 'INR',
      detail:   data,
      raw,
    };
  },

  mapOperatorList(raw) {
    const data = raw?.data ?? {};
    return Object.keys(data).map((name) => ({
      providerCode: name,
      name,
      balance: parseFloat(data[name]) || 0,
    }));
  },

  mapPlans(raw) {
    const list = raw?.plans ?? raw?.data ?? raw ?? [];
    return Array.isArray(list)
      ? list.map((p) => ({
          amount:      parseFloat(p.amount ?? p.rs ?? 0),
          talktime:    parseFloat(p.talktime ?? 0),
          validity:    p.validity ?? '',
          description: p.desc ?? p.description ?? '',
          dataAmount:  p.data ?? '',
          smsCount:    parseInt(p.sms ?? 0, 10),
        }))
      : [];
  },

  mapCircleList(raw) {
    const list = raw?.circles ?? raw?.data ?? raw ?? [];
    return Array.isArray(list)
      ? list.map((c) => ({
          providerCode: c.code ?? c.circleCode ?? '',
          name:         c.name ?? c.circleName ?? '',
        }))
      : [];
  },

  mapRefundResponse(raw) {
    const status = String(raw?.status ?? '').toLowerCase();
    return {
      success:      status === 'success',
      refundTxnId:  raw?.tnx_id ?? null,
      message:      raw?.response ?? raw?.errorMessage ?? '',
      raw,
    };
  },

  mapWebhookPayload(payload) {
    const providerStatus = String(payload.status ?? '').toLowerCase();
    const internalStatus = STATUS_MAP[providerStatus] ?? TRANSACTION_STATUS.PENDING;
    return {
      internalStatus,
      providerStatus,
      providerTxnId: payload.tnx_id ?? payload.id?.toString() ?? null,
      internalTxnId: payload.order_id ?? payload.clientTxnId ?? null,
      operatorRef:   payload.lapu_id?.toString() ?? null,
      message:       payload.response ?? payload.errorMessage ?? '',
      raw:           payload,
    };
  },
};
