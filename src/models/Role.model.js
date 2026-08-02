import mongoose from 'mongoose';
import { ROLES } from '../constants/roles.js';

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Role name is required'],
      unique: true,
      trim: true,
      lowercase: true,
      enum: {
        values: Object.values(ROLES),
        message: 'Invalid role name',
      },
    },
    displayName: {
      type: String,
      required: [true, 'Display name is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    permissions: {
      type: [String],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isSystem: {
      type: Boolean,
      default: false, // system roles cannot be deleted
    },
    createdBy: {
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

roleSchema.index({ name: 1 }, { unique: true });

const Role = mongoose.model('Role', roleSchema);
export default Role;
