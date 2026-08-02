import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const LOG_DIR = process.env.LOG_DIR
  ? path.resolve(process.cwd(), process.env.LOG_DIR)
  : path.resolve(__dirname, '../../logs');

const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const MAX_SIZE = process.env.LOG_MAX_SIZE || '20m';
const MAX_FILES = process.env.LOG_MAX_FILES || '14d';

const { combine, timestamp, errors, json, colorize, printf, splat } = winston.format;

const devFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  splat(),
  printf(({ level, message, timestamp: ts, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
    return `${ts} [${level}]: ${stack || message}${metaStr}`;
  }),
);

const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  splat(),
  json(),
);

const fileTransportOptions = (filename, level) => ({
  dirname: LOG_DIR,
  filename: `${filename}-%DATE%.log`,
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: MAX_SIZE,
  maxFiles: MAX_FILES,
  level,
  format: prodFormat,
});

const transports = [
  new DailyRotateFile(fileTransportOptions('combined', 'debug')),
  new DailyRotateFile(fileTransportOptions('error', 'error')),
];

if (process.env.NODE_ENV !== 'production') {
  transports.push(
    new winston.transports.Console({ format: devFormat }),
  );
} else {
  transports.push(
    new winston.transports.Console({
      level: 'warn',
      format: prodFormat,
    }),
  );
}

const logger = winston.createLogger({
  level: LOG_LEVEL,
  defaultMeta: { service: 'recharge-crm' },
  transports,
  exitOnError: false,
});

export const authLogger = logger.child({ module: 'auth' });
export const walletLogger = logger.child({ module: 'wallet' });
export const rechargeLogger = logger.child({ module: 'recharge' });
export const webhookLogger = logger.child({ module: 'webhook' });
export const cronLogger = logger.child({ module: 'cron' });
export const providerLogger = logger.child({ module: 'provider' });

export default logger;
