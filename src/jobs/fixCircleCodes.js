import '../config/env.js';
import { connectDB } from '../config/database.js';
import { CircleMaster } from '../models/index.js';
import logger from '../config/logger.js';

const renames = [
  { oldCode: 'BH', newCode: 'BR', newName: 'Bihar & Jharkhand',  providerCode: 'BR' },
  { oldCode: 'CH', newCode: 'CI', newName: 'Chennai',             providerCode: 'CI' },
];

const newCircles = [
  { name: 'Ghaziabad & Noida', code: 'GB', providerCode: 'GB', sortOrder: 23, isActive: true },
];

const run = async () => {
  await connectDB();

  for (const { oldCode, newCode, newName, providerCode } of renames) {
    const result = await CircleMaster.updateOne(
      { code: oldCode },
      { $set: { code: newCode, name: newName, providerCode } },
    );
    if (result.modifiedCount > 0) {
      logger.info(`Renamed circle ${oldCode} → ${newCode}`);
    }
  }

  for (const circle of newCircles) {
    const exists = await CircleMaster.findOne({ code: circle.code });
    if (!exists) {
      await CircleMaster.create(circle);
      logger.info(`Added circle ${circle.code}`);
    }
  }

  logger.info('Circle codes fixed');
  process.exit(0);
};

run().catch((err) => {
  logger.error(err.message);
  process.exit(1);
});
