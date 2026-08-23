import { body, query } from 'express-validator';
import { validate, mongoIdParam, paginationQuery } from './common.validator.js';
import { RECHARGE_TYPE } from '../constants/transaction.js';

export const createOperatorValidator = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Operator name is required')
    .isLength({ max: 100 }),
  body('code')
    .trim()
    .notEmpty()
    .withMessage('Operator code is required')
    .isAlphanumeric()
    .withMessage('Code must be alphanumeric')
    .toUpperCase(),
  body('type')
    .notEmpty()
    .withMessage('Operator type is required')
    .isIn(Object.values(RECHARGE_TYPE))
    .withMessage(`type must be one of: ${Object.values(RECHARGE_TYPE).join(', ')}`),
  body('providerCode')
    .optional()
    .trim()
    .isLength({ max: 50 }),
  body('minAmount')
    .optional()
    .isFloat({ min: 0 })
    .toFloat(),
  body('maxAmount')
    .optional()
    .isFloat({ min: 0 })
    .toFloat(),
  body('commission')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .toFloat(),
  body('isActive')
    .optional()
    .isBoolean()
    .toBoolean(),
  validate,
];

export const updateOperatorValidator = [
  mongoIdParam('id'),
  body('name').optional().trim().isLength({ max: 100 }),
  body('providerCode').optional().trim().isLength({ max: 50 }),
  body('realroboProviderCode').optional().trim().isLength({ max: 50 }),
  body('minAmount').optional().isFloat({ min: 0 }).toFloat(),
  body('maxAmount').optional().isFloat({ min: 0 }).toFloat(),
  body('commission').optional().isFloat({ min: 0, max: 100 }).toFloat(),
  body('isActive').optional().isBoolean().toBoolean(),
  body('primaryProvider')
    .optional({ nullable: true })
    .isIn(['mrobotics', 'realrobo', null])
    .withMessage('primaryProvider must be mrobotics, realrobo, or null'),
  body('secondaryProvider')
    .optional({ nullable: true })
    .isIn(['mrobotics', 'realrobo', null])
    .withMessage('secondaryProvider must be mrobotics, realrobo, or null'),
  validate,
];

export const operatorListValidator = [
  ...paginationQuery,
  query('type')
    .optional()
    .isIn(Object.values(RECHARGE_TYPE))
    .withMessage('Invalid type filter'),
  query('isActive')
    .optional()
    .isBoolean()
    .toBoolean(),
  validate,
];

export const createCircleValidator = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Circle name is required')
    .isLength({ max: 100 }),
  body('code')
    .trim()
    .notEmpty()
    .withMessage('Circle code is required')
    .isAlphanumeric()
    .withMessage('Code must be alphanumeric')
    .toUpperCase(),
  body('providerCode')
    .optional()
    .trim()
    .isLength({ max: 50 }),
  body('isActive')
    .optional()
    .isBoolean()
    .toBoolean(),
  validate,
];

export const updateCircleValidator = [
  mongoIdParam('id'),
  body('name').optional().trim().isLength({ max: 100 }),
  body('providerCode').optional().trim().isLength({ max: 50 }),
  body('isActive').optional().isBoolean().toBoolean(),
  validate,
];
