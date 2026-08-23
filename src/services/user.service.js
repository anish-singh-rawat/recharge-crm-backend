import { userRepository } from '../repositories/user.repository.js';
import { auditLogRepository } from '../repositories/log.repository.js';
import { sessionRepository } from '../repositories/session.repository.js';
import { walletRepository } from '../repositories/wallet.repository.js';
import { apiKeyRepository } from '../repositories/apiKey.repository.js';
import { buildListQuery } from '../helpers/query.helper.js';
import { NotFoundError, ConflictError } from '../helpers/error.helper.js';
import { formatUser } from '../helpers/user.helper.js';
import { AUDIT_ACTION, AUDIT_SEVERITY } from '../constants/audit.js';

export const userService = {
  async getUser(userId) {
    const user = await userRepository.findById(userId, null, {});
    if (!user) throw new NotFoundError('User not found');
    return formatUser(user);
  },

  async listUsers(query) {
    const { filter, pagination, sort } = buildListQuery(query, {
      exactFields: ['role', 'isActive', 'isBlocked'],
      searchFields: ['name', 'email', 'phone', 'businessName'],
      dateField: 'createdAt',
    });
    return userRepository.findPaginatedUsers(filter, { ...pagination, sort });
  },

  async updateUser(targetId, updateData, performedBy) {
    const user = await userRepository.findById(targetId);
    if (!user) throw new NotFoundError('User not found');

    const allowed = ['name', 'businessName', 'commissionRate', 'isActive', 'permissions', 'address', 'gstNumber', 'panNumber', 'apiAccessEnabled' ];
    const sanitized = {};
    for (const key of allowed) {
      if (updateData[key] !== undefined) sanitized[key] = updateData[key];
    }

    const updated = await userRepository.updateById(targetId, { $set: sanitized });

    auditLogRepository.create({
      performedBy,
      targetUser: targetId,
      action: AUDIT_ACTION.USER_UPDATED,
      severity: AUDIT_SEVERITY.LOW,
      module: 'user',
      description: `User ${user.email} updated`,
      previousValue: user,
      newValue: updated,
    }).catch(() => {});

    return updated;
  },

  async blockUser(targetId, reason, performedBy) {
    const user = await userRepository.findById(targetId);
    if (!user) throw new NotFoundError('User not found');
    if (user.isBlocked) throw new ConflictError('User is already blocked');

    const updated = await userRepository.blockUser(targetId, reason, performedBy);

    auditLogRepository.create({
      performedBy,
      targetUser: targetId,
      action: AUDIT_ACTION.USER_BLOCKED,
      severity: AUDIT_SEVERITY.HIGH,
      module: 'user',
      description: `User ${user.email} blocked: ${reason}`,
    }).catch(() => {});

    return updated;
  },

  async unblockUser(targetId, performedBy) {
    const user = await userRepository.findById(targetId);
    if (!user) throw new NotFoundError('User not found');
    if (!user.isBlocked) throw new ConflictError('User is not blocked');

    const updated = await userRepository.unblockUser(targetId);

    auditLogRepository.create({
      performedBy,
      targetUser: targetId,
      action: AUDIT_ACTION.USER_UNBLOCKED,
      severity: AUDIT_SEVERITY.MEDIUM,
      module: 'user',
      description: `User ${user.email} unblocked`,
    }).catch(() => {});

    return updated;
  },

  async deleteUser(targetId, performedBy) {
  const user = await userRepository.findById(targetId);
  if (!user) throw new NotFoundError('User not found');

  await userRepository.deleteById(targetId);

  await sessionRepository.model.deleteMany({
    user: targetId,
  });

  await apiKeyRepository.model.deleteMany({
    user: targetId,
  });

  await walletRepository.model.deleteMany({
    user: targetId,
  });

  await notificationRepository.model.deleteMany({
    user: targetId,
  });

  await rechargeRepository.model.deleteMany({
    user: targetId,
  });

  await userRepository.model.findByIdAndDelete(targetId);

  await auditLogRepository.create({
    performedBy,
    targetUser: targetId,
    action: AUDIT_ACTION.USER_DELETED,
    severity: AUDIT_SEVERITY.CRITICAL,
    module: 'user',
    description: `User ${user.email} permanently deleted with all related data`,
  }).catch(() => {});
},

  async updateCommission(targetId, commissionRate, performedBy) {
    const user = await userRepository.findById(targetId);
    if (!user) throw new NotFoundError('User not found');
    const rate = parseFloat(commissionRate);
    if (isNaN(rate) || rate < 0 || rate > 1) {
      throw new Error('Commission rate must be between 0 and 1 (e.g. 0.02 = 2%)');
    }
    const updated = await userRepository.updateById(targetId, { $set: { commissionRate: rate } });
    auditLogRepository.create({
      performedBy,
      targetUser: targetId,
      action: AUDIT_ACTION.USER_UPDATED,
      severity: AUDIT_SEVERITY.LOW,
      module: 'user',
      description: `Commission rate updated to ${(rate * 100).toFixed(2)}% for ${user.email}`,
    }).catch(() => {});
    return updated;
  },

  async updateOperatorCommissions(targetId, commissions, performedBy) {
    const user = await userRepository.findById(targetId);
    if (!user) throw new NotFoundError('User not found');

    for (const entry of commissions) {
      const rate = parseFloat(entry.rate);
      if (isNaN(rate) || rate < 0 || rate > 1) {
        throw new Error(`Invalid commission rate "${entry.rate}" — must be between 0 and 1 (e.g. 0.05 = 5%)`);
      }
    }

    const operatorCommissions = commissions.map((c) => ({
      operator: c.operatorId,
      rate: parseFloat(c.rate),
    }));

    const updated = await userRepository.updateById(targetId, {
      $set: { operatorCommissions },
    });

    auditLogRepository.create({
      performedBy,
      targetUser: targetId,
      action: AUDIT_ACTION.USER_UPDATED,
      severity: AUDIT_SEVERITY.LOW,
      module: 'user',
      description: `Operator-wise commissions updated for ${user.email} (${commissions.length} operator(s))`,
    }).catch(() => {});

    return updated;
  },
};
