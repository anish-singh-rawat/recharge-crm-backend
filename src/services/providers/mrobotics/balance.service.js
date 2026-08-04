import { mroboticsRequest } from './client.js';
import { mapperService } from './mapper.service.js';

export const mroboticsBalanceService = {
  async getBalance() {
    const raw = await mroboticsRequest({
      method: 'POST',
      endpoint: '/api/operator_balance',
      data: {},
    });

    return mapperService.mapBalanceResponse(raw);
  },

  async getLapuBalance(lapuId) {
    const raw = await mroboticsRequest({
      method: 'POST',
      endpoint: '/api/lapu_balance',
      data: { lapu_id: lapuId },
    });

    return { lapuId, balance: raw?.balance ?? raw?.data ?? 0, raw };
  },
};
