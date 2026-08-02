import { mroboticsRequest } from './client.js';
import { signatureService } from './signature.service.js';
import env from '../../../config/env.js';
import { providerLogger } from '../../../config/logger.js';


let cachedToken = null;
let tokenExpiresAt = null;

export const mroboticsAuthService = {
  async getToken() {
    if (cachedToken && tokenExpiresAt && new Date(tokenExpiresAt) > new Date(Date.now() + 60000)) {
      return cachedToken;
    }
    return this.login();
  },

  async login() {
    const timestamp = Date.now().toString();
    const signature = signatureService.generate({ timestamp });


    const payload = {
      memberId: env.mrobotics.memberId,
      apiKey: env.mrobotics.apiKey,
      signature,
      timestamp,
    };

    try {
      const response = await mroboticsRequest({
        method: 'POST',
        endpoint: '/api/auth/login',
        data: payload,
        retryable: false,
      });


      cachedToken = response?.token || response?.data?.token || env.mrobotics.apiKey;
      tokenExpiresAt = response?.expiresAt || new Date(Date.now() + 60 * 60 * 1000).toISOString();

      providerLogger.info('MRobotics auth token refreshed');
      return cachedToken;
    } catch (err) {
      providerLogger.warn('MRobotics auth failed — using API key directly', { error: err.message });
      cachedToken = env.mrobotics.apiKey;
      tokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      return cachedToken;
    }
  },

  invalidate() {
    cachedToken = null;
    tokenExpiresAt = null;
  },
};
