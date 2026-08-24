import { providerLogger } from '../config/logger.js';

const SENSITIVE_HEADERS = new Set(['x-api-key', 'authorization', 'cookie']);

function maskValue(key, value) {
  if (SENSITIVE_HEADERS.has(key.toLowerCase())) {
    return value.length > 8
      ? `${value.slice(0, 4)}****${value.slice(-4)}`
      : '****';
  }
  return value;
}

function isValidHeaderValue(v) {
  return typeof v === 'string' && v.length > 0 && v.length < 4096;
}

function parseHeaderObject(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return null;
  const result = {};
  for (const [k, v] of Object.entries(obj)) {
    if (typeof k === 'string' && k.length > 0 && isValidHeaderValue(v)) {
      result[k] = v;
    }
  }
  return Object.keys(result).length ? result : null;
}

/**
 * Parses headers embedded in a malformed URL query string.
 *
 * Supported formats:
 *   /path?[{"X-Api-Key":"crm_xxx"}]
 *   /path?%5B%7B%22X-Api-Key%22...%7D%5D
 *   /path?headers=[{"X-Api-Key":"crm_xxx"}]
 *
 * Returns { cleanUrl, extractedHeaders }
 */
export function parseHeadersFromUrl(rawUrl) {
  const extractedHeaders = {};
  let cleanUrl = rawUrl;

  try {
    const qIdx = rawUrl.indexOf('?');
    if (qIdx === -1) return { cleanUrl, extractedHeaders };

    const base = rawUrl.slice(0, qIdx);
    const qs = rawUrl.slice(qIdx + 1);

    if (!qs) return { cleanUrl, extractedHeaders };

    const decoded = decodeURIComponent(qs);

    // Format 1/2/3: entire query is a JSON array or object  ?[{...}] or ?{...}
    const trimmed = decoded.trim();
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        const obj = Array.isArray(parsed) ? parsed[0] : parsed;
        const headers = parseHeaderObject(obj);
        if (headers) {
          Object.assign(extractedHeaders, headers);
          cleanUrl = base;
          return { cleanUrl, extractedHeaders };
        }
      } catch {
        // not valid JSON — fall through to param parsing
      }
    }

    // Format 4: ?headers=[{...}] or ?headers={...}
    const params = new URLSearchParams(qs);
    const headersParam = params.get('headers');
    if (headersParam) {
      try {
        const decodedParam = decodeURIComponent(headersParam);
        const parsed = JSON.parse(decodedParam);
        const obj = Array.isArray(parsed) ? parsed[0] : parsed;
        const headers = parseHeaderObject(obj);
        if (headers) {
          Object.assign(extractedHeaders, headers);
          params.delete('headers');
          const remaining = params.toString();
          cleanUrl = remaining ? `${base}?${remaining}` : base;
          return { cleanUrl, extractedHeaders };
        }
      } catch {
        // not valid — ignore
      }
    }
  } catch {
    // never throw — malformed optional headers should not crash the app
  }

  return { cleanUrl, extractedHeaders };
}

/**
 * Express middleware.
 * Detects headers embedded in URL query string, extracts them, cleans the URL,
 * and merges them with existing request headers.
 * Explicit request headers always take precedence over URL-extracted headers.
 */
export const normalizeHeaders = (req, res, next) => {
  try {
    const rawUrl = req.url;
    const { cleanUrl, extractedHeaders } = parseHeadersFromUrl(rawUrl);

    if (Object.keys(extractedHeaders).length) {
      const masked = Object.fromEntries(
        Object.entries(extractedHeaders).map(([k, v]) => [k, maskValue(k, v)]),
      );
      providerLogger.debug('Extracted headers from URL', { maskedHeaders: masked });

      // Normalise keys to lowercase for comparison
      for (const [key, value] of Object.entries(extractedHeaders)) {
        const lower = key.toLowerCase();
        // Only inject if the request doesn't already have this header
        if (!req.headers[lower]) {
          req.headers[lower] = value;
        }
      }

      // Rewrite cleaned URL so downstream routing/logging uses the clean path
      req.url = cleanUrl;
    }
  } catch {
    // safety net — never block the request
  }

  next();
};
