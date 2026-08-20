import { realroboRequest } from './client.js';
import { realroboMapperService } from './mapper.service.js';
import env from '../../../config/env.js';

export const realroboRechargeService = {
  async doRecharge({ mobileNumber, amount, operatorCode, circleCode = '', txnId, correlationId }) {
    const raw = await realroboRequest({
      endpoint: '/api/recharge',
      params: {
        number:      mobileNumber,
        amount:      String(amount),
        req_id:      txnId,
        operator_id: String(operatorCode),
        state_id:    circleCode || env.realrobo.defaultStateId,
      },
      correlationId,
    });

    return realroboMapperService.mapRechargeResponse(raw);
  },

  async checkStatus(txnId) {
    const raw = await realroboRequest({
      endpoint: '/api/status_check',
      params: { req_id: txnId },
    });

    return realroboMapperService.mapStatusResponse(raw);
  },
};
