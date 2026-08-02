import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import hpp from 'hpp';
import mongoSanitize from 'express-mongo-sanitize';
import swaggerUi from 'swagger-ui-express';

import env from './config/env.js';
import swaggerSpec from './config/swagger.js';
import { requestIdMiddleware, requestResponseLogger } from './middlewares/requestLogger.middleware.js';
import { generalRateLimiter } from './middlewares/rateLimiter.middleware.js';
import { notFoundHandler, globalErrorHandler } from './middlewares/errorHandler.middleware.js';
import { xssMiddleware } from './middlewares/xss.middleware.js';
import { maintenanceMiddleware } from './middlewares/maintenance.middleware.js';
import apiRoutes from './routes/index.js';
import webhookRouter from './handlers/webhook.handler.js';

const app = express();

app.set('trust proxy', 1);

app.use(helmet({
  crossOriginResourcePolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
}));

app.use(cors({
  origin(origin, callback) {
    if (!origin || env.app.allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Request-Id', 'X-Correlation-Id'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}));

app.use(compression());
app.use(cookieParser(env.cookie.secret));
app.use(hpp());
app.use(mongoSanitize());

app.use(requestIdMiddleware);
app.use(requestResponseLogger);

app.use('/api/v1/webhooks', express.json({ limit: '1mb' }), webhookRouter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(xssMiddleware);
app.use(generalRateLimiter);
app.use(maintenanceMiddleware);

if (env.swagger.enabled) {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'Recharge CRM API',
    customCss: '.swagger-ui .topbar { display: none }',
    swaggerOptions: { persistAuthorization: true },
  }));
  app.get('/api-docs.json', (req, res) => res.json(swaggerSpec));
}

app.use('/api/v1', apiRoutes);

app.use(notFoundHandler);
app.use(globalErrorHandler);

export default app;
