import mongoose from 'mongoose';

const settingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: [true, 'Setting key is required'],
      unique: true,
      trim: true,
      lowercase: true,
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    displayName: {
      type: String,
      trim: true,
      default: '',
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    group: {
      type: String,
      trim: true,
      lowercase: true,
      default: 'general',
      // e.g. 'general', 'wallet', 'recharge', 'notification', 'security'
    },
    dataType: {
      type: String,
      enum: ['string', 'number', 'boolean', 'json', 'array'],
      default: 'string',
    },
    isPublic: {
      type: Boolean,
      default: false, // public settings can be read without auth
    },
    isEditable: {
      type: Boolean,
      default: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

settingSchema.index({ key: 1 }, { unique: true });
settingSchema.index({ group: 1 });

const Setting = mongoose.model('Setting', settingSchema);
export default Setting;
