import { mroboticsRequest } from './client.js';
import { mapperService } from './mapper.service.js';

export const mroboticsRechargeService = {
  async doRecharge({ mobileNumber, amount, operatorCode, circleCode = '', txnId, correlationId, type }) {
    const raw = await mroboticsRequest({
      method: 'POST',
      endpoint: '/api/recharge',
      data: {
        mobile_no:  mobileNumber,
        amount:     String(amount),
        company_id: operatorCode,
        order_id:   txnId,
        is_stv:     'false',
      },
      correlationId,
    });

    return mapperService.mapRechargeResponse(raw);
  },

  async checkStatus(txnId) {
    const raw = await mroboticsRequest({
      method: 'GET',
      endpoint: '/api/order_id_status',
      data: { order_id: txnId },
      correlationId: txnId,
    });

    return mapperService.mapStatusResponse(raw);
  },
};
