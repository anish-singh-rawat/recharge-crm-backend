import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const required = [
  'MONGO_URI',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'WEBHOOK_SECRET',
  'API_KEY_ENCRYPTION_SECRET',
];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

const env = {
  app: {
    name: process.env.APP_NAME || 'RechargeCRM',
    version: process.env.APP_VERSION || '1.0.0',
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT, 10) || 8080,
    url: process.env.APP_URL || 'http://localhost:8080',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
    allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:5173').split(',').map((o) => o.trim()),
    isDev: process.env.NODE_ENV === 'development',
    isProd: process.env.NODE_ENV === 'production',
  },
  mongo: {
    uri: process.env.MONGO_URI,
    dbName: process.env.MONGO_DB_NAME || 'rechargecrmdb',
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  bcrypt: {
    rounds: parseInt(process.env.BCRYPT_ROUNDS, 10) || 12,
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000,
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
    authMax: parseInt(process.env.AUTH_RATE_LIMIT_MAX, 10) || 10,
    rechargeMax: parseInt(process.env.RECHARGE_RATE_LIMIT_MAX, 10) || 30,
  },
  redis: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB, 10) || 0,
  },
  cookie: {
    secret: process.env.COOKIE_SECRET,
    domain: process.env.COOKIE_DOMAIN || 'localhost',
  },
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    fromName: process.env.SMTP_FROM_NAME || 'RechargeCRM',
    fromEmail: process.env.SMTP_FROM_EMAIL || 'noreply@rechargecrmapp.com',
  },
  accountLock: {
    maxAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS, 10) || 5,
    durationMinutes: parseInt(process.env.ACCOUNT_LOCK_DURATION_MINUTES, 10) || 30,
  },
  mrobotics: {
    baseUrl: process.env.MROBOTICS_BASE_URL || 'https://api.mrobotics.in',
    apiKey: process.env.MROBOTICS_API_KEY,
    apiSecret: process.env.MROBOTICS_API_SECRET,
    memberId: process.env.MROBOTICS_MEMBER_ID,
    timeoutMs: parseInt(process.env.MROBOTICS_TIMEOUT_MS, 10) || 30000,
    retryCount: parseInt(process.env.MROBOTICS_RETRY_COUNT, 10) || 3,
    retryDelayMs: parseInt(process.env.MROBOTICS_RETRY_DELAY_MS, 10) || 1000,
  },
  retry: {
    maxAttempts: parseInt(process.env.RETRY_MAX_ATTEMPTS, 10) || 3,
    initialDelayMs: parseInt(process.env.RETRY_INITIAL_DELAY_MS, 10) || 1000,
    backoffMultiplier: parseFloat(process.env.RETRY_BACKOFF_MULTIPLIER) || 2,
    maxDelayMs: parseInt(process.env.RETRY_MAX_DELAY_MS, 10) || 30000,
  },
  webhook: {
    secret: process.env.WEBHOOK_SECRET,
    toleranceSeconds: parseInt(process.env.WEBHOOK_TOLERANCE_SECONDS, 10) || 300,
  },
  apiKey: {
    encryptionSecret: process.env.API_KEY_ENCRYPTION_SECRET,
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    dir: process.env.LOG_DIR || 'logs',
    maxSize: process.env.LOG_MAX_SIZE || '20m',
    maxFiles: process.env.LOG_MAX_FILES || '14d',
  },
  swagger: {
    enabled: process.env.SWAGGER_ENABLED === 'true',
  },
  wallet: {
    defaultLimit: parseFloat(process.env.WALLET_DEFAULT_LIMIT) || 100000,
    minRechargeAmount: parseFloat(process.env.WALLET_MIN_RECHARGE_AMOUNT) || 10,
    maxRechargeAmount: parseFloat(process.env.WALLET_MAX_RECHARGE_AMOUNT) || 10000,
    commissionRate: parseFloat(process.env.COMMISSION_RATE) || 0.02,
  },
  cron: {
    retrySchedule: process.env.CRON_RETRY_SCHEDULE || '*/5 * * * *',
    pendingCheckSchedule: process.env.CRON_PENDING_CHECK_SCHEDULE || '*/10 * * * *',
    logCleanupSchedule: process.env.CRON_LOG_CLEANUP_SCHEDULE || '0 2 * * *',
    settlementSchedule: process.env.CRON_SETTLEMENT_SCHEDULE || '0 0 * * *',
  },
  pagination: {
    defaultPageSize: parseInt(process.env.DEFAULT_PAGE_SIZE, 10) || 20,
    maxPageSize: parseInt(process.env.MAX_PAGE_SIZE, 10) || 100,
  },
  upload: {
    dir: process.env.UPLOAD_DIR || 'uploads',
    maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 5,
  },
};

export default env;
