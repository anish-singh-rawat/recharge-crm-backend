import { settingRepository } from '../repositories/setting.repository.js';
import { buildListQuery } from '../helpers/query.helper.js';
import { NotFoundError } from '../helpers/error.helper.js';
import { auditLogRepository } from '../repositories/log.repository.js';
import { AUDIT_ACTION, AUDIT_SEVERITY } from '../constants/audit.js';

export const settingService = {
  async list(query = {}) {
    const { filter, pagination, sort } = buildListQuery(query, {
      exactFields: ['group', 'isPublic'],
    });
    return settingRepository.findPaginated(filter, { ...pagination, sort });
  },

  async getByKey(key) {
    const setting = await settingRepository.findByKey(key);
    if (!setting) throw new NotFoundError(`Setting '${key}' not found`);
    return setting;
  },

  async update(key, value, performedBy) {
    const setting = await settingRepository.findByKey(key);
    if (!setting) throw new NotFoundError(`Setting '${key}' not found`);
    if (!setting.isEditable) throw new Error(`Setting '${key}' is not editable`);

    const updated = await settingRepository.upsert(key, value, performedBy);

    auditLogRepository.create({
      performedBy,
      action: AUDIT_ACTION.SETTINGS_UPDATED,
      severity: AUDIT_SEVERITY.MEDIUM,
      module: 'settings',
      description: `Setting '${key}' updated`,
      previousValue: { value: setting.value },
      newValue: { value },
    }).catch(() => {});

    return updated;
  },

  async bulkUpdate(settings, performedBy) {
    const results = await Promise.allSettled(
      settings.map(({ key, value }) => settingRepository.upsert(key, value, performedBy)),
    );

    auditLogRepository.create({
      performedBy,
      action: AUDIT_ACTION.SETTINGS_UPDATED,
      severity: AUDIT_SEVERITY.MEDIUM,
      module: 'settings',
      description: `Bulk settings update: ${settings.map((s) => s.key).join(', ')}`,
    }).catch(() => {});

    return results;
  },

  async getPublic() {
    return settingRepository.findPublicSettings();
  },
};
