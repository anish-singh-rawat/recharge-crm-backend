import crypto from 'crypto';
import env from '../../../config/env.js';

export const signatureService = {
  generate(params = {}) {
    const secret = env.mrobotics.apiSecret;
    const memberId = env.mrobotics.memberId;


    const sortedKeys = Object.keys(params).sort();
    const sigString = [memberId, ...sortedKeys.map((k) => params[k])].join('|');

    return crypto
      .createHmac('sha256', secret)
      .update(sigString)
      .digest('hex');
  },

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
