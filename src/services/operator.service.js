import { operatorRepository, circleRepository, planRepository } from '../repositories/operator.repository.js';
import { buildListQuery } from '../helpers/query.helper.js';
import { NotFoundError, ConflictError } from '../helpers/error.helper.js';
import { auditLogRepository } from '../repositories/log.repository.js';
import { AUDIT_ACTION, AUDIT_SEVERITY } from '../constants/audit.js';

export const operatorService = {
  // ── Operators ─────────────────────────────────────────────────────────────

  async createOperator(data, performedBy) {
    const existing = await operatorRepository.findByCode(data.code);
    if (existing) throw new ConflictError(`Operator with code '${data.code}' already exists`);

    const operator = await operatorRepository.create(data);

    auditLogRepository.create({
      performedBy,
      action: AUDIT_ACTION.OPERATOR_CREATED,
      severity: AUDIT_SEVERITY.LOW,
      module: 'operator',
      description: `Operator ${data.name} (${data.code}) created`,
    }).catch(() => {});

    return operator;
  },

  async getOperator(id) {
    const operator = await operatorRepository.findById(id);
    if (!operator) throw new NotFoundError('Operator not found');
    return operator;
  },

  async listOperators(query) {
    const { filter, pagination, sort } = buildListQuery(query, {
      exactFields: ['type', 'isActive'],
      searchFields: ['name', 'code'],
    });
    return operatorRepository.findPaginatedOperators(filter, { ...pagination, sort });
  },

  async listActiveOperators(type = null) {
    return operatorRepository.findActive(type);
  },

  async updateOperator(id, data, performedBy) {
    const operator = await operatorRepository.findById(id);
    if (!operator) throw new NotFoundError('Operator not found');

    const updated = await operatorRepository.updateById(id, { $set: data });

    auditLogRepository.create({
      performedBy,
      action: AUDIT_ACTION.OPERATOR_UPDATED,
      severity: AUDIT_SEVERITY.LOW,
      module: 'operator',
      description: `Operator ${operator.name} updated`,
    }).catch(() => {});

    return updated;
  },

  async deleteOperator(id, performedBy) {
    const operator = await operatorRepository.findById(id);
    if (!operator) throw new NotFoundError('Operator not found');

    await operatorRepository.updateById(id, { $set: { isActive: false } });

    auditLogRepository.create({
      performedBy,
      action: AUDIT_ACTION.OPERATOR_DELETED,
      severity: AUDIT_SEVERITY.MEDIUM,
      module: 'operator',
      description: `Operator ${operator.name} deactivated`,
    }).catch(() => {});
  },

  // ── Circles ───────────────────────────────────────────────────────────────

  async createCircle(data, performedBy) {
    const existing = await circleRepository.findByCode(data.code);
    if (existing) throw new ConflictError(`Circle with code '${data.code}' already exists`);
    return circleRepository.create(data);
  },

  async getCircle(id) {
    const circle = await circleRepository.findById(id);
    if (!circle) throw new NotFoundError('Circle not found');
    return circle;
  },

  async listCircles(query = {}) {
    return circleRepository.findActive();
  },

  async updateCircle(id, data) {
    const circle = await circleRepository.findById(id);
    if (!circle) throw new NotFoundError('Circle not found');
    return circleRepository.updateById(id, { $set: data });
  },

  // ── Plans ─────────────────────────────────────────────────────────────────

  async createPlan(data, performedBy) {
    const plan = await planRepository.create(data);
    auditLogRepository.create({
      performedBy,
      action: AUDIT_ACTION.PLAN_CREATED,
      severity: AUDIT_SEVERITY.LOW,
      module: 'plan',
      description: `Plan created for operator ${data.operator}`,
    }).catch(() => {});
    return plan;
  },

  async getPlan(id) {
    const plan = await planRepository.findById(id);
    if (!plan) throw new NotFoundError('Plan not found');
    return plan;
  },

  async listPlans(query) {
    const { filter, pagination, sort } = buildListQuery(query, {
      exactFields: ['operator', 'circle', 'isActive', 'planType'],
    });
    return planRepository.findPaginatedPlans(filter, { ...pagination, sort });
  },

  async getPlansByOperatorCircle(operatorId, circleId) {
    return planRepository.findByOperatorAndCircle(operatorId, circleId);
  },

  async updatePlan(id, data, performedBy) {
    const plan = await planRepository.findById(id);
    if (!plan) throw new NotFoundError('Plan not found');
    return planRepository.updateById(id, { $set: data });
  },

  async deletePlan(id, performedBy) {
    const plan = await planRepository.findById(id);
    if (!plan) throw new NotFoundError('Plan not found');
    await planRepository.updateById(id, { $set: { isActive: false } });
  },
};
