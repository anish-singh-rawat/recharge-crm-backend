import { body, query } from 'express-validator';
import { validate, mongoIdParam, paginationQuery } from './common.validator.js';
import { NOTIFICATION_TYPE, NOTIFICATION_CHANNEL } from '../constants/notification.js';

export const createNotificationValidator = [
  body('userId')
    .notEmpty()
    .withMessage('User ID is required')
    .isMongoId()
    .withMessage('Invalid user ID'),
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 200 }),
  body('message')
    .trim()
    .notEmpty()
    .withMessage('Message is required')
    .isLength({ max: 1000 }),
  body('type')
    .optional()
    .isIn(Object.values(NOTIFICATION_TYPE))
    .withMessage(`type must be one of: ${Object.values(NOTIFICATION_TYPE).join(', ')}`),
  body('channel')
    .optional()
    .isIn(Object.values(NOTIFICATION_CHANNEL))
    .withMessage(`channel must be one of: ${Object.values(NOTIFICATION_CHANNEL).join(', ')}`),
  validate,
];

export const broadcastNotificationValidator = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 200 }),
  body('message')
    .trim()
    .notEmpty()
    .withMessage('Message is required')
    .isLength({ max: 1000 }),
  body('type')
    .optional()
    .isIn(Object.values(NOTIFICATION_TYPE)),
  body('roles')
    .optional()
    .isArray()
    .withMessage('roles must be an array'),
  validate,
];

export const notificationListValidator = [
  ...paginationQuery,
  query('isRead')
    .optional()
    .isBoolean()
    .toBoolean(),
  validate,
];
