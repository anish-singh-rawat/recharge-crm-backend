import { Router } from 'express';
import { healthController } from '../controllers/health.controller.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Health
 *   description: System health checks
 */

/**
 * @swagger
 * /ping:
 *   get:
 *     summary: Ping the server
 *     tags: [Health]
 *     security: []
 *     responses:
 *       200: { description: pong }
 */
router.get('/ping', healthController.ping);

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Full health check with DB status
 *     tags: [Health]
 *     security: []
 */
router.get('/health', healthController.health);

/**
 * @swagger
 * /version:
 *   get:
 *     summary: API version info
 *     tags: [Health]
 *     security: []
 */
router.get('/version', healthController.version);

export default router;
