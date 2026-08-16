import { mroboticsRequest } from './client.js';
import { mapperService } from './mapper.service.js';
import env from '../../../config/env.js';

export const mroboticsPlansService = {
  async getPlans({ operatorCode, circleCode }) {
    if (!operatorCode) {
      throw new Error('operatorCode is required');
    }

    if (!circleCode) {
      throw new Error('circleCode is required');
    }

    const timestamp = Date.now().toString();

    const raw = await mroboticsRequest({
      method: 'GET',
      endpoint: '/api/plans/fetch',

      data: {
        memberId: env.mrobotics.memberId,
        operatorCode,
        circleCode,
        timestamp,
      },

      correlationId: `PLAN-${Date.now()}`,
    });

    return mapperService.mapPlans(raw);
  },
};