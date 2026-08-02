import mongoose from 'mongoose';
import { NOTIFICATION_TYPE, NOTIFICATION_CHANNEL } from '../constants/notification.js';

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: Object.values(NOTIFICATION_TYPE),
      default: NOTIFICATION_TYPE.INFO,
    },
    channel: {
      type: String,
      enum: Object.values(NOTIFICATION_CHANNEL),
      default: NOTIFICATION_CHANNEL.IN_APP,
    },
    event: {
      type: String,
      trim: true,
      default: '',
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
      default: null,
    },
    referenceId: {
      type: String,
      default: null,
    },
    referenceType: {
      type: String,
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    isBroadcast: {
      type: Boolean,
      default: false,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ isBroadcast: 1, createdAt: -1 });
notificationSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 90 * 24 * 60 * 60 },
);

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
