import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const xssClean = require('xss-clean');

export const xssMiddleware = xssClean();
