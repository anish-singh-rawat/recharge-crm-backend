import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import env from '../../../config/env.js';
import { providerLogger } from '../../../config/logger.js';
import { ApiLog } from '../../../models/index.js';
import { retryWithBackoff } from '../../../utils/async.util.js';
import {
  MRoboticsError,
  MRoboticsAuthError,
  MRoboticsTimeoutError,
} from './errors.js';

const axiosInstance = axios.create({
  baseURL: env.mrobotics.baseUrl,
  timeout: env.mrobotics.timeoutMs,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-Member-ID': env.mrobotics.memberId || '',
  },
});

axiosInstance.interceptors.request.use((config) => {
  config.headers['X-Request-ID'] = uuidv4();
  config.headers['X-API-Key'] = env.mrobotics.apiKey || '';
  config.metadata = { startTime: Date.now() };
  return config;
});

axiosInstance.interceptors.response.use(
  (response) => {
    const duration = Date.now() - (response.config.metadata?.startTime || Date.now());
    providerLogger.info('MRobotics response', {
      url: response.config.url,
      status: response.status,
      duration,
    });
    return response;
  },
  (error) => {
    const duration = error.config?.metadata
      ? Date.now() - error.config.metadata.startTime
      : 0;

    providerLogger.error('MRobotics request failed', {
      url: error.config?.url,
      status: error.response?.status,
      message: error.message,
      duration,
    });

    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      throw new MRoboticsTimeoutError();
    }
    if (error.response?.status === 401 || error.response?.status === 403) {
      throw new MRoboticsAuthError();
    }

    throw error;
  },
);

export const mroboticsRequest = async ({
  method = 'POST',
  endpoint,
  data = {},
  params = {},
  correlationId = null,
  retryable = true,
}) => {
  const requestId = uuidv4();
  const startTime = Date.now();

  const doRequest = async () => {
    const response = await axiosInstance.request({
      method,
      url: endpoint,
      data: method !== 'GET' ? data : undefined,
      params: method === 'GET' ? { ...params, ...data } : params,
      headers: {
        'X-Correlation-ID': correlationId || requestId,
      },
    });
    return response.data;
  };

  let rawResponse = null;
  let rawRequest = { endpoint, method, data, params };
  let isError = false;
  let errorMessage = '';

  try {
    rawResponse = await retryWithBackoff(doRequest, {
      maxAttempts: retryable ? env.mrobotics.retryCount : 1,
      initialDelayMs: env.mrobotics.retryDelayMs,
      backoffMultiplier: 2,
      maxDelayMs: 30000,
      onRetry: (err, attempt) => {
        providerLogger.warn('MRobotics retry', {
          endpoint,
          attempt,
          error: err.message,
          correlationId,
        });
      },
    });
    return rawResponse;
  } catch (err) {
    isError = true;
    errorMessage = err.message;
    throw err;
  } finally {
    ApiLog.create({
      requestId,
      correlationId,
      method,
      url: `${env.mrobotics.baseUrl}${endpoint}`,
      statusCode: rawResponse ? 200 : null,
      requestBody: rawRequest,
      responseBody: rawResponse,
      responseTime: Date.now() - startTime,
      isError,
      errorMessage,
      provider: 'MROBOTICS',
      providerEndpoint: endpoint,
    }).catch(() => {});
  }
};
