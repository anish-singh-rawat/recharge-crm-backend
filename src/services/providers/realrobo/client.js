import axios from 'axios';
import https from 'https';
import env from '../../../config/env.js';
import { providerLogger } from '../../../config/logger.js';

const axiosInstance = axios.create({
  baseURL: env.realrobo.baseUrl,
  timeout: env.realrobo.timeoutMs,
  headers: { Accept: 'application/json' },
  httpsAgent: new https.Agent({ rejectUnauthorized: false }),
});

export const realroboRequest = async ({ endpoint, params = {}, correlationId = null }) => {
  const startTime = Date.now();

  const payload = { api_token: env.realrobo.apiToken, ...params };

  try {
    console.log('\n==============================================');
    console.log('REALROBO REQUEST');
    console.log('==============================================');
    console.log('Base URL :', env.realrobo.baseUrl);
    console.log('Endpoint :', endpoint);
    console.log('Params   :', { ...payload, api_token: payload.api_token ? `${payload.api_token.slice(0, 8)}...` : null });

    const response = await axiosInstance.get(endpoint, { params: payload });
    const raw = response.data;

    console.log('Status   :', response.status);
    console.log('Response :', JSON.stringify(raw, null, 2).slice(0, 1500));
    console.log('==============================================\n');

    providerLogger.info('RealRobo response', {
      endpoint,
      statusCode: response.status,
      duration: Date.now() - startTime,
    });

    return raw;
  } catch (err) {
    const statusCode = err.response?.status ?? null;
    const rawResponse = err.response?.data ?? null;
    const errorMessage =
      rawResponse?.message ||
      (typeof rawResponse?.error === 'string' ? rawResponse.error : null) ||
      err.message ||
      'RealRobo request failed';

    console.log('\n==============================================');
    console.log('REALROBO ERROR');
    console.log('==============================================');
    console.log('Status   :', statusCode);
    console.log('Endpoint :', endpoint);
    console.log('Error    :', errorMessage);
    if (rawResponse) console.log('Response :', JSON.stringify(rawResponse, null, 2).slice(0, 1000));
    console.log('==============================================\n');

    providerLogger.error('RealRobo request failed', { endpoint, statusCode, error: errorMessage });

    const error = new Error(errorMessage);
    error.statusCode = statusCode;
    error.rawResponse = rawResponse;
    error.isRetryable = statusCode === null || statusCode >= 500;
    throw error;
  }
};
