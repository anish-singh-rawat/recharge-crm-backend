import { body, param, query, validationResult } from 'express-validator';
import { HTTP_STATUS } from '../constants/http.js';

/**
 * Central validation result handler — attach as last middleware in a chain.
 */
export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();

  const formatted = errors.array().map((err) => ({
    field: err.path || err.param,
    message: err.msg,
    value: err.value,
  }));

  return res.status(HTTP_STATUS.UNPROCESSABLE_ENTITY).json({
    success: false,
    message: 'Validation failed',
    errors: formatted,
  });
};

// ── Reusable field validators ─────────────────────────────────────────────────

export const mongoIdParam = (paramName = 'id') =>
  param(paramName)
    .isMongoId()
    .withMessage(`${paramName} must be a valid MongoDB ObjectId`);

export const paginationQuery = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('page must be a positive integer')
    .toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit must be between 1 and 100')
    .toInt(),
];

export const dateRangeQuery = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('startDate must be a valid ISO 8601 date')
    .toDate(),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('endDate must be a valid ISO 8601 date')
    .toDate(),
];

export const phoneField = (field = 'phone') =>
  body(field)
    .trim()
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Please provide a valid 10-digit Indian mobile number');

export const emailField = (field = 'email') =>
  body(field)
    .trim()
    .toLowerCase()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail();

export const passwordField = (field = 'password') =>
  body(field)
    .isLength({ min: 8, max: 64 })
    .withMessage('Password must be 8–64 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
    .withMessage(
      'Password must contain at least one uppercase, lowercase, number, and special character (@$!%*?&)',
    );

export const amountField = (field = 'amount', min = 1, max = 100000) =>
  body(field)
    .isFloat({ min, max })
    .withMessage(`${field} must be a number between ${min} and ${max}`)
    .toFloat();
