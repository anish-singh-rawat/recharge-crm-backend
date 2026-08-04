import '../config/env.js';
import { connectDB } from '../config/database.js';
import { OperatorMaster } from '../models/index.js';
import logger from '../config/logger.js';

const providerCodeMap = {
  VI:          '1',
  AIRTEL:      '2',
  IDEA:        '3',
  BSNL:        '4',
  JIO:         '5',
  DISHTV:      '6',
  TATASKY:     '7',
  D2H:         '11',
  SUNDIRECT:   '12',
  JIO_POST:    '17',
  AIRTEL_DTH:  '24',
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
