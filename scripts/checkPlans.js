import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

await mongoose.connect(process.env.MONGO_URI, {
  dbName: process.env.MONGO_DB_NAME || 'rechargecrmdb',
  serverSelectionTimeoutMS: 8000,
});

const Plan = mongoose.model('Plan', new mongoose.Schema({}, { strict: false }), 'plans');

const total = await Plan.countDocuments();
console.log('Total plans in DB:', total);

const jioId    = new mongoose.Types.ObjectId('6a6f8d11d8fcb29986f98350');
const circleId = new mongoose.Types.ObjectId('6a6f8d11d8fcb29986f98344');

const jioUWCount = await Plan.countDocuments({ operator: jioId, circle: circleId });
console.log('Jio × UP West plans:', jioUWCount);

const sample = await Plan.find({ operator: jioId, circle: circleId }).sort({ amount: 1 }).limit(5).lean();
sample.forEach((p) => console.log(`  ₹${p.amount} | ${p.validity} | ${p.dataAmount} | popular=${p.isPopular}`));

await mongoose.disconnect();
