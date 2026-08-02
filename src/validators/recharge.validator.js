import { body, param, query } from 'express-validator';
import { validate, mongoIdParam, paginationQuery, dateRangeQuery } from './common.validator.js';
import { RECHARGE_TYPE } from '../constants/transaction.js';

export const initiateRechargeValidator = [
  body('mobileNumber')
    .trim()
    .notEmpty()
    .withMessage('Mobile number is required')
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Please provide a valid 10-digit mobile number'),
  body('amount')
    .isFloat({ min: 1, max: 10000 })
    .withMessage('Amount must be between ₹1 and ₹10,000')
    .toFloat(),
  body('operatorId')
    .notEmpty()
    .withMessage('Operator is required')
    .isMongoId()
    .withMessage('Invalid operator ID'),
  body('circleId')
    .optional()
    .isMongoId()
    .withMessage('Invalid circle ID'),
  body('type')
    .notEmpty()
    .withMessage('Recharge type is required')
    .isIn(Object.values(RECHARGE_TYPE))
    .withMessage(`type must be one of: ${Object.values(RECHARGE_TYPE).join(', ')}`),
  validate,
];

export const rechargeStatusValidator = [
  param('txnId')
    .trim()
    .notEmpty()
    .withMessage('Transaction ID is required'),
  validate,
];

export const rechargeListValidator = [
  ...paginationQuery,
  ...dateRangeQuery,
  query('status')
    .optional()
    .isIn(['INITIATED', 'PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'REFUNDED', 'REVERSED', 'TIMEOUT'])
    .withMessage('Invalid status filter'),
  query('type')
    .optional()
    .isIn(Object.values(RECHARGE_TYPE))
    .withMessage('Invalid recharge type filter'),
  query('mobileNumber')
    .optional()
    .trim()
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Invalid mobile number filter'),
  validate,
];

export const retryRechargeValidator = [
  param('txnId')
    .trim()
    .notEmpty()
    .withMessage('Transaction ID is required'),
  validate,
];

export const refundRechargeValidator = [
  param('txnId')
    .trim()
    .notEmpty()
    .withMessage('Transaction ID is required'),
  body('reason')
    .trim()
    .notEmpty()
    .withMessage('Refund reason is required')
    .isLength({ min: 5, max: 500 })
    .withMessage('Reason must be 5–500 characters'),
  validate,
];
