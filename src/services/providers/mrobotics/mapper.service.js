import { TRANSACTION_STATUS } from '../../../constants/transaction.js';
import { MROBOTICS_STATUS, MROBOTICS_STATUS_MAP } from '../../../constants/provider.js';

/**
 * MRobotics Response Mapper
 *
 * Maps raw provider API responses to internal normalised format.
 * All mappings are placeholders — update field paths once official
 * MRobotics API documentation is received. No other layer needs changing.
 */
export const mapperService = {
  /**
   * Map a recharge API response to internal format.
   * @param {object} raw  Raw MRobotics response
   * @returns {object}
   */
  mapRechargeResponse(raw) {
    if (!raw) {
      return {
        status: TRANSACTION_STATUS.FAILED,
        providerStatus: null,
        providerTxnId: null,
        operatorRef: null,
        message: 'Empty response from provider',
        responseCode: null,
        rawResponse: raw,
        rawRequest: null,
      };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PLACEHOLDER field mappings — update these paths with official MRobotics
    // response field names once documentation is available.
    //
    // Common field name variations seen in Indian recharge APIs:
    //   status: raw.status | raw.Status | raw.statusCode | raw.RespCode
    //   txnId:  raw.txnId  | raw.TxnID  | raw.OperatorId | raw.refId
    //   message: raw.message | raw.Msg | raw.ResponseMsg
    // ─────────────────────────────────────────────────────────────────────────
    const providerStatus = String(
      raw.status ?? raw.Status ?? raw.statusCode ?? raw.RespCode ?? '',
    );
    const internalStatus = MROBOTICS_STATUS_MAP[providerStatus] || TRANSACTION_STATUS.PENDING;

    return {
      status: internalStatus,
      providerStatus,
      providerTxnId: raw.txnId ?? raw.TxnID ?? raw.transactionId ?? raw.refId ?? null,
      operatorRef: raw.operatorRef ?? raw.OperatorRef ?? raw.operatorId ?? null,
      message: raw.message ?? raw.Msg ?? raw.ResponseMsg ?? raw.description ?? '',
      responseCode: raw.responseCode ?? raw.RespCode ?? raw.code ?? providerStatus,
      rawResponse: raw,
      rawRequest: null,
    };
  },

  /**
   * Map a status-check API response to internal format.
   */
  mapStatusResponse(raw) {
    return this.mapRechargeResponse(raw);
  },

  /**
   * Map balance response.
   */
  mapBalanceResponse(raw) {
    return {
      balance: parseFloat(raw?.balance ?? raw?.Balance ?? raw?.amount ?? 0),
      currency: raw?.currency ?? 'INR',
      raw,
    };
  },

  /**
   * Map operator list response.
   */
  mapOperatorList(raw) {
    const list = raw?.operators ?? raw?.data ?? raw ?? [];
    return Array.isArray(list)
      ? list.map((op) => ({
          providerCode: op.code ?? op.Code ?? op.operatorCode ?? '',
          name: op.name ?? op.Name ?? op.operatorName ?? '',
          type: op.type ?? op.Type ?? '',
        }))
      : [];
  },

  /**
   * Map plans response.
   */
  mapPlans(raw) {
    const list = raw?.plans ?? raw?.data ?? raw ?? [];
    return Array.isArray(list)
      ? list.map((p) => ({
          amount: parseFloat(p.amount ?? p.Amount ?? p.rs ?? 0),
          talktime: parseFloat(p.talktime ?? p.Talktime ?? 0),
          validity: p.validity ?? p.Validity ?? '',
          description: p.desc ?? p.description ?? p.Description ?? '',
          dataAmount: p.data ?? p.Data ?? '',
          smsCount: parseInt(p.sms ?? p.SMS ?? 0, 10),
        }))
      : [];
  },

  /**
   * Map circle list response.
   */
  mapCircleList(raw) {
    const list = raw?.circles ?? raw?.data ?? raw ?? [];
    return Array.isArray(list)
      ? list.map((c) => ({
          providerCode: c.code ?? c.Code ?? c.circleCode ?? '',
          name: c.name ?? c.Name ?? c.circleName ?? '',
        }))
      : [];
  },

  /**
   * Map a refund response.
   */
  mapRefundResponse(raw) {
    const providerStatus = String(raw?.status ?? raw?.Status ?? '');
    return {
      success: ['1', 'SUCCESS', 'success'].includes(providerStatus),
      refundTxnId: raw?.txnId ?? raw?.refundId ?? null,
      message: raw?.message ?? raw?.Msg ?? '',
      raw,
    };
  },

  /**
   * Map a webhook payload to internal normalised format.
   */
  mapWebhookPayload(payload) {
    const providerStatus = String(
      payload.status ?? payload.Status ?? payload.statusCode ?? '',
    );
    const internalStatus = MROBOTICS_STATUS_MAP[providerStatus] || TRANSACTION_STATUS.PENDING;

    return {
      internalStatus,
      providerStatus,
      providerTxnId: payload.txnId ?? payload.TxnID ?? payload.transactionId ?? null,
      internalTxnId: payload.refId ?? payload.clientTxnId ?? payload.merchantTxnId ?? null,
      operatorRef: payload.operatorRef ?? payload.OperatorRef ?? null,
      message: payload.message ?? payload.Msg ?? '',
      raw: payload,
    };
  },
};
