import axios from 'axios';
import https from 'https';
import crypto from 'crypto';
import env from '../../../config/env.js';
import { providerLogger } from '../../../config/logger.js';

const axiosInstance = axios.create({
  baseURL: env.eko.baseUrl,
  timeout: env.eko.timeoutMs,
  headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
  httpsAgent: new https.Agent({ rejectUnauthorized: false }),
});

function buildSecretKey(timestamp) {
  const hmac = crypto.createHmac('sha256', env.eko.secretKey);
  hmac.update(timestamp);
  return Buffer.from(hmac.digest()).toString('base64');
}

export async function ekoRequest({ endpoint, params = {} }) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const secretKey = buildSecretKey(timestamp);

  const startTime = Date.now();

  try {
    const response = await axiosInstance.get(endpoint, {
      params: {
        initiator_id: env.eko.initiatorId,
        user_code: env.eko.userCode,
        ...params,
      },
      headers: {
        developer_key: env.eko.developerKey,
        'secret-key': secretKey,
        'secret-key-timestamp': timestamp,
      },
    });

    providerLogger.info('Eko response', {
      endpoint,
      status: response.status,
      duration: Date.now() - startTime,
    });

    return response.data;
  } catch (err) {
    providerLogger.error('Eko request failed', {
      endpoint,
      error: err.message,
      duration: Date.now() - startTime,
    });
    throw err;
  }
}
