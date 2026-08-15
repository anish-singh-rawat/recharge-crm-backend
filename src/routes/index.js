import { Router } from 'express';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import walletRoutes from './wallet.routes.js';
import rechargeRoutes from './recharge.routes.js';
import operatorRoutes from './operator.routes.js';
import notificationRoutes from './notification.routes.js';
import reportRoutes from './report.routes.js';
import apiKeyRoutes from './apiKey.routes.js';
import settingRoutes from './setting.routes.js';
import providerRoutes from './provider.routes.js';
import logRoutes from './log.routes.js';
import healthRoutes from './health.routes.js';
import externalRoutes from './external.routes.js';

const router = Router();

router.use('/', healthRoutes);
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/wallet', walletRoutes);
router.use('/recharge', rechargeRoutes);
router.use('/operators', operatorRoutes);
router.use('/notifications', notificationRoutes);
router.use('/reports', reportRoutes);
router.use('/api-keys', apiKeyRoutes);
router.use('/settings', settingRoutes);
router.use('/provider', providerRoutes);
router.use('/logs', logRoutes);
router.use('/ext', externalRoutes);

export default router;
