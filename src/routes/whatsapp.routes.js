import { Router } from 'express';
import { whatsappController } from '../controllers/whatsapp.controller.js';
import { authenticate } from '../middlewares/authenticate.middleware.js';
import { authorizeRoles } from '../middlewares/authorize.middleware.js';
import { ROLES } from '../constants/roles.js';

const router = Router();

router.get('/stream', whatsappController.streamStatus);

router.use(authenticate);
router.use(authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN));

router.get('/status', whatsappController.getStatus);
router.post('/connect', whatsappController.connect);
router.post('/regenerate-qr', whatsappController.regenerateQR);
router.post('/disconnect', whatsappController.disconnect);
router.post('/send-message', whatsappController.sendMessage);

export default router;
