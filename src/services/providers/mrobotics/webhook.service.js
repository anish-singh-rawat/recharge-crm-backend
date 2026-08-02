import { signatureService } from './signature.service.js';
import { mapperService } from './mapper.service.js';
import { webhookLogRepository } from '../../../repositories/log.repository.js';
import { webhookLogger } from '../../../config/logger.js';

export const mroboticsWebhookService = {
  verifySignature(payload, receivedSignature) {
    if (!receivedSignature) {
      webhookLogger.warn('Webhook received without signature');
      return false;
    }
    return signatureService.verify(receivedSignature, payload);
  },

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

  buildIdempotencyKey(payload) {
    const txnId = payload?.txnId ?? payload?.TxnID ?? payload?.transactionId;
    const status = payload?.status ?? payload?.Status;
    if (!txnId) return null;
    return `${txnId}:${status}`;
  },

  normalise(payload) {
    return mapperService.mapWebhookPayload(payload);
  },

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
