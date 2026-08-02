import { body } from 'express-validator';
import { validate } from './common.validator.js';

export const updateSettingValidator = [
  body('value')
    .notEmpty()
    .withMessage('Setting value is required'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 }),
  validate,
];

export const bulkUpdateSettingsValidator = [
  body('settings')
    .isArray({ min: 1 })
    .withMessage('settings must be a non-empty array'),
  body('settings.*.key')
    .trim()
    .notEmpty()
    .withMessage('Each setting must have a key'),
  body('settings.*.value')
    .exists()
    .withMessage('Each setting must have a value'),
  validate,
];
