import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import https from 'https';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({
  path: path.resolve(__dirname, '../.env'),
});

const BASE_URL =
  process.env.MROBOTICS_BASE_URL || 'https://mrobotics.in';

const API_KEY = process.env.MROBOTICS_API_KEY;
const MEMBER_ID = process.env.MROBOTICS_MEMBER_ID;

const http = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
  httpsAgent: new https.Agent({
    rejectUnauthorized: false,
  }),
});

async function test() {
  const params = {
    api_token: API_KEY,
    memberId: MEMBER_ID,
    timestamp: Date.now().toString(),
  };

  console.log('\n==============================================');
  console.log('       MROBOTICS CIRCLE TEST');
  console.log('==============================================');

  console.log('Base URL :', BASE_URL);
  console.log('Endpoint : /api/circle/list');

  try {
    const response = await http.get('/api/circle/list', {
      params,
      validateStatus: () => true,
    });

    console.log('\nHTTP STATUS:', response.status);
    console.log(
      'CONTENT TYPE:',
      response.headers['content-type']
    );

    console.log('\nRESPONSE:\n');

    if (typeof response.data === 'string') {
      console.log(response.data.slice(0, 5000));
    } else {
      console.log(
        JSON.stringify(response.data, null, 2)
      );
    }

    console.log('\n==============================================\n');
  } catch (error) {
    console.error('ERROR:', error.message);
  }
}

test();