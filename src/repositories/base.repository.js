export class BaseRepository {
  constructor(model) {
    this.model = model;
  }

  async findById(id, projection = null, options = {}) {
    return this.model.findById(id, projection, options).lean();
  }

  async findOne(filter, projection = null, options = {}) {
    return this.model.findOne(filter, projection, options).lean();
  }

  async findMany(filter = {}, projection = null, options = {}) {
    return this.model.find(filter, projection, options).lean();
  }

  async findPaginated(filter = {}, { page = 1, limit = 20, skip = 0, sort = { createdAt: -1 }, populate = [] } = {}) {
    const [items, total] = await Promise.all([
      this.model
        .find(filter)
        .sort(sort)
        .skip(skip || (page - 1) * limit)
        .limit(limit)
        .populate(populate)
        .lean(),
      this.model.countDocuments(filter),
    ]);
    return { items, total };
  }

  async create(data) {
    return this.model.create(data);
  }

  async insertMany(dataArray) {
    return this.model.insertMany(dataArray, { ordered: false });
  }

  async updateById(id, update, options = { new: true, runValidators: true }) {
    return this.model.findByIdAndUpdate(id, update, options).lean();
  }

  async updateOne(filter, update, options = { new: true, runValidators: true }) {
    return this.model.findOneAndUpdate(filter, update, options).lean();
  }

  async updateMany(filter, update) {
    return this.model.updateMany(filter, update);
  }

  async deleteById(id) {
    return this.model.findByIdAndDelete(id).lean();
  }

  async deleteMany(filter) {
    return this.model.deleteMany(filter);
  }

  async count(filter = {}) {
    return this.model.countDocuments(filter);
  }

  async exists(filter) {
    return this.model.exists(filter);
  }

  async aggregate(pipeline) {
    return this.model.aggregate(pipeline);
  }
}
