import { mroboticsRequest } from './client.js';
import { signatureService } from './signature.service.js';
import { mapperService } from './mapper.service.js';
import env from '../../../config/env.js';

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
      endpoint: '/api/plans/fetch',
      data: params,
      retryable: true,
    });

    return mapperService.mapPlans(raw);
  },
};
