import { mroboticsRequest } from './client.js';
import { signatureService } from './signature.service.js';
import env from '../../../config/env.js';
import { providerLogger } from '../../../config/logger.js';

/**
 * MRobotics Auth Service
 *
 * NOTE: Endpoint paths are placeholders. Update MROBOTICS_BASE_URL and endpoint
 * constants below once official API documentation is received.
 *
 * Placeholder endpoint: POST /api/auth/login
 * Expected payload:     { memberId, apiKey, signature, timestamp }
 * Expected response:    { status, token, expiresAt }
 */

// In-memory token cache to avoid re-authenticating on every request
let cachedToken = null;
let tokenExpiresAt = null;

export const mroboticsAuthService = {
  /**
   * Get a valid auth token, refreshing if expired.
   * @returns {string} auth token
   */
  async getToken() {
    if (cachedToken && tokenExpiresAt && new Date(tokenExpiresAt) > new Date(Date.now() + 60000)) {
      return cachedToken;
    }
    return this.login();
  },

  /**
   * Authenticate with MRobotics and cache the token.
   */
  async login() {
    const timestamp = Date.now().toString();
    const signature = signatureService.generate({ timestamp });

    // ─────────────────────────────────────────────────────────────────────────
    // TODO: Replace with actual MRobotics auth endpoint and payload structure
    // once official API documentation is available.
    // ─────────────────────────────────────────────────────────────────────────
    const payload = {
      memberId: env.mrobotics.memberId,
      apiKey: env.mrobotics.apiKey,
      signature,
      timestamp,
    };

    try {
      const response = await mroboticsRequest({
        method: 'POST',
        endpoint: '/api/auth/login',   // PLACEHOLDER — update with actual endpoint
        data: payload,
        retryable: false,
      });

      // PLACEHOLDER response mapping — update when docs available
      cachedToken = response?.token || response?.data?.token || env.mrobotics.apiKey;
      tokenExpiresAt = response?.expiresAt || new Date(Date.now() + 60 * 60 * 1000).toISOString();

      providerLogger.info('MRobotics auth token refreshed');
      return cachedToken;
    } catch (err) {
      providerLogger.warn('MRobotics auth failed — using API key directly', { error: err.message });
      // Fallback: use API key directly (common with many providers)
      cachedToken = env.mrobotics.apiKey;
      tokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      return cachedToken;
    }
  },

  /**
   * Invalidate cached token (call after 401 response).
   */
  invalidate() {
    cachedToken = null;
    tokenExpiresAt = null;
  },
};
