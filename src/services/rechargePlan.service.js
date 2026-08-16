import { operatorRepository, circleRepository, planRepository } from '../repositories/operator.repository.js';
import { rechargeTransactionRepository } from '../repositories/recharge.repository.js';
import { mroboticsProvider } from './providers/mrobotics/index.js';
import planCache from '../utils/planCache.util.js';
import { NotFoundError } from '../helpers/error.helper.js';
import { providerLogger } from '../config/logger.js';
import env from '../config/env.js';

const POPULAR_TOP_N = 5;
const POPULARITY_LOOKBACK = 500;
const LIVE_CACHE_TTL_MS = 5 * 60 * 1000;
const DB_CACHE_TTL_MS   = 15 * 60 * 1000;

const mroboticsConfigured = () =>
  !!(env.mrobotics.apiKey && env.mrobotics.memberId);

export const rechargePlanService = {
  async getPlans(operatorId, circleId) {
    const [operator, circle] = await Promise.all([
      operatorRepository.findById(operatorId),
      circleRepository.findById(circleId),
    ]);

    if (!operator || !operator.isActive) throw new NotFoundError('Operator not found or inactive');
    if (!circle  || !circle.isActive)   throw new NotFoundError('Circle not found or inactive');

    const operatorCode = operator.providerCode || operator.code;
    const circleCode   = circle.providerCode   || circle.code;
    const cacheKey     = planCache.key(operatorCode, circleCode);

    const cached = planCache.get(cacheKey);
    if (cached) {
      providerLogger.debug('Plan cache hit', { cacheKey });
      return {
        plans:    cached.plans,
        source:   'cache',
        cachedAt: cached.cachedAt,
        operator: { id: operator._id, name: operator.name, code: operatorCode },
        circle:   { id: circle._id,   name: circle.name,   code: circleCode },
      };
    }

    let plans  = [];
    let source = 'db';

    if (mroboticsConfigured()) {
      try {
        const rawPlans = await mroboticsProvider.getPlans({
          operatorCode,
          circleCode,
        });

        if (Array.isArray(rawPlans) && rawPlans.length > 0) {
          plans = rawPlans.map((p) => ({
            amount:      p.amount      || 0,
            talktime:    p.talktime    || 0,
            validity:    p.validity    || '',
            description: p.description || '',
            dataAmount:  p.dataAmount  || '',
            smsCount:    p.smsCount    || 0,
            planType:    'TOPUP',
            isPopular:   false,
          }));
          source = 'mrobotics';
        }
      } catch (err) {
        providerLogger.warn('MRobotics plan fetch failed, falling back to DB', {
          operatorCode,
          circleCode,
          error: err.message,
        });
      }
    }

    if (plans.length === 0) {
      const dbPlans = await planRepository.findByOperatorAndCircle(operator._id, circle._id);
      plans = dbPlans.map((p) => ({
        _id:         p._id,
        amount:      p.amount,
        talktime:    p.talktime    || 0,
        validity:    p.validity    || '',
        description: p.description || '',
        dataAmount:  p.dataAmount  || '',
        smsCount:    p.smsCount    || 0,
        planType:    p.planType    || 'TOPUP',
        isPopular:   p.isPopular   || false,
      }));
      source = 'db';
    }

    if (plans.length === 0) {
      return {
        plans: [],
        source,
        operator: { id: operator._id, name: operator.name, code: operatorCode },
        circle:   { id: circle._id,   name: circle.name,   code: circleCode },
      };
    }

    try {
      plans = await this._enrichWithPopularity(plans, operator._id);
    } catch (err) {
      providerLogger.warn('Popularity enrichment failed', { error: err.message });
    }

    plans.sort((a, b) => {
      if (a.isPopular === b.isPopular) return a.amount - b.amount;
      return a.isPopular ? -1 : 1;
    });

    const ttl = source === 'mrobotics' ? LIVE_CACHE_TTL_MS : DB_CACHE_TTL_MS;
    planCache.set(cacheKey, plans, ttl);

    return {
      plans,
      source,
      operator: { id: operator._id, name: operator.name, code: operatorCode },
      circle:   { id: circle._id,   name: circle.name,   code: circleCode },
    };
  },

  async validateAmount(amount, operatorId, circleId) {
    const { plans } = await this.getPlans(operatorId, circleId);
    if (plans.length === 0) return { valid: true, plan: null, noPlansAvailable: true };
    const matched = plans.find((p) => Number(p.amount) === Number(amount)) ?? null;
    return { valid: !!matched, plan: matched };
  },

  async _enrichWithPopularity(plans, operatorId) {
    const results = await rechargeTransactionRepository.getMostFrequentAmounts(
      operatorId, POPULARITY_LOOKBACK, POPULAR_TOP_N,
    );
    const popularAmounts = new Set(results.map((r) => Number(r._id)));
    return plans.map((p) => ({ ...p, isPopular: popularAmounts.has(Number(p.amount)) }));
  },
};
