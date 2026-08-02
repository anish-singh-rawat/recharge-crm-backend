import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { ROLES } from '../constants/roles.js';

const deviceSchema = new mongoose.Schema(
  {
    deviceId: { type: String, required: true },
    deviceName: { type: String, default: 'Unknown Device' },
    deviceType: { type: String, default: 'unknown' },
    platform: { type: String, default: '' },
    ipAddress: { type: String, default: '' },
    userAgent: { type: String, default: '' },
    lastLoginAt: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
  },
  { _id: true, timestamps: false },
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      unique: true,
      trim: true,
      match: [/^[6-9]\d{9}$/, 'Please provide a valid Indian mobile number'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    },

    role: {
      type: String,
      enum: {
        values: Object.values(ROLES),
        message: 'Invalid role',
      },
      default: ROLES.RETAILER,
    },
    roleRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Role',
      default: null,
    },
    permissions: {
      type: [String],
      default: [],
    },

    avatar: {
      type: String,
      default: null,
    },
    address: {
      street: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      pincode: { type: String, default: '' },
      country: { type: String, default: 'India' },
    },
    businessName: {
      type: String,
      trim: true,
      default: '',
    },
    gstNumber: {
      type: String,
      trim: true,
      default: '',
    },
    panNumber: {
      type: String,
      trim: true,
      default: '',
      uppercase: true,
    },
    aadhaarNumber: {
      type: String,
      trim: true,
      default: '',
      select: false,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    isPhoneVerified: {
      type: Boolean,
      default: false,
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    blockedReason: {
      type: String,
      default: '',
    },
    blockedAt: {
      type: Date,
      default: null,
    },
    blockedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    loginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
      default: null,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
    lastLoginIp: {
      type: String,
      default: '',
    },
    passwordChangedAt: {
      type: Date,
      default: null,
    },

    passwordResetToken: {
      type: String,
      default: null,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
      default: null,
      select: false,
    },

    emailVerificationToken: {
      type: String,
      default: null,
      select: false,
    },
    emailVerificationExpires: {
      type: Date,
      default: null,
      select: false,
    },

    refreshTokens: {
      type: [String],
      default: [],
      select: false,
    },

    devices: {
      type: [deviceSchema],
      default: [],
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    wallet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Wallet',
      default: null,
    },

    commissionRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 1,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ phone: 1 }, { unique: true });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1, isBlocked: 1 });
userSchema.index({ createdBy: 1 });
userSchema.index({ parentId: 1 });

userSchema.virtual('isLocked').get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const rounds = parseInt(process.env.BCRYPT_ROUNDS, 10) || 12;
  this.password = await bcrypt.hash(this.password, rounds);
  this.passwordChangedAt = new Date();
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.incrementLoginAttempts = async function () {
  const maxAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS, 10) || 5;
  const lockMinutes = parseInt(process.env.ACCOUNT_LOCK_DURATION_MINUTES, 10) || 30;

  if (this.lockUntil && this.lockUntil < Date.now()) {
    this.loginAttempts = 1;
    this.lockUntil = null;
  } else {
    this.loginAttempts += 1;
    if (this.loginAttempts >= maxAttempts) {
      this.lockUntil = new Date(Date.now() + lockMinutes * 60 * 1000);
    }
  }
  return this.save();
};

userSchema.methods.resetLoginAttempts = async function () {
  this.loginAttempts = 0;
  this.lockUntil = null;
  return this.save();
};

userSchema.methods.changedPasswordAfter = function (jwtIssuedAt) {
  if (this.passwordChangedAt) {
    const changedTs = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return jwtIssuedAt < changedTs;
  }
  return false;
};

userSchema.set('toJSON', {
  virtuals: true,
  transform(doc, ret) {
    delete ret.password;
    delete ret.refreshTokens;
    delete ret.passwordResetToken;
    delete ret.passwordResetExpires;
    delete ret.emailVerificationToken;
    delete ret.emailVerificationExpires;
    delete ret.aadhaarNumber;
    return ret;
  },
});

const User = mongoose.model('User', userSchema);
export default User;
