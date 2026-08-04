import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

await mongoose.connect(process.env.MONGO_URI, {
  dbName: process.env.MONGO_DB_NAME || 'rechargecrmdb',
});

const OperatorMaster = mongoose.model('OperatorMaster', new mongoose.Schema({}, { strict: false }), 'operatormasters');
const CircleMaster   = mongoose.model('CircleMaster',   new mongoose.Schema({}, { strict: false }), 'circlemasters');
const Plan           = mongoose.model('Plan',           new mongoose.Schema({}, { strict: false }), 'plans');

const PLAN_CATALOGUE = {
  // ── JIO (code: 'JIO') ────────────────────────────────────────────────────
  'JIO': [
    { amount: 19,   validity: '1 Day',    dataAmount: '200MB',       description: '200MB Data, Unlimited Calling, 1 Day',          smsCount: 0,   talktime: 0,    planType: 'DATA'    },
    { amount: 29,   validity: '1 Day',    dataAmount: '1GB',         description: '1GB Data, Unlimited Calling',                   smsCount: 0,   talktime: 0,    planType: 'DATA'    },
    { amount: 49,   validity: '28 Days',  dataAmount: '6GB',         description: '6GB Total Data for 28 Days, Unlimited Calling', smsCount: 0,   talktime: 0,    planType: 'DATA'    },
    { amount: 99,   validity: '28 Days',  dataAmount: '12GB',        description: '12GB Data, Unlimited Calling & SMS',            smsCount: 100, talktime: 0,    planType: 'TOPUP'   },
    { amount: 119,  validity: '28 Days',  dataAmount: '2GB/day',     description: '2GB/day, Unlimited Calling, Jio Apps',          smsCount: 100, talktime: 0,    planType: 'TOPUP',  isPopular: false },
    { amount: 149,  validity: '24 Days',  dataAmount: '1.5GB/day',   description: '1.5GB/day, Unlimited Calling, Jio Apps',        smsCount: 100, talktime: 0,    planType: 'TOPUP'   },
    { amount: 179,  validity: '28 Days',  dataAmount: '1.5GB/day',   description: '1.5GB/day, Unlimited Calling, Jio Apps',        smsCount: 100, talktime: 0,    planType: 'TOPUP'   },
    { amount: 189,  validity: '28 Days',  dataAmount: '1.5GB/day',   description: '1.5GB/day, Unlimited Calling, Jio Apps + JioTV',smsCount: 100, talktime: 0,    planType: 'TOPUP'   },
    { amount: 199,  validity: '28 Days',  dataAmount: '1.5GB/day',   description: '1.5GB/day, Unlimited Calling, Jio Apps',        smsCount: 100, talktime: 0,    planType: 'TOPUP',  isPopular: true  },
    { amount: 209,  validity: '28 Days',  dataAmount: '1.5GB/day',   description: '1.5GB/day, Unlimited Calling, Prime + ZEE5',    smsCount: 100, talktime: 0,    planType: 'TOPUP'   },
    { amount: 239,  validity: '28 Days',  dataAmount: '1.5GB/day',   description: '1.5GB/day, Unlimited Calling, Disney+Hotstar',  smsCount: 100, talktime: 0,    planType: 'TOPUP',  isPopular: true  },
    { amount: 259,  validity: '28 Days',  dataAmount: '2GB/day',     description: '2GB/day, Unlimited Calling, Jio Apps',          smsCount: 100, talktime: 0,    planType: 'TOPUP'   },
    { amount: 299,  validity: '28 Days',  dataAmount: '2GB/day',     description: '2GB/day, Unlimited Calling, Jio Apps + OTT',    smsCount: 100, talktime: 0,    planType: 'TOPUP',  isPopular: true  },
    { amount: 349,  validity: '28 Days',  dataAmount: '2GB/day',     description: '2GB/day, Unlimited Calling, Jio Apps + TV',     smsCount: 100, talktime: 0,    planType: 'TOPUP',  isPopular: true  },
    { amount: 395,  validity: '28 Days',  dataAmount: '2.5GB/day',   description: '2.5GB/day, Unlimited Calling, Jio Apps',        smsCount: 100, talktime: 0,    planType: 'TOPUP'   },
    { amount: 399,  validity: '28 Days',  dataAmount: '2.5GB/day',   description: '2.5GB/day, Unlimited Calling, All OTT + TV',    smsCount: 100, talktime: 0,    planType: 'TOPUP',  isPopular: true  },
    { amount: 449,  validity: '56 Days',  dataAmount: '1.5GB/day',   description: '1.5GB/day for 56 Days, Unlimited Calling',      smsCount: 100, talktime: 0,    planType: 'TOPUP'   },
    { amount: 479,  validity: '56 Days',  dataAmount: '1.5GB/day',   description: '1.5GB/day, 56 Days, Unlimited Calling + OTT',   smsCount: 100, talktime: 0,    planType: 'TOPUP'   },
    { amount: 533,  validity: '84 Days',  dataAmount: '1.5GB/day',   description: '1.5GB/day for 84 Days, Unlimited Calling',      smsCount: 100, talktime: 0,    planType: 'TOPUP'   },
    { amount: 555,  validity: '84 Days',  dataAmount: '1.5GB/day',   description: '1.5GB/day, 84 Days, Unlimited Calling + OTT',   smsCount: 100, talktime: 0,    planType: 'TOPUP'   },
    { amount: 601,  validity: '84 Days',  dataAmount: '2GB/day',     description: '2GB/day for 84 Days, Unlimited Calling',        smsCount: 100, talktime: 0,    planType: 'TOPUP'   },
    { amount: 666,  validity: '84 Days',  dataAmount: '2GB/day',     description: '2GB/day, 84 Days, Unlimited + All OTT',         smsCount: 100, talktime: 0,    planType: 'TOPUP'   },
    { amount: 719,  validity: '84 Days',  dataAmount: '2GB/day',     description: '2GB/day, 84 Days, Unlimited Calling + Disney+', smsCount: 100, talktime: 0,    planType: 'TOPUP'   },
    { amount: 799,  validity: '84 Days',  dataAmount: '2.5GB/day',   description: '2.5GB/day for 84 Days, Unlimited Calling + OTT',smsCount: 100, talktime: 0,    planType: 'TOPUP'   },
    { amount: 1299, validity: '365 Days', dataAmount: '1.5GB/day',   description: '1.5GB/day for 365 Days, Unlimited Calling',     smsCount: 100, talktime: 0,    planType: 'ANNUAL'  },
    { amount: 1559, validity: '365 Days', dataAmount: '2GB/day',     description: '2GB/day for 365 Days, Unlimited Calling',       smsCount: 100, talktime: 0,    planType: 'ANNUAL'  },
    { amount: 2999, validity: '365 Days', dataAmount: '2.5GB/day',   description: '2.5GB/day, 365 Days, Unlimited + All OTT',      smsCount: 100, talktime: 0,    planType: 'ANNUAL'  },
  ],

  // ── AIRTEL (code: 'AIRTEL') ──────────────────────────────────────────────
  'AIRTEL': [
    { amount: 19,   validity: '1 Day',    dataAmount: '200MB',       description: '200MB, Unlimited Calling',                       smsCount: 0,   talktime: 0,    planType: 'DATA'    },
    { amount: 49,   validity: '28 Days',  dataAmount: '6GB',         description: '6GB Total Data, Unlimited Calling',              smsCount: 0,   talktime: 0,    planType: 'DATA'    },
    { amount: 99,   validity: '28 Days',  dataAmount: '1GB/day',     description: '1GB/day, Unlimited Calling, Airtel Thanks',      smsCount: 100, talktime: 0,    planType: 'TOPUP'   },
    { amount: 149,  validity: '28 Days',  dataAmount: '1GB/day',     description: '1GB/day, Unlimited Calling, Thanks Benefits',    smsCount: 100, talktime: 0,    planType: 'TOPUP'   },
    { amount: 179,  validity: '28 Days',  dataAmount: '1.5GB/day',   description: '1.5GB/day, Unlimited Calling, Airtel Thanks',    smsCount: 100, talktime: 0,    planType: 'TOPUP'   },
    { amount: 199,  validity: '28 Days',  dataAmount: '1.5GB/day',   description: '1.5GB/day, Unlimited Calling, Amazon Prime',     smsCount: 100, talktime: 0,    planType: 'TOPUP',  isPopular: true  },
    { amount: 239,  validity: '28 Days',  dataAmount: '1.5GB/day',   description: '1.5GB/day, Unlimited Calling, Disney+ Hotstar',  smsCount: 100, talktime: 0,    planType: 'TOPUP',  isPopular: true  },
    { amount: 265,  validity: '28 Days',  dataAmount: '2GB/day',     description: '2GB/day, Unlimited Calling, Airtel Thanks',      smsCount: 100, talktime: 0,    planType: 'TOPUP'   },
    { amount: 299,  validity: '28 Days',  dataAmount: '2GB/day',     description: '2GB/day, Unlimited Calling, OTT Benefits',       smsCount: 100, talktime: 0,    planType: 'TOPUP',  isPopular: true  },
    { amount: 349,  validity: '28 Days',  dataAmount: '2GB/day',     description: '2GB/day, Unlimited Calling, Wynk + Thanks',      smsCount: 100, talktime: 0,    planType: 'TOPUP',  isPopular: true  },
    { amount: 359,  validity: '28 Days',  dataAmount: '2.5GB/day',   description: '2.5GB/day, Unlimited Calling, Airtel Thanks',    smsCount: 100, talktime: 0,    planType: 'TOPUP'   },
    { amount: 379,  validity: '28 Days',  dataAmount: '2.5GB/day',   description: '2.5GB/day, Unlimited Calling, Disney+Hotstar',   smsCount: 100, talktime: 0,    planType: 'TOPUP'   },
    { amount: 409,  validity: '28 Days',  dataAmount: '3GB/day',     description: '3GB/day, Unlimited Calling, All OTT Pack',       smsCount: 100, talktime: 0,    planType: 'TOPUP',  isPopular: true  },
    { amount: 449,  validity: '56 Days',  dataAmount: '1.5GB/day',   description: '1.5GB/day for 56 Days, Unlimited Calling',       smsCount: 100, talktime: 0,    planType: 'TOPUP'   },
    { amount: 479,  validity: '56 Days',  dataAmount: '2GB/day',     description: '2GB/day for 56 Days, Unlimited Calling',         smsCount: 100, talktime: 0,    planType: 'TOPUP'   },
    { amount: 549,  validity: '56 Days',  dataAmount: '2GB/day',     description: '2GB/day, 56 Days, Unlimited + Disney+Hotstar',   smsCount: 100, talktime: 0,    planType: 'TOPUP'   },
    { amount: 599,  validity: '84 Days',  dataAmount: '1.5GB/day',   description: '1.5GB/day for 84 Days, Unlimited Calling',       smsCount: 100, talktime: 0,    planType: 'TOPUP'   },
    { amount: 649,  validity: '84 Days',  dataAmount: '2GB/day',     description: '2GB/day for 84 Days, Unlimited Calling',         smsCount: 100, talktime: 0,    planType: 'TOPUP'   },
    { amount: 719,  validity: '84 Days',  dataAmount: '2GB/day',     description: '2GB/day, 84 Days, Unlimited + Disney+Hotstar',   smsCount: 100, talktime: 0,    planType: 'TOPUP'   },
    { amount: 839,  validity: '84 Days',  dataAmount: '2.5GB/day',   description: '2.5GB/day, 84 Days, Unlimited + All OTT',        smsCount: 100, talktime: 0,    planType: 'TOPUP'   },
    { amount: 1099, validity: '180 Days', dataAmount: '1GB/day',     description: '1GB/day for 180 Days, Unlimited Calling',        smsCount: 100, talktime: 0,    planType: 'TOPUP'   },
    { amount: 1499, validity: '365 Days', dataAmount: '24GB',        description: '24GB Total, Unlimited Calling for 365 Days',     smsCount: 100, talktime: 0,    planType: 'ANNUAL'  },
    { amount: 1799, validity: '365 Days', dataAmount: '1.5GB/day',   description: '1.5GB/day for 365 Days, Unlimited Calling',      smsCount: 100, talktime: 0,    planType: 'ANNUAL'  },
    { amount: 2999, validity: '365 Days', dataAmount: '2GB/day',     description: '2GB/day, 365 Days, Unlimited + All OTT',         smsCount: 100, talktime: 0,    planType: 'ANNUAL'  },
  ],

  // ── VI (Vodafone Idea, code: 'VI') ──────────────────────────────────────
  'VI': [
    { amount: 19,   validity: '1 Day',    dataAmount: '200MB',       description: '200MB, Unlimited Calling',                       smsCount: 0,   talktime: 0,    planType: 'DATA'    },
    { amount: 49,   validity: '28 Days',  dataAmount: '6GB',         description: '6GB Total, Unlimited Calling',                   smsCount: 0,   talktime: 0,    planType: 'DATA'    },
    { amount: 99,   validity: '28 Days',  dataAmount: '1GB/day',     description: '1GB/day, Unlimited Calling, Vi Movies',          smsCount: 100, talktime: 0,    planType: 'TOPUP'   },
    { amount: 149,  validity: '28 Days',  dataAmount: '1.5GB/day',   description: '1.5GB/day, Unlimited Calling, Vi Movies & TV',   smsCount: 100, talktime: 0,    planType: 'TOPUP'   },
    { amount: 179,  validity: '28 Days',  dataAmount: '1.5GB/day',   description: '1.5GB/day, Unlimited Calling, Vi Hero Unlimited',smsCount: 100, talktime: 0,    planType: 'TOPUP'   },
    { amount: 199,  validity: '28 Days',  dataAmount: '1.5GB/day',   description: '1.5GB/day, Unlimited Calling, Weekend Rollover', smsCount: 100, talktime: 0,    planType: 'TOPUP',  isPopular: true  },
    { amount: 239,  validity: '28 Days',  dataAmount: '1.5GB/day',   description: '1.5GB/day, Unlimited Calling, Binge All Night',  smsCount: 100, talktime: 0,    planType: 'TOPUP',  isPopular: true  },
    { amount: 269,  validity: '28 Days',  dataAmount: '2GB/day',     description: '2GB/day, Unlimited Calling, Vi Movies & TV',     smsCount: 100, talktime: 0,    planType: 'TOPUP'   },
    { amount: 299,  validity: '28 Days',  dataAmount: '2GB/day',     description: '2GB/day, Unlimited Calling, Hero Unlimited',     smsCount: 100, talktime: 0,    planType: 'TOPUP',  isPopular: true  },
    { amount: 349,  validity: '28 Days',  dataAmount: '2GB/day',     description: '2GB/day, Unlimited Calling, OTT Pack + Binge',   smsCount: 100, talktime: 0,    planType: 'TOPUP',  isPopular: true  },
    { amount: 379,  validity: '28 Days',  dataAmount: '2.5GB/day',   description: '2.5GB/day, Unlimited Calling, Vi Hero Unlimited',smsCount: 100, talktime: 0,    planType: 'TOPUP'   },
    { amount: 399,  validity: '28 Days',  dataAmount: '2.5GB/day',   description: '2.5GB/day, Unlimited Calling, All OTT + Binge',  smsCount: 100, talktime: 0,    planType: 'TOPUP',  isPopular: true  },
    { amount: 449,  validity: '56 Days',  dataAmount: '1.5GB/day',   description: '1.5GB/day for 56 Days, Unlimited Calling',       smsCount: 100, talktime: 0,    planType: 'TOPUP'   },
    { amount: 499,  validity: '56 Days',  dataAmount: '2GB/day',     description: '2GB/day for 56 Days, Unlimited Calling',         smsCount: 100, talktime: 0,    planType: 'TOPUP'   },
    { amount: 601,  validity: '84 Days',  dataAmount: '1.5GB/day',   description: '1.5GB/day for 84 Days, Unlimited Calling',       smsCount: 100, talktime: 0,    planType: 'TOPUP'   },
    { amount: 699,  validity: '84 Days',  dataAmount: '2GB/day',     description: '2GB/day for 84 Days, Unlimited Calling',         smsCount: 100, talktime: 0,    planType: 'TOPUP'   },
    { amount: 1299, validity: '365 Days', dataAmount: '1.5GB/day',   description: '1.5GB/day for 365 Days, Unlimited Calling',      smsCount: 100, talktime: 0,    planType: 'ANNUAL'  },
    { amount: 1799, validity: '365 Days', dataAmount: '2GB/day',     description: '2GB/day for 365 Days, Unlimited Calling',        smsCount: 100, talktime: 0,    planType: 'ANNUAL'  },
  ],

  // ── BSNL (code: 'BSNL') ─────────────────────────────────────────────────
  'BSNL': [
    { amount: 22,   validity: '18 Days',  dataAmount: '500MB',       description: '500MB Data, Unlimited Calling',                  smsCount: 0,   talktime: 0,    planType: 'DATA'    },
    { amount: 47,   validity: '28 Days',  dataAmount: '2GB',         description: '2GB Total Data, Unlimited Calling',              smsCount: 100, talktime: 0,    planType: 'DATA'    },
    { amount: 94,   validity: '28 Days',  dataAmount: '2GB',         description: '2GB Data, Unlimited Calling, BSNL Tunes',        smsCount: 100, talktime: 0,    planType: 'TOPUP'   },
    { amount: 107,  validity: '30 Days',  dataAmount: '1GB/day',     description: '1GB/day for 30 Days, Unlimited Calling',         smsCount: 100, talktime: 0,    planType: 'TOPUP'   },
    { amount: 118,  validity: '26 Days',  dataAmount: '2GB/day',     description: '2GB/day, Unlimited Calling',                     smsCount: 100, talktime: 0,    planType: 'TOPUP',  isPopular: true  },
    { amount: 147,  validity: '28 Days',  dataAmount: '2GB/day',     description: '2GB/day, Unlimited Calling, BSNL Tunes',         smsCount: 100, talktime: 0,    planType: 'TOPUP',  isPopular: true  },
    { amount: 187,  validity: '54 Days',  dataAmount: '2GB/day',     description: '2GB/day for 54 Days, Unlimited Calling',         smsCount: 100, talktime: 0,    planType: 'TOPUP',  isPopular: true  },
    { amount: 247,  validity: '28 Days',  dataAmount: '3GB/day',     description: '3GB/day, Unlimited Calling, BSNL Tunes',         smsCount: 100, talktime: 0,    planType: 'TOPUP',  isPopular: true  },
    { amount: 299,  validity: '75 Days',  dataAmount: '2GB/day',     description: '2GB/day for 75 Days, Unlimited Calling',         smsCount: 100, talktime: 0,    planType: 'TOPUP',  isPopular: true  },
    { amount: 319,  validity: '180 Days', dataAmount: '600MB/day',   description: '600MB/day for 180 Days, Unlimited Calling',      smsCount: 100, talktime: 0,    planType: 'TOPUP'   },
    { amount: 485,  validity: '120 Days', dataAmount: '2GB/day',     description: '2GB/day for 120 Days, Unlimited Calling',        smsCount: 100, talktime: 0,    planType: 'TOPUP'   },
    { amount: 666,  validity: '160 Days', dataAmount: '2GB/day',     description: '2GB/day for 160 Days, Unlimited Calling',        smsCount: 100, talktime: 0,    planType: 'TOPUP'   },
    { amount: 1198, validity: '365 Days', dataAmount: '2GB/day',     description: '2GB/day for 365 Days, Unlimited Calling',        smsCount: 100, talktime: 0,    planType: 'ANNUAL'  },
  ],
};

