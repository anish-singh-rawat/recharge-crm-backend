import { Router } from 'express';
import { partnerOrderController } from '../controllers/partnerOrder.controller.js';
import { authenticate } from '../middlewares/authenticate.middleware.js';
import { authorizeRoles } from '../middlewares/authorize.middleware.js';
import { excelUploadMiddleware } from '../middlewares/excelUpload.middleware.js';
import { ROLES } from '../constants/roles.js';

const router = Router();

// Strictly restricted to SUPER_ADMIN and ADMIN
router.use(authenticate);
router.use(authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN));

router.post('/import', excelUploadMiddleware, partnerOrderController.importExcel);
router.get('/', partnerOrderController.listOrders);
router.get('/summary', partnerOrderController.getSummary);
router.patch('/partner/:prmId/mobile', partnerOrderController.updatePartnerMobile);
router.patch('/:id/payment', partnerOrderController.updateOrderPayment);
router.patch('/bulk-mark-paid', partnerOrderController.bulkMarkAsPaid);
router.post('/bulk-delete', partnerOrderController.bulkDelete);
router.delete('/bulk-delete', partnerOrderController.bulkDelete);
router.delete('/:id', partnerOrderController.deleteOrder);
router.post('/send-notifications', partnerOrderController.sendNotifications);

export default router;
