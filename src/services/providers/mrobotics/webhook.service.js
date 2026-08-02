import { signatureService } from './signature.service.js';
import { mapperService } from './mapper.service.js';
import { webhookLogRepository } from '../../../repositories/log.repository.js';
import { webhookLogger } from '../../../config/logger.js';

/**
 * MRobotics Webhook Service
 *
 * Handles incoming webhook callbacks from MRobotics.
 * Implements: signature verification, idempotency (duplicate prevention),
 * replay protection, and payload normalisation.
 *
 * NOTE: Signature verification uses the placeholder algorithm in signature.service.js.
 * Update once official MRobotics webhook documentation is available.
 */
export const mroboticsWebhookService = {
  /**
   * Verify webhook signature.
   * @param {object} payload  Raw webhook body
   * @param {string} receivedSignature  From header X-MRobotics-Signature (PLACEHOLDER header name)
   * @returns {boolean}
   */
  verifySignature(payload, receivedSignature) {
    if (!receivedSignature) {
      webhookLogger.warn('Webhook received without signature');
      return false;
    }
    return signatureService.verify(receivedSignature, payload);
  },

  /**
   * Check for duplicate webhook (idempotency).
   * Uses provider txnId + timestamp as idempotency key.
   * @param {object} payload
   * @returns {{ isDuplicate: boolean, existingLog: object|null }}
   */
  async checkDuplicate(payload) {
    const idempotencyKey = this.buildIdempotencyKey(payload);
    if (!idempotencyKey) return { isDuplicate: false, existingLog: null };

    const existing = await webhookLogRepository.findByIdempotencyKey(idempotencyKey);
    if (existing && existing.isProcessed) {
      webhookLogger.warn('Duplicate webhook detected', { idempotencyKey });
      return { isDuplicate: true, existingLog: existing };
    }
    return { isDuplicate: false, existingLog: null };
  },

  /**
   * Build an idempotency key from the webhook payload.
   * PLACEHOLDER: adjust field path to match actual MRobotics webhook structure.
   */
  buildIdempotencyKey(payload) {
    const txnId = payload?.txnId ?? payload?.TxnID ?? payload?.transactionId;
    const status = payload?.status ?? payload?.Status;
    if (!txnId) return null;
    return `${txnId}:${status}`;
  },

  /**
   * Normalise the raw webhook payload.
   */
  normalise(payload) {
    return mapperService.mapWebhookPayload(payload);
  },

  /**
   * Log and persist the incoming webhook.
   */
  async logWebhook({ provider, payload, headers, signature, ipAddress, isVerified }) {
    const idempotencyKey = this.buildIdempotencyKey(payload);
    const mapped = this.normalise(payload);

    return webhookLogRepository.create({
      provider,
      eventType: payload?.event ?? payload?.type ?? 'RECHARGE_STATUS',
      providerTxnId: mapped.providerTxnId,
      internalTxnId: mapped.internalTxnId,
      payload,
      headers,
      signature,
      isVerified,
      isProcessed: false,
      isDuplicate: false,
      ipAddress,
      idempotencyKey,
    });
  },
};
