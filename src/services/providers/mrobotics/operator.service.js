import { mroboticsRequest } from './client.js';
import { signatureService } from './signature.service.js';
import { mapperService } from './mapper.service.js';
import env from '../../../config/env.js';

/**
 * MRobotics Operator Service
 *
 * PLACEHOLDER endpoint: GET /api/operator/list
 * Update endpoint and field names once official docs are received.
 */
export const mroboticsOperatorService = {
  async getOperators(type = null) {
    const timestamp = Date.now().toString();
    const params = {
      memberId: env.mrobotics.memberId,
      type,
      timestamp,
    };

    const raw = await mroboticsRequest({
      method: 'GET',
      endpoint: '/api/operator/list',   // PLACEHOLDER endpoint
      data: params,
      retryable: true,
    });

    return mapperService.mapOperatorList(raw);
  },

  /**
   * Detect operator for a given mobile number.
   * PLACEHOLDER: GET /api/operator/detect
   */
  async detectOperator(mobileNumber) {
    const timestamp = Date.now().toString();
    const params = {
      memberId: env.mrobotics.memberId,
      mobileNo: mobileNumber,
      timestamp,
    };

    const raw = await mroboticsRequest({
      method: 'GET',
      endpoint: '/api/operator/detect', // PLACEHOLDER endpoint
      data: params,
      retryable: true,
    });

    return {
      operatorCode: raw?.operatorCode ?? raw?.code ?? null,
      operatorName: raw?.operatorName ?? raw?.name ?? null,
      circleCode: raw?.circleCode ?? raw?.circle ?? null,
      raw,
    };
  },
};
