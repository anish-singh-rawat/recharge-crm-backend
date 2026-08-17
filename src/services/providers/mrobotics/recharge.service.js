import { mroboticsRequest } from './client.js';
import { mapperService } from './mapper.service.js';

const getIsStv = (operatorCode, type) => {
  if (operatorCode === '4') return type === 'MOBILE_PREPAID' ? 'false' : 'true';
  return 'false';
};

export const mroboticsRechargeService = {
  async doRecharge({ mobileNumber, amount, operatorCode, circleCode = '', txnId, correlationId, type }) {
    const data = {
      mobile_no:  mobileNumber,
      amount:     String(amount),
      company_id: String(operatorCode),
      order_id:   txnId,
      is_stv:     getIsStv(String(operatorCode), type),
    };

    const raw = await mroboticsRequest({
      method: 'POST',
      endpoint: '/api/recharge',
      data,
      correlationId,
    });

    return mapperService.mapRechargeResponse(raw);
  },

  async checkStatus(txnId) {
    const raw = await mroboticsRequest({
      method: 'POST',
      endpoint: '/api/order_id_status',
      data: { order_id: txnId },
      correlationId: txnId,
    });

    return mapperService.mapStatusResponse(raw);
  },
};
