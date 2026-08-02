import { Router } from 'express';
import { reportController } from '../controllers/report.controller.js';
import { authenticate } from '../middlewares/authenticate.middleware.js';
import { authorizeRoles, authorizePermissions } from '../middlewares/authorize.middleware.js';
import {
  salesReportValidator,
  rechargeReportValidator,
  walletReportValidator,
  commissionReportValidator,
} from '../validators/report.validator.js';
import { PERMISSIONS } from '../constants/permissions.js';
import { ROLES } from '../constants/roles.js';

const router = Router();


router.use(authenticate);

router.get('/dashboard', reportController.getDashboard);

router.get('/recharge/my', authorizePermissions(PERMISSIONS.REPORT_RECHARGE), rechargeReportValidator, reportController.getMyRechargeReport);

router.get('/wallet/my', authorizePermissions(PERMISSIONS.REPORT_WALLET), walletReportValidator, reportController.getMyWalletReport);

router.get('/sales', authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN), authorizePermissions(PERMISSIONS.REPORT_SALES), salesReportValidator, reportController.getSalesReport);

router.get('/sales/by-day', authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN), authorizePermissions(PERMISSIONS.REPORT_SALES), reportController.getSalesByDay);

router.get('/sales/by-operator', authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN), authorizePermissions(PERMISSIONS.REPORT_SALES), reportController.getSalesByOperator);

router.get('/recharge', authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN), authorizePermissions(PERMISSIONS.REPORT_RECHARGE), rechargeReportValidator, reportController.getRechargeReport);

router.get('/wallet', authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN), authorizePermissions(PERMISSIONS.REPORT_WALLET), walletReportValidator, reportController.getWalletReport);

router.get('/commission', authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN), authorizePermissions(PERMISSIONS.REPORT_COMMISSION), commissionReportValidator, reportController.getCommissionReport);

export default router;
