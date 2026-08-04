import { mroboticsRequest } from './client.js';
import { mapperService } from './mapper.service.js';

export const mroboticsRefundService = {
  async requestRefund({ clientTxnId }) {
    const raw = await mroboticsRequest({
      method: 'GET',
      endpoint: '/api/order_id_status',
      data: { order_id: clientTxnId },
      correlationId: clientTxnId,
    });

    return mapperService.mapRefundResponse(raw);
  },
};
