import mongoose from 'mongoose';

const circleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Circle name is required'],
      trim: true,
    },
    code: {
      type: String,
      required: [true, 'Circle code is required'],
      trim: true,
      uppercase: true,
      unique: true,
    },
    providerCode: {
      type: String,
      trim: true,
      default: '',
    },
    displayName: {
      type: String,
      trim: true,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

circleSchema.index({ code: 1 }, { unique: true });
circleSchema.index({ isActive: 1 });

const CircleMaster = mongoose.model('CircleMaster', circleSchema);
export default CircleMaster;
