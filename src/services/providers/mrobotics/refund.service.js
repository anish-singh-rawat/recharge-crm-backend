import { mroboticsRequest } from './client.js';
import { signatureService } from './signature.service.js';
import { mapperService } from './mapper.service.js';
import env from '../../../config/env.js';

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
      txnId: providerTxnId,
      clientTxnId,
      amount: String(amount),
      reason,
      timestamp,
      signature,
    };

    const raw = await mroboticsRequest({
      method: 'POST',
      endpoint: '/api/recharge/refund',
      data: payload,
      retryable: false,
    });

    return mapperService.mapRefundResponse(raw);
  },
};
