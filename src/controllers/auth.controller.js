import { authService } from '../services/auth.service.js';
import { sendSuccess } from '../utils/response.util.js';
import { asyncHandler } from '../utils/async.util.js';
import { HTTP_STATUS } from '../constants/http.js';

export const authController = {
  register: asyncHandler(async (req, res) => {
    const user = await authService.register(req.body, req.user?.id || null);
    sendSuccess(res, {
      message: 'Account created successfully',
      data: { user },
      statusCode: HTTP_STATUS.CREATED,
    });
  }),

  login: asyncHandler(async (req, res) => {
    const { identifier, password, deviceId, deviceName, deviceType } = req.body;
    const deviceInfo = {
      deviceId,
      deviceName,
      deviceType,
      userAgent: req.headers['user-agent'] || '',
    };
    const result = await authService.login(identifier, password, deviceInfo, req.ip);

    // Set refresh token as HttpOnly cookie
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    sendSuccess(res, {
      message: 'Login successful',
      data: {
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      },
    });
  }),

  refreshToken: asyncHandler(async (req, res) => {
    const token = req.body.refreshToken || req.cookies?.refreshToken;
    const tokens = await authService.refreshToken(token);

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    sendSuccess(res, {
      message: 'Token refreshed',
      data: tokens,
    });
  }),

  logout: asyncHandler(async (req, res) => {
    const token = req.body.refreshToken || req.cookies?.refreshToken;
    await authService.logout(token, req.user.id);
    res.clearCookie('refreshToken');
    sendSuccess(res, { message: 'Logged out successfully' });
  }),

  logoutAll: asyncHandler(async (req, res) => {
    await authService.logoutAll(req.user.id);
    res.clearCookie('refreshToken');
    sendSuccess(res, { message: 'Logged out from all devices' });
  }),

  forgotPassword: asyncHandler(async (req, res) => {
    await authService.forgotPassword(req.body.email);
    sendSuccess(res, {
      message: 'If this email is registered, a password reset link has been sent',
    });
  }),

  resetPassword: asyncHandler(async (req, res) => {
    const { token, password } = req.body;
    await authService.resetPassword(token, password);
    sendSuccess(res, { message: 'Password reset successfully. Please log in.' });
  }),

  changePassword: asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    await authService.changePassword(req.user.id, currentPassword, newPassword);
    sendSuccess(res, { message: 'Password changed successfully. Please log in again.' });
  }),

  getProfile: asyncHandler(async (req, res) => {
    const { userService } = await import('../services/user.service.js');
    const user = await userService.getUser(req.user.id);
    sendSuccess(res, { message: 'Profile retrieved', data: { user } });
  }),

  updateProfile: asyncHandler(async (req, res) => {
    const user = await authService.updateProfile(req.user.id, req.body);
    sendSuccess(res, { message: 'Profile updated successfully', data: { user } });
  }),

  getSessions: asyncHandler(async (req, res) => {
    const sessions = await authService.getSessions(req.user.id);
    sendSuccess(res, { message: 'Active sessions retrieved', data: { sessions } });
  }),

  getLoginHistory: asyncHandler(async (req, res) => {
    const history = await authService.getLoginHistory(req.user.id);
    sendSuccess(res, { message: 'Login history retrieved', data: { history } });
  }),
};
