import axios from 'axios';
import https from 'https';
import env from '../../../config/env.js';
import { providerLogger } from '../../../config/logger.js';
import { MRoboticsError, MRoboticsTimeoutError } from './errors.js';

const BASE_URL = env.mrobotics.baseUrl;

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: env.mrobotics.timeoutMs,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  httpsAgent: new https.Agent({
    rejectUnauthorized: false,
  }),
});

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.code === 'ECONNABORTED' ||
      error.message?.includes('timeout')
    ) {
      throw new MRoboticsTimeoutError();
    }

    throw error;
  },
);

export const mroboticsRequest = async ({
  method = 'POST',
  endpoint,
  data = {},
  correlationId = null,
}) => {
  const startTime = Date.now();

  const payload = {
    api_token: env.mrobotics.apiKey,
    ...data,
  };

  let rawResponse = null;
  let statusCode = null;
  let isError = false;
  let errorMessage = '';

  try {
    console.log('\n==============================================');
    console.log('MROBOTICS REQUEST');
    console.log('==============================================');
    console.log('Base URL :', BASE_URL);
    console.log('Method   :', method);
    console.log('Endpoint :', endpoint);
    console.log('Payload  :', {
      ...payload,
      api_token: payload.api_token
        ? `${payload.api_token.slice(0, 8)}...`
        : null,
    });

    const response = await axiosInstance.request({
      method,
      url: endpoint,

      // IMPORTANT:
      // Axios will automatically throw for 4xx / 5xx.
      ...(method.toUpperCase() === 'GET'
        ? { params: payload }
        : { data: payload }),
    });

    rawResponse = response.data;
    statusCode = response.status;

    console.log('Status   :', statusCode);
    console.log(
      'Response :',
      typeof rawResponse === 'string'
        ? rawResponse.slice(0, 500)
        : JSON.stringify(rawResponse, null, 2).slice(0, 2000),
    );

    console.log('==============================================\n');

    providerLogger.info('MRobotics response', {
      endpoint,
      statusCode,
      duration: Date.now() - startTime,
    });

    return rawResponse;
  } catch (err) {
    isError = true;
    statusCode = err.response?.status ?? null;

    rawResponse = err.response?.data ?? null;

    errorMessage =
      err.response?.data?.errorMessage ||
      err.response?.data?.message ||
      (typeof err.response?.data?.error === 'string' ? err.response.data.error : null) ||
      err.message ||
      'MRobotics request failed';

    console.log('\n==============================================');
    console.log('MROBOTICS ERROR');
    console.log('==============================================');
    console.log('Status   :', statusCode);
    console.log('Endpoint :', endpoint);
    console.log('Error    :', errorMessage);

    if (rawResponse) {
      console.log(
        'Response :',
        typeof rawResponse === 'string'
          ? rawResponse.slice(0, 1000)
          : JSON.stringify(rawResponse, null, 2).slice(0, 2000),
      );
    }

    console.log('==============================================\n');

    providerLogger.error('MRobotics request failed', {
      endpoint,
      statusCode,
      error: errorMessage,
    });

    throw new MRoboticsError(
      errorMessage,
      rawResponse,
      statusCode,
    );
  }
};