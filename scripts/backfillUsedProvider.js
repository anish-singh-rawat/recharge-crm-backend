import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

await mongoose.connect(process.env.MONGO_URI, {
  dbName: process.env.MONGO_DB_NAME || 'rechargecrmdb',
  serverSelectionTimeoutMS: 8000,
});

const RechargeTransaction = mongoose.model(
  'RechargeTransaction',
  new mongoose.Schema({}, { strict: false }),
  'rechargetransactions',
);

const result = await RechargeTransaction.updateMany(
  { usedProvider: { $in: [null, undefined, ''] } },
  { $set: { usedProvider: 'mrobotics' } },
);

console.log(`✅ Backfilled ${result.modifiedCount} transactions with usedProvider: 'mrobotics'`);

await mongoose.disconnect();
