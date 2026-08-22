import { body } from 'express-validator';
import { validate, emailField, passwordField, phoneField } from './common.validator.js';

export const loginValidator = [
  body('identifier')
    .trim()
    .notEmpty()
    .withMessage('Email or phone number is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  body('deviceId')
    .optional()
    .trim()
    .isLength({ max: 128 })
    .withMessage('deviceId too long'),
  body('deviceName')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('deviceName too long'),
  validate,
];

export const registerValidator = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be 2–100 characters'),
  emailField('email'),
  phoneField('phone'),
  passwordField('password'),
  body('confirmPassword')
    .notEmpty()
    .withMessage('Confirm password is required')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),
  body('businessName')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Business name too long'),
  validate,
];

export const forgotPasswordValidator = [
  emailField('email'),
  validate,
];

export const resetPasswordValidator = [
  body('token')
    .trim()
    .notEmpty()
    .withMessage('Reset token is required'),
  passwordField('password'),
  body('confirmPassword')
    .notEmpty()
    .withMessage('Confirm password is required')
    .custom((value, { req }) => {
      if (value !== req.body.password) throw new Error('Passwords do not match');
      return true;
    }),
  validate,
];

export const changePasswordValidator = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  passwordField('newPassword'),
  body('confirmNewPassword')
    .notEmpty()
    .withMessage('Confirm new password is required')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) throw new Error('Passwords do not match');
      return true;
    }),
  validate,
];

export const refreshTokenValidator = [
  body('refreshToken')
    .trim()
    .notEmpty()
    .withMessage('Refresh token is required'),
  validate,
];

export const updateProfileValidator = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be 2–100 characters'),
  body('businessName')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Business name too long'),
  body('gstNumber')
    .optional()
    .trim()
    .matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/)
    .withMessage('Invalid GST number format'),
  body('panNumber')
    .optional()
    .trim()
    .matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/)
    .withMessage('Invalid PAN number format'),
  body('address.street').optional().trim().isLength({ max: 200 }),
  body('address.city').optional().trim().isLength({ max: 100 }),
  body('address.state').optional().trim().isLength({ max: 100 }),
  body('address.pincode')
    .optional()
    .trim()
    .matches(/^\d{6}$/)
    .withMessage('Pincode must be 6 digits'),
  validate,
];

export const updateContactValidator = [
  body('phone')
    .optional()
    .trim()
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Enter a valid 10-digit Indian mobile number'),
  body('email')
    .optional()
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Enter a valid email address'),
  body().custom((_, { req }) => {
    if (!req.body.phone && !req.body.email) {
      throw new Error('Provide at least phone or email to update');
    }
    return true;
  }),
  validate,
];
