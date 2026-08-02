import { mroboticsRequest } from './client.js';
import { signatureService } from './signature.service.js';
import { mapperService } from './mapper.service.js';
import env from '../../../config/env.js';

export const mroboticsRechargeService = {
  async doRecharge({ mobileNumber, amount, operatorCode, circleCode = '', txnId, correlationId, type }) {
    const timestamp = Date.now().toString();
    const signature = signatureService.generate({
      mobileNumber,
      amount: String(amount),
      operatorCode,
      txnId,
      timestamp,
    });


    const payload = {
      memberId: env.mrobotics.memberId,
      mobileNo: mobileNumber,
      amount: String(amount),
      operatorCode,
      circleCode,
      type,
      clientTxnId: txnId,
      timestamp,
      signature,
    };

    const raw = await mroboticsRequest({
      method: 'POST',
      endpoint: '/api/recharge/do',
      data: payload,
      correlationId,
      retryable: false,
    });

    const result = mapperService.mapRechargeResponse(raw);
    result.rawRequest = payload;
    return result;
  },

  async checkStatus(providerTxnId, clientTxnId = null) {
    const timestamp = Date.now().toString();


    const params = {
      memberId: env.mrobotics.memberId,
      txnId: providerTxnId ?? clientTxnId,
      clientTxnId,
      timestamp,
    };

    const raw = await mroboticsRequest({
      method: 'GET',
      endpoint: '/api/recharge/status',
      data: params,
      correlationId: clientTxnId,
      retryable: true,
    });

    return mapperService.mapStatusResponse(raw);
  },
};
