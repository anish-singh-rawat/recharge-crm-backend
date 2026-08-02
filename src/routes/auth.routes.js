import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';
import { authenticate } from '../middlewares/authenticate.middleware.js';
import { authRateLimiter, passwordResetRateLimiter } from '../middlewares/rateLimiter.middleware.js';
import { uploadAvatar, uploadMiddleware } from '../middlewares/upload.middleware.js';
import {
  loginValidator,
  registerValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
  changePasswordValidator,
  refreshTokenValidator,
  updateProfileValidator,
} from '../validators/auth.validator.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication & session management
 */

// ── Public routes ─────────────────────────────────────────────────────────────

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login with email/phone and password
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [identifier, password]
 *             properties:
 *               identifier: { type: string, example: "9876543210" }
 *               password:   { type: string, example: "Secret@123" }
 *               deviceId:   { type: string }
 *               deviceName: { type: string }
 *     responses:
 *       200: { description: Login successful }
 *       401: { description: Invalid credentials }
 *       429: { description: Too many attempts }
 */
router.post('/login', authRateLimiter, loginValidator, authController.login);

/**
 * @swagger
 * /auth/refresh-token:
 *   post:
 *     summary: Refresh access token
 *     tags: [Auth]
 *     security: []
 */
router.post('/refresh-token', refreshTokenValidator, authController.refreshToken);

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     summary: Request password reset email
 *     tags: [Auth]
 *     security: []
 */
router.post('/forgot-password', passwordResetRateLimiter, forgotPasswordValidator, authController.forgotPassword);

/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     summary: Reset password using token from email
 *     tags: [Auth]
 *     security: []
 */
router.post('/reset-password', resetPasswordValidator, authController.resetPassword);

// ── Protected routes ──────────────────────────────────────────────────────────

router.use(authenticate);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout from current session
 *     tags: [Auth]
 */
router.post('/logout', authController.logout);

/**
 * @swagger
 * /auth/logout-all:
 *   post:
 *     summary: Logout from all devices
 *     tags: [Auth]
 */
router.post('/logout-all', authController.logoutAll);

/**
 * @swagger
 * /auth/profile:
 *   get:
 *     summary: Get current user profile
 *     tags: [Auth]
 *   put:
 *     summary: Update current user profile
 *     tags: [Auth]
 */
router.get('/profile', authController.getProfile);
router.put('/profile', updateProfileValidator, authController.updateProfile);
router.patch('/profile/avatar', uploadMiddleware(uploadAvatar), authController.updateProfile);

/**
 * @swagger
 * /auth/change-password:
 *   post:
 *     summary: Change password (authenticated)
 *     tags: [Auth]
 */
router.post('/change-password', changePasswordValidator, authController.changePassword);

/**
 * @swagger
 * /auth/sessions:
 *   get:
 *     summary: Get active sessions
 *     tags: [Auth]
 */
router.get('/sessions', authController.getSessions);

/**
 * @swagger
 * /auth/login-history:
 *   get:
 *     summary: Get login history
 *     tags: [Auth]
 */
router.get('/login-history', authController.getLoginHistory);

export default router;
