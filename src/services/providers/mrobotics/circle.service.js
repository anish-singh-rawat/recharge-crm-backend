import { mroboticsRequest } from './client.js';
import { mapperService } from './mapper.service.js';
import env from '../../../config/env.js';

/**
 * MRobotics Circle Service
 *
 * PLACEHOLDER endpoint: GET /api/circle/list
 * Update endpoint and field names once official docs are received.
 */
export const mroboticsCircleService = {
  async getCircles() {
    const params = {
      memberId: env.mrobotics.memberId,
      timestamp: Date.now().toString(),
    };

    const raw = await mroboticsRequest({
      method: 'GET',
      endpoint: '/api/circle/list',     // PLACEHOLDER endpoint
      data: params,
      retryable: true,
    });

    return mapperService.mapCircleList(raw);
  },
};
