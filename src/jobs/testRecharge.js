import '../config/env.js';
import axios from 'axios';
import https from 'https';
import crypto from 'crypto';

const MEMBER_ID  = process.env.MROBOTICS_MEMBER_ID;
const API_KEY    = process.env.MROBOTICS_API_KEY;
const API_SECRET = process.env.MROBOTICS_API_SECRET;

const BASE_URL      = 'https://mrobotics.in';
const MOBILE        = '6395607666';
const AMOUNT        = '29';
const OPERATOR_CODE = 'JIO';
const CIRCLE_CODE   = 'DL';
const CLIENT_TXN_ID = `TEST-${Date.now()}`;

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

const http = axios.create({
  baseURL: BASE_URL,
  httpsAgent,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
});

const generateSignature = (params) => {
  const sortedKeys = Object.keys(params).sort();
  const sigString = [MEMBER_ID, ...sortedKeys.map((k) => params[k])].join('|');
  return crypto.createHmac('sha256', API_SECRET).update(sigString).digest('hex');
};

const tryLogin = async (endpoint, payload) => {
  try {
    const res = await http.post(endpoint, payload);
    return { status: res.status, data: res.data };
  } catch (err) {
    return { status: err.response?.status ?? 'ERR', data: err.response?.data ?? err.message };
  }
};

const tryRechargeWithToken = async (token, tokenField, headerName) => {
  const timestamp = Date.now().toString();
  const signature = generateSignature({
    mobileNumber: MOBILE,
    amount: AMOUNT,
    operatorCode: OPERATOR_CODE,
    txnId: CLIENT_TXN_ID,
    timestamp,
  });

  const payload = {
    memberId: MEMBER_ID,
    mobileNo: MOBILE,
    amount: AMOUNT,
    operatorCode: OPERATOR_CODE,
    circleCode: CIRCLE_CODE,
    clientTxnId: `${CLIENT_TXN_ID}-${Date.now()}`,
    timestamp,
    signature,
    ...(tokenField ? { [tokenField]: token } : {}),
  };

  const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
  if (headerName) headers[headerName] = token;

  try {
    const res = await http.post('/api/recharge/do', payload, { headers });
    return { status: res.status, data: res.data };
  } catch (err) {
    return { status: err.response?.status ?? 'ERR', data: err.response?.data ?? err.message };
  }
};

const run = async () => {
  const timestamp = Date.now().toString();
  const signature = generateSignature({ timestamp });

  console.log('\n── STEP 1: Try login endpoints ──────────────────────────────\n');

  const loginAttempts = [
    ['/api/auth/login',   { memberId: MEMBER_ID, apiKey: API_KEY, signature, timestamp }],
    ['/api/auth/login',   { memberId: MEMBER_ID, apiKey: API_SECRET, signature, timestamp }],
    ['/api/login',        { memberId: MEMBER_ID, apiKey: API_KEY, signature, timestamp }],
    ['/api/v1/auth/login',{ memberId: MEMBER_ID, apiKey: API_KEY, signature, timestamp }],
    ['/api/auth/login',   { username: MEMBER_ID, password: API_SECRET }],
    ['/api/auth/login',   { username: MEMBER_ID, password: API_KEY }],
    ['/api/auth/login',   { memberId: MEMBER_ID, password: API_SECRET, timestamp }],
    ['/api/auth/token',   { memberId: MEMBER_ID, apiKey: API_KEY, timestamp }],
  ];

  let sessionToken = null;

  for (const [ep, payload] of loginAttempts) {
    const result = await tryLogin(ep, payload);
    const preview = typeof result.data === 'string'
      ? result.data.replace(/\s+/g, ' ').slice(0, 80)
      : JSON.stringify(result.data).slice(0, 80);
    console.log(`  [${String(result.status).padEnd(3)}] POST ${ep}`);
    console.log(`         ${preview}\n`);

    if (result.status === 200 && result.data?.token) {
      sessionToken = result.data.token;
      console.log(`  ✓ GOT TOKEN: ${sessionToken}\n`);
      break;
    }
    if (result.status === 200 && result.data?.data?.token) {
      sessionToken = result.data.data.token;
      console.log(`  ✓ GOT TOKEN (nested): ${sessionToken}\n`);
      break;
    }
  }

  if (!sessionToken) {
    console.log('── No token from login. Trying API_SECRET as direct token ──\n');
    sessionToken = API_SECRET;
  }

  console.log('\n── STEP 2: Try recharge with token in different positions ───\n');

  const rechargeAttempts = [
    [sessionToken, 'token',         null,              'body.token'],
    [sessionToken, 'apiToken',      null,              'body.apiToken'],
    [sessionToken, 'access_token',  null,              'body.access_token'],
    [sessionToken, null,            'Authorization',   'header Authorization: <token>'],
    [sessionToken, null,            'X-Auth-Token',    'header X-Auth-Token'],
    [sessionToken, null,            'X-Token',         'header X-Token'],
    [API_KEY,      'token',         null,              'body.token = API_KEY'],
    [API_KEY,      null,            'Authorization',   'header Authorization: API_KEY'],
  ];

  for (const [token, bodyField, header, label] of rechargeAttempts) {
    const result = await tryRechargeWithToken(token, bodyField, header);
    const preview = typeof result.data === 'string'
      ? result.data.replace(/\s+/g, ' ').slice(0, 80)
      : JSON.stringify(result.data).slice(0, 80);
    console.log(`  [${String(result.status).padEnd(3)}] ${label}`);
    console.log(`         ${preview}\n`);

    if (result.status !== 403) {
      console.log(`  ✓ WORKING FORMAT: ${label}`);
      break;
    }
  }
};

run();
