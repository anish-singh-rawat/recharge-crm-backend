import { mroboticsRequest } from './client.js';
import { signatureService } from './signature.service.js';
import { mapperService } from './mapper.service.js';
import env from '../../../config/env.js';

/**
 * MRobotics Plans Service
 *
 * PLACEHOLDER endpoint: GET /api/plans/fetch
 * Update endpoint and field names once official docs are received.
 */
export const mroboticsPlansService = {
  async getPlans({ operatorCode, circleCode }) {
    const timestamp = Date.now().toString();
    const params = {
      memberId: env.mrobotics.memberId,
      operatorCode,
      circleCode,
      timestamp,
    };

    const raw = await mroboticsRequest({
      method: 'GET',
      endpoint: '/api/plans/fetch',     // PLACEHOLDER endpoint
      data: params,
      retryable: true,
    });

    return mapperService.mapPlans(raw);
  },
};
