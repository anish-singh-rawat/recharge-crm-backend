import { query } from 'express-validator';
import { validate, paginationQuery, dateRangeQuery } from './common.validator.js';
import { RECHARGE_TYPE, TRANSACTION_STATUS } from '../constants/transaction.js';

export const salesReportValidator = [
  ...dateRangeQuery,
  ...paginationQuery,
  query('groupBy')
    .optional()
    .isIn(['day', 'week', 'month'])
    .withMessage('groupBy must be day, week, or month'),
  query('userId')
    .optional()
    .isMongoId()
    .withMessage('Invalid user ID'),
  validate,
];

export const rechargeReportValidator = [
  ...dateRangeQuery,
  ...paginationQuery,
  query('status')
    .optional()
    .isIn(Object.values(TRANSACTION_STATUS))
    .withMessage('Invalid status filter'),
  query('type')
    .optional()
    .isIn(Object.values(RECHARGE_TYPE))
    .withMessage('Invalid recharge type filter'),
  query('operatorId')
    .optional()
    .isMongoId()
    .withMessage('Invalid operator ID'),
  query('userId')
    .optional()
    .isMongoId()
    .withMessage('Invalid user ID'),
  validate,
];

export const walletReportValidator = [
  ...dateRangeQuery,
  ...paginationQuery,
  query('userId')
    .optional()
    .isMongoId()
    .withMessage('Invalid user ID'),
  query('type')
    .optional()
    .isIn(['CREDIT', 'DEBIT', 'REFUND', 'REVERSAL', 'COMMISSION', 'SETTLEMENT'])
    .withMessage('Invalid transaction type'),
  validate,
];

export const commissionReportValidator = [
  ...dateRangeQuery,
  ...paginationQuery,
  query('userId')
    .optional()
    .isMongoId()
    .withMessage('Invalid user ID'),
  validate,
];
