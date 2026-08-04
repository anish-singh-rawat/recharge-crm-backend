import '../config/env.js';
import axios from 'axios';
import https from 'https';

const API_TOKEN = process.env.MROBOTICS_API_KEY;
const BASE_URL  = 'https://mrobotics.in';

const MOBILE = '9915884369';
const AMOUNT = '20';

const COMPANY_IDS = {
  Vodafone:     '1',
  Airtel:       '2',
  Idea:         '3',
  BSNL:         '4',
  Jio:          '5',
  DishTV:       '6',
  TataSky:      '7',
  VideoconD2H:  '11',
  SunDirect:    '12',
  JioPostpaid:  '17',
  AirtelDTH:    '24',
  DishTVEasy:   '27',
  D2HPay:       '28',
};

const httpsAgent = new https.Agent({ rejectUnauthorized: false });
const http = axios.create({ baseURL: BASE_URL, httpsAgent, timeout: 30000 });

const tryRecharge = async (companyId, label) => {
  const orderId = `TEST-${Date.now()}-${companyId}`;
  try {
    const res = await http.post('/api/recharge', {
      api_token:  API_TOKEN,
      mobile_no:  MOBILE,
      amount:     AMOUNT,
      company_id: String(companyId),
      order_id:   orderId,
      is_stv:     'false',
    }, { headers: { 'Content-Type': 'application/json' } });
    return res.data;
  } catch (err) {
    return err.response?.data ?? err.message;
  }
};

const run = async () => {
  console.log(`\nMobile  : ${MOBILE}`);
  console.log(`Amount  : ₹${AMOUNT}`);
  console.log(`Token   : ${API_TOKEN}\n`);
  console.log('─'.repeat(60));

  for (const [label, companyId] of Object.entries(COMPANY_IDS)) {
    const result = await tryRecharge(companyId, label);
    const msg = result?.errorMessage ?? result?.response ?? result?.status ?? JSON.stringify(result);
    const status = result?.status ?? 'error';
    const marker = status === 'success' ? '✓' : status === 'pending' ? '~' : '✗';
    console.log(`  [${marker}] ${label.padEnd(14)} company_id=${companyId.padEnd(3)}  ${msg}`);

    if (status === 'success' || status === 'pending') {
      console.log('\n── FULL RESPONSE ────────────────────────────');
      console.log(JSON.stringify(result, null, 2));
      break;
    }

    await new Promise(r => setTimeout(r, 300));
  }
};

run();
