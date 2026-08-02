import { body, query } from 'express-validator';
import {
  validate,
  mongoIdParam,
  emailField,
  phoneField,
  passwordField,
  paginationQuery,
} from './common.validator.js';
import { ROLES } from '../constants/roles.js';

export const createUserValidator = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be 2–100 characters'),
  emailField('email'),
  phoneField('phone'),
  passwordField('password'),
  body('role')
    .notEmpty()
    .withMessage('Role is required')
    .isIn(Object.values(ROLES))
    .withMessage(`Role must be one of: ${Object.values(ROLES).join(', ')}`),
  body('businessName')
    .optional()
    .trim()
    .isLength({ max: 200 }),
  body('commissionRate')
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage('Commission rate must be between 0 and 1')
    .toFloat(),
  validate,
];

export const updateUserValidator = [
  mongoIdParam('id'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be 2–100 characters'),
  body('businessName')
    .optional()
    .trim()
    .isLength({ max: 200 }),
  body('commissionRate')
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage('Commission rate must be between 0 and 1')
    .toFloat(),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be boolean')
    .toBoolean(),
  body('permissions')
    .optional()
    .isArray()
    .withMessage('permissions must be an array'),
  validate,
];

export const userListValidator = [
  ...paginationQuery,
  query('role')
    .optional()
    .isIn(Object.values(ROLES))
    .withMessage('Invalid role filter'),
  query('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be boolean')
    .toBoolean(),
  query('search')
    .optional()
    .trim()
    .isLength({ max: 100 }),
  validate,
];

export const blockUserValidator = [
  mongoIdParam('id'),
  body('reason')
    .trim()
    .notEmpty()
    .withMessage('Block reason is required')
    .isLength({ min: 5, max: 500 }),
  validate,
];
