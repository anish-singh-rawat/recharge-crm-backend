import { Router } from 'express';
import { healthController } from '../controllers/health.controller.js';

const router = Router();


router.get('/ping', healthController.ping);

router.get('/health', healthController.health);

router.get('/version', healthController.version);

export default router;
