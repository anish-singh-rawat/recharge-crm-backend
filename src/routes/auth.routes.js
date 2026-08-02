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
router.patch('/profile/avatar', uploadMiddleware(uploadAvatar), authController.updateProfile);

router.post('/change-password', changePasswordValidator, authController.changePassword);

router.get('/sessions', authController.getSessions);

router.get('/login-history', authController.getLoginHistory);

export default router;
