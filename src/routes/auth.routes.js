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
  updateContactValidator,
} from '../validators/auth.validator.js';
import { authorizeRoles } from '../middlewares/authorize.middleware.js';
import { ROLES } from '../constants/roles.js';
import { mongoIdParam } from '../validators/common.validator.js';

const router = Router();



router.post('/register', authRateLimiter, registerValidator, authController.register);

router.post('/login', authRateLimiter, loginValidator, authController.login);

router.post('/refresh-token', refreshTokenValidator, authController.refreshToken);

router.post('/forgot-password', passwordResetRateLimiter, forgotPasswordValidator, authController.forgotPassword);

router.post('/reset-password', resetPasswordValidator, authController.resetPassword);


router.use(authenticate);

router.post('/logout', authController.logout);

router.post('/logout-all', authController.logoutAll);

router.get('/profile', authController.getProfile);
router.put('/profile', updateProfileValidator, authController.updateProfile);
router.patch('/profile/contact', updateContactValidator, authController.updateContact);
router.patch('/profile/avatar', uploadMiddleware(uploadAvatar), authController.updateAvatar);

router.post('/change-password', changePasswordValidator, authController.changePassword);

router.get('/sessions', authController.getSessions);
router.get('/login-history', authController.getLoginHistory);

router.patch(
  '/users/:userId/contact',
  [mongoIdParam('userId')],
  authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  updateContactValidator,
  authController.updateContact,
);

export default router;