// ── Main seeder ────────────────────────────────────────────────────────────────

async function seed() {
  const args = process.argv.slice(2);
  const clearFirst = args.includes('--clear');

  const operators = await OperatorMaster.find({ isActive: true }).lean();
  const circles   = await CircleMaster.find({ isActive: true }).lean();

  if (operators.length === 0) {
    console.error('❌  No active operators found in DB. Run your operators seed first.');
    process.exit(1);
  }
  if (circles.length === 0) {
    console.error('❌  No active circles found in DB. Run your circles seed first.');
    process.exit(1);
  }

  console.log(`Found ${operators.length} operators, ${circles.length} circles`);

  if (clearFirst) {
    const deleted = await Plan.deleteMany({});
    console.log(`🗑   Cleared ${deleted.deletedCount} existing plans`);
    // Clear in-memory cache too (plan cache utility auto-purges on restart anyway)
  }

  let totalInserted = 0;
  let totalSkipped  = 0;

  for (const operator of operators) {
    const operatorCode = String(operator.code ?? '');
    const planTemplates = PLAN_CATALOGUE[operatorCode];

    if (!planTemplates || planTemplates.length === 0) {
      console.log(`⏭   No plan catalogue entry for operator "${operator.name}" (code: ${operatorCode}) — skipping`);
      continue;
    }

    for (const circle of circles) {
      // Check how many plans already exist for this operator+circle combo
      const existing = await Plan.countDocuments({ operator: operator._id, circle: circle._id });

      if (existing > 0 && !clearFirst) {
        totalSkipped += existing;
        continue;
      }

      const docs = planTemplates.map((t) => ({
        operator:    operator._id,
        circle:      circle._id,
        amount:      t.amount,
        talktime:    t.talktime    ?? 0,
        validity:    t.validity    ?? '',
        description: t.description ?? '',
        dataAmount:  t.dataAmount  ?? '',
        smsCount:    t.smsCount    ?? 0,
        planType:    t.planType    ?? 'TOPUP',
        isActive:    true,
        isPopular:   t.isPopular   ?? false,
        metadata:    {},
      }));

      await Plan.insertMany(docs, { ordered: false });
      totalInserted += docs.length;
    }

    console.log(`✅  ${operator.name} (code: ${operatorCode}) — ${planTemplates.length} plans × ${circles.length} circles`);
  }

  console.log(`\n🎉  Done! Inserted: ${totalInserted} | Skipped (already existed): ${totalSkipped}`);
  console.log(`   Total plans in DB: ${await Plan.countDocuments()}`);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  mongoose.disconnect();
  process.exit(1);
});
