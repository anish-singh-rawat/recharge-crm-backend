import { realroboMapperService } from './mapper.service.js';
import { webhookLogRepository } from '../../../repositories/log.repository.js';
import { webhookLogger } from '../../../config/logger.js';

export const realroboWebhookService = {
  async checkDuplicate(payload) {
    const idempotencyKey = this.buildIdempotencyKey(payload);
    if (!idempotencyKey) return { isDuplicate: false, existingLog: null };

    const existing = await webhookLogRepository.findByIdempotencyKey(idempotencyKey);
    if (existing && existing.isProcessed) {
      webhookLogger.warn('Duplicate RealRobo webhook detected', { idempotencyKey });
      return { isDuplicate: true, existingLog: existing };
    }
    return { isDuplicate: false, existingLog: null };
  },

  buildIdempotencyKey(payload) {
    const txnId =
      payload?.req_id ??
      payload?.txid ??
      payload?.recharge_id ??
      payload?.order_id ??
      payload?.clientTxnId;
    const status = payload?.status ?? payload?.Status;
    if (!txnId) return null;
    return `REALROBO:${txnId}:${status}`;
  },

  normalise(payload) {
    return realroboMapperService.mapWebhookPayload(payload);
  },

  async logWebhook({ provider = 'REALROBO', payload, headers, signature = '', ipAddress, isVerified = true }) {
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
