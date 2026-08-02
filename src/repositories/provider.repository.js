import { RechargeProvider } from '../models/index.js';
import { BaseRepository } from './base.repository.js';

class RechargeProviderRepository extends BaseRepository {
  constructor() {
    super(RechargeProvider);
  }

  async findByCode(code) {
    return RechargeProvider.findOne({ code: code.toUpperCase() })
      .select('+apiKey +apiSecret +webhookSecret')
      .lean();
  }

  async findDefault() {
    return RechargeProvider.findOne({ isDefault: true, status: 'ACTIVE' })
      .select('+apiKey +apiSecret +webhookSecret')
      .lean();
  }

  async findActive() {
    return RechargeProvider.find({ status: 'ACTIVE' })
      .sort({ priority: 1 })
      .lean();
  }

  async updateBalance(code, balance) {
    return RechargeProvider.findOneAndUpdate(
      { code: code.toUpperCase() },
      { $set: { balance, balanceLastCheckedAt: new Date() } },
      { new: true },
    ).lean();
  }
}

export const rechargeProviderRepository = new RechargeProviderRepository();
