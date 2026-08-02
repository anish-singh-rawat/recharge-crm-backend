import { mroboticsRequest } from './client.js';
import { signatureService } from './signature.service.js';
import { mapperService } from './mapper.service.js';
import env from '../../../config/env.js';

/**
 * MRobotics Refund Service
 *
 * PLACEHOLDER endpoint: POST /api/recharge/refund
 * Update endpoint and field names once official docs are received.
 */
export const mroboticsRefundService = {
  async requestRefund({ providerTxnId, clientTxnId, amount, reason = '' }) {
    const timestamp = Date.now().toString();
    const signature = signatureService.generate({
      providerTxnId,
      clientTxnId,
      amount: String(amount),
      timestamp,
    });

    const payload = {
      memberId: env.mrobotics.memberId,
      txnId: providerTxnId,            // PLACEHOLDER field name
      clientTxnId,
      amount: String(amount),
      reason,
      timestamp,
      signature,
    };

    const raw = await mroboticsRequest({
      method: 'POST',
      endpoint: '/api/recharge/refund', // PLACEHOLDER endpoint
      data: payload,
      retryable: false,
    });

    return mapperService.mapRefundResponse(raw);
  },
};
