import { OperatorMaster, CircleMaster, Plan } from '../models/index.js';
import { BaseRepository } from './base.repository.js';

class OperatorRepository extends BaseRepository {
  constructor() {
    super(OperatorMaster);
  }

  async findByCode(code) {
    return OperatorMaster.findOne({ code: code.toUpperCase() }).lean();
  }

  async findActive(type = null) {
    const filter = { isActive: true };
    if (type) filter.type = type;
    return OperatorMaster.find(filter).sort({ sortOrder: 1, name: 1 }).lean();
  }

  async findPaginatedOperators(filter = {}, paginationOptions = {}) {
    return this.findPaginated(filter, {
      ...paginationOptions,
      sort: paginationOptions.sort || { sortOrder: 1, createdAt: -1 },
    });
  }
}

class CircleRepository extends BaseRepository {
  constructor() {
    super(CircleMaster);
  }

  async findByCode(code) {
    return CircleMaster.findOne({ code: code.toUpperCase() }).lean();
  }

  async findActive() {
    return CircleMaster.find({ isActive: true }).sort({ sortOrder: 1, name: 1 }).lean();
  }
}

class PlanRepository extends BaseRepository {
  constructor() {
    super(Plan);
  }

  async findByOperatorAndCircle(operatorId, circleId, filter = {}) {
    return Plan.find({
      operator: operatorId,
      circle: circleId,
      isActive: true,
      ...filter,
    })
      .sort({ amount: 1 })
      .lean();
  }

  async findPaginatedPlans(filter = {}, paginationOptions = {}) {
    return this.findPaginated(filter, {
      ...paginationOptions,
      sort: paginationOptions.sort || { amount: 1 },
      populate: [
        { path: 'operator', select: 'name code type' },
        { path: 'circle', select: 'name code' },
      ],
    });
  }
}

export const operatorRepository = new OperatorRepository();
export const circleRepository = new CircleRepository();
export const planRepository = new PlanRepository();
