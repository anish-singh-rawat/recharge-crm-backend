import { Setting } from '../models/index.js';
import { BaseRepository } from './base.repository.js';

class SettingRepository extends BaseRepository {
  constructor() {
    super(Setting);
  }

  async findByKey(key) {
    return Setting.findOne({ key: key.toLowerCase() }).lean();
  }

  async findByGroup(group) {
    return Setting.find({ group }).lean();
  }

  async findPublicSettings() {
    return Setting.find({ isPublic: true }).lean();
  }

  async upsert(key, value, updatedBy) {
    return Setting.findOneAndUpdate(
      { key: key.toLowerCase() },
      { $set: { value, updatedBy } },
      { new: true, upsert: true, runValidators: true },
    ).lean();
  }

  async getValue(key, defaultValue = null) {
    const setting = await this.findByKey(key);
    return setting ? setting.value : defaultValue;
  }

  async getGroupAsObject(group) {
    const settings = await this.findByGroup(group);
    return settings.reduce((acc, s) => {
      acc[s.key] = s.value;
      return acc;
    }, {});
  }
}

export const settingRepository = new SettingRepository();
