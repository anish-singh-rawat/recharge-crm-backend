import '../config/env.js';
import { connectDB } from '../config/database.js';
import { OperatorMaster, CircleMaster } from '../models/index.js';
import { RECHARGE_TYPE } from '../constants/transaction.js';
import logger from '../config/logger.js';

const circles = [
  { name: 'Andhra Pradesh', code: 'AP', providerCode: 'AP', sortOrder: 1 },
  { name: 'Assam', code: 'AS', providerCode: 'AS', sortOrder: 2 },
  { name: 'Bihar & Jharkhand', code: 'BH', providerCode: 'BH', sortOrder: 3 },
  { name: 'Chennai', code: 'CH', providerCode: 'CH', sortOrder: 4 },
  { name: 'Delhi NCR', code: 'DL', providerCode: 'DL', sortOrder: 5 },
  { name: 'Gujarat', code: 'GJ', providerCode: 'GJ', sortOrder: 6 },
  { name: 'Haryana', code: 'HR', providerCode: 'HR', sortOrder: 7 },
  { name: 'Himachal Pradesh', code: 'HP', providerCode: 'HP', sortOrder: 8 },
  { name: 'Jammu & Kashmir', code: 'JK', providerCode: 'JK', sortOrder: 9 },
  { name: 'Karnataka', code: 'KA', providerCode: 'KA', sortOrder: 10 },
  { name: 'Kerala', code: 'KL', providerCode: 'KL', sortOrder: 11 },
  { name: 'Kolkata', code: 'KO', providerCode: 'KO', sortOrder: 12 },
  { name: 'Madhya Pradesh & Chhattisgarh', code: 'MP', providerCode: 'MP', sortOrder: 13 },
  { name: 'Maharashtra & Goa', code: 'MH', providerCode: 'MH', sortOrder: 14 },
  { name: 'Mumbai', code: 'MU', providerCode: 'MU', sortOrder: 15 },
  { name: 'North East', code: 'NE', providerCode: 'NE', sortOrder: 16 },
  { name: 'Orissa', code: 'OR', providerCode: 'OR', sortOrder: 17 },
  { name: 'Punjab', code: 'PB', providerCode: 'PB', sortOrder: 18 },
  { name: 'Rajasthan', code: 'RJ', providerCode: 'RJ', sortOrder: 19 },
  { name: 'Tamil Nadu', code: 'TN', providerCode: 'TN', sortOrder: 20 },
  { name: 'UP East', code: 'UE', providerCode: 'UE', sortOrder: 21 },
  { name: 'UP West & Uttarakhand', code: 'UW', providerCode: 'UW', sortOrder: 22 },
  { name: 'West Bengal', code: 'WB', providerCode: 'WB', sortOrder: 23 },
];

const operators = [
  { name: 'Vodafone',      code: 'VI',          providerCode: '1',  type: RECHARGE_TYPE.MOBILE_PREPAID,  minAmount: 10,  maxAmount: 5000,  commission: 2,   sortOrder: 1  },
  { name: 'Airtel',        code: 'AIRTEL',       providerCode: '2',  type: RECHARGE_TYPE.MOBILE_PREPAID,  minAmount: 10,  maxAmount: 5000,  commission: 2,   sortOrder: 2  },
  { name: 'Idea',          code: 'IDEA',         providerCode: '3',  type: RECHARGE_TYPE.MOBILE_PREPAID,  minAmount: 10,  maxAmount: 5000,  commission: 2,   sortOrder: 3  },
  { name: 'BSNL',          code: 'BSNL',         providerCode: '4',  type: RECHARGE_TYPE.MOBILE_PREPAID,  minAmount: 10,  maxAmount: 5000,  commission: 2,   sortOrder: 4  },
  { name: 'Jio',           code: 'JIO',          providerCode: '5',  type: RECHARGE_TYPE.MOBILE_PREPAID,  minAmount: 10,  maxAmount: 5000,  commission: 2,   sortOrder: 5  },
  { name: 'Dish TV',       code: 'DISHTV',       providerCode: '6',  type: RECHARGE_TYPE.DTH,             minAmount: 10,  maxAmount: 10000, commission: 1.5, sortOrder: 6  },
  { name: 'Tata Sky',      code: 'TATASKY',      providerCode: '7',  type: RECHARGE_TYPE.DTH,             minAmount: 10,  maxAmount: 10000, commission: 1.5, sortOrder: 7  },
  { name: 'Videocon D2H',  code: 'D2H',          providerCode: '11', type: RECHARGE_TYPE.DTH,             minAmount: 10,  maxAmount: 10000, commission: 1.5, sortOrder: 8  },
  { name: 'Sun Direct',    code: 'SUNDIRECT',    providerCode: '12', type: RECHARGE_TYPE.DTH,             minAmount: 10,  maxAmount: 10000, commission: 1.5, sortOrder: 9  },
  { name: 'Jio Postpaid',  code: 'JIO_POST',     providerCode: '17', type: RECHARGE_TYPE.MOBILE_POSTPAID, minAmount: 100, maxAmount: 10000, commission: 1.5, sortOrder: 10 },
  { name: 'Airtel DTH',    code: 'AIRTEL_DTH',   providerCode: '24', type: RECHARGE_TYPE.DTH,             minAmount: 10,  maxAmount: 10000, commission: 1.5, sortOrder: 11 },
  { name: 'DishTV EasyPay',code: 'DISHTV_EASY',  providerCode: '27', type: RECHARGE_TYPE.DTH,             minAmount: 10,  maxAmount: 10000, commission: 1.5, sortOrder: 12 },
  { name: 'D2H Pay',       code: 'D2H_PAY',      providerCode: '28', type: RECHARGE_TYPE.DTH,             minAmount: 10,  maxAmount: 10000, commission: 1.5, sortOrder: 13 },
];

const seedCircles = async () => {
  let created = 0;
  let skipped = 0;
  for (const circle of circles) {
    const existing = await CircleMaster.findOne({ code: circle.code });
    if (existing) { skipped++; continue; }
    await CircleMaster.create({ ...circle, isActive: true });
    created++;
  }
  logger.info(`Circles seeded: ${created} created, ${skipped} already existed`);
};

const seedOperators = async () => {
  let created = 0;
  let skipped = 0;
  for (const operator of operators) {
    const existing = await OperatorMaster.findOne({ code: operator.code });
    if (existing) { skipped++; continue; }
    await OperatorMaster.create({ ...operator, isActive: true });
    created++;
  }
  logger.info(`Operators seeded: ${created} created, ${skipped} already existed`);
};

const run = async () => {
  await connectDB();
  await seedCircles();
  await seedOperators();
  logger.info('Operator & circle seeding complete');
  process.exit(0);
};

run().catch((err) => {
  logger.error('Operator seed failed', { error: err.message });
  process.exit(1);
});
