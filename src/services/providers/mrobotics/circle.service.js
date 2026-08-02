import { mroboticsRequest } from './client.js';
import { mapperService } from './mapper.service.js';
import env from '../../../config/env.js';

export const mroboticsCircleService = {
  async getCircles() {
    const params = {
      memberId: env.mrobotics.memberId,
      timestamp: Date.now().toString(),
    };

    const raw = await mroboticsRequest({
      method: 'GET',
      endpoint: '/api/circle/list',
      data: params,
      retryable: true,
    });

    return mapperService.mapCircleList(raw);
  },
};
