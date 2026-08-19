import { body } from 'express-validator';
import { validate, mongoIdParam } from './common.validator.js';

export const createApiKeyValidator = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('API key name is required')
    .isLength({ min: 3, max: 100 })
    .withMessage('Name must be 3–100 characters'),
  body('permissions')
    .optional()
    .isArray()
    .withMessage('permissions must be an array'),
  body('allowedIps')
    .optional()
    .isArray()
    .withMessage('allowedIps must be an array')
    .custom((ips) => {
      const ipRegex = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/;
      for (const ip of ips) {
        if (!ipRegex.test(ip)) {
          throw new Error(`Invalid IP address: ${ip}`);
        }
      }
      return true;
    }),
  body('expiresAt')
     .optional({ nullable: true })
    .isISO8601()
    .withMessage('expiresAt must be a valid ISO 8601 date')
    .toDate(),
  validate,
];

export const updateAllowedIpsValidator = [
  mongoIdParam('id'),
  body('allowedIps')
    .isArray()
    .withMessage('allowedIps must be an array')
    .custom((ips) => {
      const ipRegex = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/;
      for (const ip of ips) {
        if (!ipRegex.test(ip)) throw new Error(`Invalid IP address: ${ip}`);
      }
      return true;
    }),
  validate,
];

export const revokeApiKeyValidator = [
  mongoIdParam('id'),
  body('reason')
    .optional()
    .trim()
    .isLength({ max: 500 }),
  validate,
];
