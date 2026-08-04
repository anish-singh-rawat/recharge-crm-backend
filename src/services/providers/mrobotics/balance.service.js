import { mroboticsRequest } from './client.js';
import { mapperService } from './mapper.service.js';

export const mroboticsBalanceService = {
  async getBalance() {
    const raw = await mroboticsRequest({
      method: 'GET',
      endpoint: '/api/operator_balance',
      data: {},
    });

    return mapperService.mapBalanceResponse(raw);
  },
};
