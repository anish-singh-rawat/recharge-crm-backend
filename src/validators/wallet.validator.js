import { body } from 'express-validator';
import { validate, mongoIdParam, amountField, paginationQuery, dateRangeQuery } from './common.validator.js';

export const creditWalletValidator = [
  mongoIdParam('userId'),
  amountField('amount', 1, 1000000),
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ max: 500 })
    .withMessage('Description too long'),
  body('remarks')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Remarks too long'),
  body('referenceId')
    .optional()
    .trim()
    .isLength({ max: 100 }),
  validate,
];

export const debitWalletValidator = [
  mongoIdParam('userId'),
  amountField('amount', 1, 1000000),
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ max: 500 })
    .withMessage('Description too long'),
  body('remarks')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Remarks too long'),
  validate,
];

export const freezeWalletValidator = [
  mongoIdParam('userId'),
  body('reason')
    .trim()
    .notEmpty()
    .withMessage('Freeze reason is required')
    .isLength({ min: 5, max: 500 })
    .withMessage('Reason must be 5–500 characters'),
  validate,
];

export const unfreezeWalletValidator = [
  mongoIdParam('userId'),
  body('reason')
    .optional()
    .trim()
    .isLength({ max: 500 }),
  validate,
];

export const walletStatementValidator = [
  mongoIdParam('userId'),
  ...paginationQuery,
  ...dateRangeQuery,
  validate,
];

export const walletLedgerValidator = [
  ...paginationQuery,
  ...dateRangeQuery,
  validate,
];
