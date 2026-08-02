import { mroboticsRequest } from './client.js';
import { signatureService } from './signature.service.js';
import { mapperService } from './mapper.service.js';
import env from '../../../config/env.js';

/**
 * MRobotics Recharge Service
 *
 * Endpoint placeholders — update once official API docs are available:
 *   POST /api/recharge/do      → initiate recharge
 *   GET  /api/recharge/status  → check status by txnId
 *
 * Common payload fields in Indian recharge APIs:
 *   { memberId, mobileNo, amount, operatorCode, circleCode, clientTxnId, signature, timestamp }
 */
export const mroboticsRechargeService = {
  /**
   * Initiate a recharge.
   * @param {object} params
   * @returns {object} normalised recharge result
   */
  async doRecharge({ mobileNumber, amount, operatorCode, circleCode = '', txnId, correlationId, type }) {
    const timestamp = Date.now().toString();
    const signature = signatureService.generate({
      mobileNumber,
      amount: String(amount),
      operatorCode,
      txnId,
      timestamp,
    });

    // ─────────────────────────────────────────────────────────────────────────
    // PLACEHOLDER: Update endpoint path and payload fields once official
    // MRobotics API documentation is received.
    // ─────────────────────────────────────────────────────────────────────────
    const payload = {
      memberId: env.mrobotics.memberId,
      mobileNo: mobileNumber,           // PLACEHOLDER field name
      amount: String(amount),
      operatorCode,                     // PLACEHOLDER field name
      circleCode,                       // PLACEHOLDER field name
      type,
      clientTxnId: txnId,              // PLACEHOLDER field name
      timestamp,
      signature,
    };

    const raw = await mroboticsRequest({
      method: 'POST',
      endpoint: '/api/recharge/do',     // PLACEHOLDER endpoint
      data: payload,
      correlationId,
      retryable: false,                 // Recharge itself must not auto-retry (idempotency)
    });

    const result = mapperService.mapRechargeResponse(raw);
    result.rawRequest = payload;
    return result;
  },

  /**
   * Check recharge status.
   */
  async checkStatus(providerTxnId, clientTxnId = null) {
    const timestamp = Date.now().toString();

    // ─────────────────────────────────────────────────────────────────────────
    // PLACEHOLDER: Update endpoint and field names per official docs.
    // ─────────────────────────────────────────────────────────────────────────
    const params = {
      memberId: env.mrobotics.memberId,
      txnId: providerTxnId ?? clientTxnId,
      clientTxnId,
      timestamp,
    };

    const raw = await mroboticsRequest({
      method: 'GET',
      endpoint: '/api/recharge/status', // PLACEHOLDER endpoint
      data: params,
      correlationId: clientTxnId,
      retryable: true,
    });

    return mapperService.mapStatusResponse(raw);
  },
};
