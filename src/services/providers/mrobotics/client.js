import axios from 'axios';
import https from 'https';
import env from '../../../config/env.js';
import { providerLogger } from '../../../config/logger.js';
import { ApiLog } from '../../../models/index.js';
import { MRoboticsError, MRoboticsTimeoutError } from './errors.js';

const axiosInstance = axios.create({
  baseURL: 'https://mrobotics.in',
  timeout: env.mrobotics.timeoutMs,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  httpsAgent: new https.Agent({ rejectUnauthorized: false }),
});

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      throw new MRoboticsTimeoutError();
    }
    throw error;
  },
);

export const mroboticsRequest = async ({ method = 'POST', endpoint, data = {}, correlationId = null }) => {
  const startTime = Date.now();
  const payload = { api_token: env.mrobotics.apiKey, ...data };

  let rawResponse = null;
  let isError = false;
  let errorMessage = '';

  try {
    const response = await axiosInstance.request({
      method,
      url: endpoint,
      validateStatus: () => true,
      ...(method === 'GET' ? { params: payload } : { data: payload }),
    });

    rawResponse = response.data;

    providerLogger.info('MRobotics response', { endpoint, duration: Date.now() - startTime });
    return rawResponse;
  } catch (err) {
    isError = true;
    errorMessage = err.message;
    providerLogger.error('MRobotics request failed', { endpoint, error: err.message });
    throw err;
  } finally {
    ApiLog.create({
      requestId: `MROBOTICS-${Date.now()}`,
      correlationId,
      method,
      url: `https://mrobotics.in${endpoint}`,
      statusCode: rawResponse ? 200 : null,
      responseTime: Date.now() - startTime,
      isError,
      errorMessage,
      provider: 'MROBOTICS',
      providerEndpoint: endpoint,
    }).catch(() => {});
  }
};
