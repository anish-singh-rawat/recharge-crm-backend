import { body, query } from 'express-validator';
import { validate, mongoIdParam, paginationQuery } from './common.validator.js';

export const createPlanValidator = [
  body('operator')
    .notEmpty()
    .withMessage('Operator is required')
    .isMongoId()
    .withMessage('Invalid operator ID'),
  body('circle')
    .notEmpty()
    .withMessage('Circle is required')
    .isMongoId()
    .withMessage('Invalid circle ID'),
  body('amount')
    .isFloat({ min: 0 })
    .withMessage('Amount must be a positive number')
    .toFloat(),
  body('talktime')
    .optional()
    .isFloat({ min: 0 })
    .toFloat(),
  body('validity')
    .optional()
    .trim()
    .isLength({ max: 50 }),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 }),
  body('dataAmount')
    .optional()
    .trim()
    .isLength({ max: 50 }),
  body('planType')
    .optional()
    .trim()
    .isLength({ max: 50 }),
  body('isActive')
    .optional()
    .isBoolean()
    .toBoolean(),
  body('isPopular')
    .optional()
    .isBoolean()
    .toBoolean(),
  validate,
];

export const updatePlanValidator = [
  mongoIdParam('id'),
  body('amount').optional().isFloat({ min: 0 }).toFloat(),
  body('validity').optional().trim().isLength({ max: 50 }),
  body('description').optional().trim().isLength({ max: 500 }),
  body('isActive').optional().isBoolean().toBoolean(),
  body('isPopular').optional().isBoolean().toBoolean(),
  validate,
];

export const planListValidator = [
  ...paginationQuery,
  query('operator')
    .optional()
    .isMongoId()
    .withMessage('Invalid operator ID'),
  query('circle')
    .optional()
    .isMongoId()
    .withMessage('Invalid circle ID'),
  query('isActive')
    .optional()
    .isBoolean()
    .toBoolean(),
  query('minAmount')
    .optional()
    .isFloat({ min: 0 })
    .toFloat(),
  query('maxAmount')
    .optional()
    .isFloat({ min: 0 })
    .toFloat(),
  validate,
];
