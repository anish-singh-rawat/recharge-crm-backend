import '../config/env.js';
import axios from 'axios';
import https from 'https';

const API_TOKEN = process.env.MROBOTICS_API_KEY;
const BASE_URL  = 'https://mrobotics.in';

const MOBILE   = '6395607666';
const AMOUNT   = '29';
const ORDER_ID = `${Date.now()}`;

const httpsAgent = new https.Agent({ rejectUnauthorized: false });
const http = axios.create({ baseURL: BASE_URL, httpsAgent, timeout: 30000 });

const run = async () => {
  console.log('\n── operator_balance (shows available operators) ─────────────');
  try {
    const res = await http.get('/api/operator_balance', {
      params: { api_token: API_TOKEN },
    });
    console.log(JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.log(err.response?.status, err.response?.data ?? err.message);
  }

  console.log(`\n── Jio ₹${AMOUNT} recharge → order_id: ${ORDER_ID} ──────────`);
  try {
    const res = await http.post('/api/recharge', {
      api_token:  API_TOKEN,
      mobile_no:  MOBILE,
      amount:     AMOUNT,
      company_id: '3',
      order_id:   ORDER_ID,
      is_stv:     'false',
    }, {
      headers: { 'Content-Type': 'application/json' },
    });
    console.log(JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.log(err.response?.status, JSON.stringify(err.response?.data ?? err.message, null, 2));
  }
};

run();
