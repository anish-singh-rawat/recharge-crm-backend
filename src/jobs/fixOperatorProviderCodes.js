import '../config/env.js';
import { connectDB } from '../config/database.js';
import { OperatorMaster } from '../models/index.js';
import logger from '../config/logger.js';

const providerCodeMap = {
  AIRTEL:      '1',
  AIRTEL_POST: '2',
  JIO:         '3',
  JIO_POST:    '4',
  VI:          '5',
  VI_POST:     '6',
  BSNL:        '7',
  BSNL_POST:   '8',
  TATASKY:     '9',
  DISHTV:      '10',
  SUNDIRECT:   '11',
  D2H:         '12',
  AIRTEL_DTH:  '13',
};

const run = async () => {
  await connectDB();
  for (const [code, providerCode] of Object.entries(providerCodeMap)) {
    const result = await OperatorMaster.updateOne(
      { code },
      { $set: { providerCode } },
    );
    if (result.modifiedCount > 0) {
      logger.info(`Updated ${code} → providerCode=${providerCode}`);
    }
  }
  logger.info('Done');
  process.exit(0);
};

run().catch((err) => {
  logger.error(err.message);
  process.exit(1);
});
