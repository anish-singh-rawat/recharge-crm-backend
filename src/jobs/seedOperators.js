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
  { name: 'Airtel', code: 'AIRTEL', providerCode: 'AIRTEL', type: RECHARGE_TYPE.MOBILE_PREPAID, minAmount: 10, maxAmount: 5000, commission: 2, sortOrder: 1 },
  { name: 'Airtel Postpaid', code: 'AIRTEL_POST', providerCode: 'AIRTEL_POST', type: RECHARGE_TYPE.MOBILE_POSTPAID, minAmount: 100, maxAmount: 10000, commission: 1.5, sortOrder: 2 },
  { name: 'Jio', code: 'JIO', providerCode: 'JIO', type: RECHARGE_TYPE.MOBILE_PREPAID, minAmount: 10, maxAmount: 5000, commission: 2, sortOrder: 3 },
  { name: 'Jio Postpaid', code: 'JIO_POST', providerCode: 'JIO_POST', type: RECHARGE_TYPE.MOBILE_POSTPAID, minAmount: 100, maxAmount: 10000, commission: 1.5, sortOrder: 4 },
  { name: 'Vi (Vodafone Idea)', code: 'VI', providerCode: 'VI', type: RECHARGE_TYPE.MOBILE_PREPAID, minAmount: 10, maxAmount: 5000, commission: 2, sortOrder: 5 },
  { name: 'Vi Postpaid', code: 'VI_POST', providerCode: 'VI_POST', type: RECHARGE_TYPE.MOBILE_POSTPAID, minAmount: 100, maxAmount: 10000, commission: 1.5, sortOrder: 6 },
  { name: 'BSNL', code: 'BSNL', providerCode: 'BSNL', type: RECHARGE_TYPE.MOBILE_PREPAID, minAmount: 10, maxAmount: 5000, commission: 2, sortOrder: 7 },
  { name: 'BSNL Postpaid', code: 'BSNL_POST', providerCode: 'BSNL_POST', type: RECHARGE_TYPE.MOBILE_POSTPAID, minAmount: 100, maxAmount: 10000, commission: 1.5, sortOrder: 8 },
  { name: 'Tata Sky DTH', code: 'TATASKY', providerCode: 'TATASKY', type: RECHARGE_TYPE.DTH, minAmount: 10, maxAmount: 10000, commission: 1.5, sortOrder: 9 },
  { name: 'Dish TV', code: 'DISHTV', providerCode: 'DISHTV', type: RECHARGE_TYPE.DTH, minAmount: 10, maxAmount: 10000, commission: 1.5, sortOrder: 10 },
  { name: 'Sun Direct', code: 'SUNDIRECT', providerCode: 'SUNDIRECT', type: RECHARGE_TYPE.DTH, minAmount: 10, maxAmount: 10000, commission: 1.5, sortOrder: 11 },
  { name: 'Videocon D2H', code: 'D2H', providerCode: 'D2H', type: RECHARGE_TYPE.DTH, minAmount: 10, maxAmount: 10000, commission: 1.5, sortOrder: 12 },
  { name: 'Airtel DTH', code: 'AIRTEL_DTH', providerCode: 'AIRTEL_DTH', type: RECHARGE_TYPE.DTH, minAmount: 10, maxAmount: 10000, commission: 1.5, sortOrder: 13 },
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
