import { mroboticsRequest } from './client.js';
import { signatureService } from './signature.service.js';
import { mapperService } from './mapper.service.js';
import env from '../../../config/env.js';

export const mroboticsBalanceService = {
  async getBalance() {
    const timestamp = Date.now().toString();
    const signature = signatureService.generate({ timestamp });

    const params = {
      memberId: env.mrobotics.memberId,
      timestamp,
      signature,
    };

    const raw = await mroboticsRequest({
      method: 'GET',
      endpoint: '/api/account/balance',
      data: params,
      retryable: true,
    });

    return mapperService.mapBalanceResponse(raw);
  },
};
