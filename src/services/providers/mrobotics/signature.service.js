import crypto from 'crypto';
import env from '../../../config/env.js';

/**
 * MRobotics Signature Service
 *
 * NOTE: Official MRobotics API documentation was not available at implementation time.
 * The signature algorithm below uses HMAC-SHA256 as a common industry pattern.
 * Replace the signing logic here once official docs are received — no other files need changes.
 *
 * Typical MRobotics-style signature:
 *   signature = HMAC-SHA256(apiSecret, "memberId|txnId|amount|timestamp")
 */
export const signatureService = {
  /**
   * Generate request signature.
   * @param {object} params  Request parameters to sign
   * @returns {string} hex signature
   */
  generate(params = {}) {
    const secret = env.mrobotics.apiSecret;
    const memberId = env.mrobotics.memberId;

    // Deterministic string: sort keys and join values
    // TODO: Replace with official MRobotics signing spec when available
    const sortedKeys = Object.keys(params).sort();
    const sigString = [memberId, ...sortedKeys.map((k) => params[k])].join('|');

    return crypto
      .createHmac('sha256', secret)
      .update(sigString)
      .digest('hex');
  },

  /**
   * Verify an incoming webhook signature from MRobotics.
   * @param {string} receivedSignature
   * @param {object} payload
   * @returns {boolean}
   */
  verify(receivedSignature, payload = {}) {
    const expected = this.generate(payload);
    try {
      return crypto.timingSafeEqual(
        Buffer.from(expected, 'hex'),
        Buffer.from(receivedSignature, 'hex'),
      );
    } catch {
      return false;
    }
  },
};
