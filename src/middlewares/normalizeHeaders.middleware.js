import { providerLogger } from "../config/logger.js";

const SENSITIVE_HEADERS = new Set(["x-api-key", "authorization", "cookie"]);

function maskValue(key, value) {
  if (!value || typeof value !== "string") return "****";
  if (SENSITIVE_HEADERS.has(key.toLowerCase())) {
    return value.length > 8
      ? `${value.slice(0, 4)}****${value.slice(-4)}`
      : "****";
  }
  return value;
}

function isValidHeaderValue(v) {
  return typeof v === "string" && v.length > 0 && v.length < 4096;
}

function parseHeaderObject(obj) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return null;
  const result = {};
  for (const [k, v] of Object.entries(obj)) {
    if (typeof k === "string" && k.length > 0 && isValidHeaderValue(v)) {
      result[k] = v;
    }
  }
  return Object.keys(result).length ? result : null;
}

/**
 * Extracts payload fields from object (mobileNumber, amount, operatorId, circleId, type, etc.)
 */
function extractPayloadParams(obj) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return {};
  const params = {};

  const mobile = obj.mobileNumber || obj.mobile || obj.number || obj.phone;
  if (mobile) params.mobileNumber = String(mobile).trim();

  const amount = obj.amount ?? obj.amt;
  if (amount !== undefined && amount !== null && amount !== "") {
    params.amount = Number(amount);
  }

  const op = obj.operatorId || obj.operator || obj.op;
  if (op) params.operatorId = String(op).trim();

  const circle = obj.circleId || obj.circle || obj.state;
  if (circle) params.circleId = String(circle).trim();

  const type = obj.type || obj.rechargeType;
  if (type) params.type = String(type).trim();

  return params;
}

/**
 * Fallback regex extractor for malformed/un-comma'd JSON in query strings
 */
function regexExtractFromQuery(str) {
  const extractedHeaders = {};
  const extractedParams = {};

  // Extract API key
  const apiKeyMatch = str.match(
    /["']?(?:x-api-key|apiKey|api_key|key|token)["']?\s*[:=]\s*["']?([a-zA-Z0-9_\-]+)["']?/i,
  );
  if (apiKeyMatch && apiKeyMatch[1]) {
    extractedHeaders["X-Api-Key"] = apiKeyMatch[1];
  }

  // Extract Content-Type
  const ctMatch = str.match(
    /["']?content-type["']?\s*[:=]\s*["']?([^"',\s}]+)["']?/i,
  );
  if (ctMatch && ctMatch[1]) {
    extractedHeaders["Content-Type"] = ctMatch[1];
  }

  // Extract mobileNumber
  const mobileMatch = str.match(
    /["']?(?:mobileNumber|mobile|number|phone)["']?\s*[:=]\s*["']?([6-9]\d{9})["']?/i,
  );
  if (mobileMatch && mobileMatch[1]) {
    extractedParams.mobileNumber = mobileMatch[1];
  }

  // Extract amount
  const amountMatch = str.match(
    /["']?(?:amount|amt)["']?\s*[:=]\s*["']?(\d+(?:\.\d+)?)["']?/i,
  );
  if (amountMatch && amountMatch[1]) {
    extractedParams.amount = Number(amountMatch[1]);
  }

  // Extract operatorId
  const opMatch = str.match(
    /["']?(?:operatorId|operator|op)["']?\s*[:=]\s*["']?([a-fA-F0-9]{24})["']?/i,
  );
  if (opMatch && opMatch[1]) {
    extractedParams.operatorId = opMatch[1];
  }

  // Extract circleId
  const circleMatch = str.match(
    /["']?(?:circleId|circle|state)["']?\s*[:=]\s*["']?([a-fA-F0-9]{24})["']?/i,
  );
  if (circleMatch && circleMatch[1]) {
    extractedParams.circleId = circleMatch[1];
  }

  // Extract type (ensure it doesn't match Content-Type)
  const typeMatch = str.match(
    /(?:^|[^a-zA-Z\-_])(?:type|rechargeType)["']?\s*[:=]\s*["']?([A-Za-z_]+)["']?/i,
  );
  if (typeMatch && typeMatch[1]) {
    extractedParams.type = typeMatch[1];
  }

  return { extractedHeaders, extractedParams };
}

/**
 * Parses headers and parameters embedded in a URL query string.
 *
 * Supported formats:
 *   /path?[{"X-Api-Key":"crm_xxx"}]
 *   /path?{"X-Api-Key":"crm_xxx","mobileNumber":"8288880000",...}
 *   /path?apiKey=crm_xxx&mobileNumber=8288880000&amount=10...
 *   /path?headers=[{"X-Api-Key":"crm_xxx"}]
 *
 * Returns { cleanUrl, extractedHeaders, extractedParams }
 */
export function parseHeadersFromUrl(rawUrl) {
  let extractedHeaders = {};
  let extractedParams = {};
  let cleanUrl = rawUrl;

  try {
    const qIdx = rawUrl.indexOf("?");
    if (qIdx === -1) return { cleanUrl, extractedHeaders, extractedParams };

    const base = rawUrl.slice(0, qIdx);
    const qs = rawUrl.slice(qIdx + 1);

    if (!qs) return { cleanUrl, extractedHeaders, extractedParams };

    let decoded = qs;
    try {
      decoded = decodeURIComponent(qs);
    } catch {
      decoded = qs;
    }

    const trimmed = decoded.trim();

    // Format 1: entire query is a JSON array or object ?[{...}] or ?{...}
    if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
      cleanUrl = base;
      let parsed = null;
      try {
        parsed = JSON.parse(trimmed);
      } catch {
        // Attempt regex extraction for malformed JSON (e.g. missing commas)
        const regexRes = regexExtractFromQuery(trimmed);
        Object.assign(extractedHeaders, regexRes.extractedHeaders);
        Object.assign(extractedParams, regexRes.extractedParams);
      }

      if (parsed) {
        const obj = Array.isArray(parsed) ? parsed[0] : parsed;
        const headers = parseHeaderObject(obj);
        if (headers) Object.assign(extractedHeaders, headers);
        const params = extractPayloadParams(obj);
        if (params) Object.assign(extractedParams, params);
      }

      return { cleanUrl, extractedHeaders, extractedParams };
    }

    // Format 2: standard query parameters
    const params = new URLSearchParams(qs);
    const headersParam = params.get("headers");
    if (headersParam) {
      try {
        const decodedParam = decodeURIComponent(headersParam);
        const parsed = JSON.parse(decodedParam);
        const obj = Array.isArray(parsed) ? parsed[0] : parsed;
        const headers = parseHeaderObject(obj);
        if (headers) Object.assign(extractedHeaders, headers);
      } catch {
        // ignore
      }
      params.delete("headers");
    }

    // Check query params for apiKey / x-api-key
    const queryApiKey =
      params.get("apiKey") ||
      params.get("api_key") ||
      params.get("X-Api-Key") ||
      params.get("x-api-key") ||
      params.get("key") ||
      params.get("token");
    if (queryApiKey) {
      extractedHeaders["X-Api-Key"] = queryApiKey;
    }

    // Extract query params for recharge
    const queryObj = Object.fromEntries(params.entries());
    const extractedFromQuery = extractPayloadParams(queryObj);
    Object.assign(extractedParams, extractedFromQuery);

    // If query string was malformed or regex needed
    if (!extractedHeaders["X-Api-Key"]) {
      const regexRes = regexExtractFromQuery(decoded);
      Object.assign(extractedHeaders, regexRes.extractedHeaders);
      Object.assign(extractedParams, regexRes.extractedParams);
    }

    const remaining = params.toString();
    cleanUrl = remaining ? `${base}?${remaining}` : base;
  } catch {
    // safety net — never throw
  }

  return { cleanUrl, extractedHeaders, extractedParams };
}

/**
 * Express middleware.
 * Detects headers and params embedded in URL query string, req.body keys, or req.query keys,
 * extracts them, cleans the URL, and merges them with existing request headers, query, and body.
 *
 * Handles rechargeinstant.com "QUERY STRING" POST format where the entire JSON blob
 * is sent as a single key in req.body like: { '{"X-Api-Key":"...","mobileNumber":"..."}': '' }
 */
export const normalizeHeaders = (req, res, next) => {
  try {
    const rawUrl = req.originalUrl || req.url || "";
    const { extractedHeaders, extractedParams } = parseHeadersFromUrl(rawUrl);

    // Also scan req.body and req.query keys — websites like rechargeinstant.com send
    // the entire JSON blob as a key in form-encoded POST body
    const scanTargets = [req.body, req.query];
    for (const target of scanTargets) {
      if (!target || typeof target !== "object") continue;
      for (const [k, v] of Object.entries(target)) {
        const candidate = (k || "") + (v ? `=${v}` : "");
        const trimmed = candidate.replace(/^=/, "").trim();

        // If key starts with { or [ it's an embedded JSON blob
        if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
          const { extractedHeaders: h2, extractedParams: p2 } = parseHeadersFromUrl(`/__tmp?${encodeURIComponent(trimmed)}`);
          Object.assign(extractedHeaders, h2);
          Object.assign(extractedParams, p2);
        } else {
          // Try regex on key+value pair
          const apiKeyM = candidate.match(/(crm_[a-zA-Z0-9]+)/i);
          if (apiKeyM && apiKeyM[1] && !extractedHeaders["X-Api-Key"]) {
            extractedHeaders["X-Api-Key"] = apiKeyM[1];
          }
        }
      }
    }

    if (Object.keys(extractedHeaders).length) {
      const masked = Object.fromEntries(
        Object.entries(extractedHeaders).map(([k, v]) => [k, maskValue(k, v)]),
      );
      providerLogger.debug("Extracted headers from URL", {
        maskedHeaders: masked,
      });

      for (const [key, value] of Object.entries(extractedHeaders)) {
        const lower = key.toLowerCase();
        if (!req.headers[lower]) {
          req.headers[lower] = value;
        }
      }
    }

    if (Object.keys(extractedParams).length) {
      // Merge extracted params into body (extracted params lose to explicit body values)
      req.body = { ...extractedParams, ...(req.body || {}) };
      req.query = { ...extractedParams, ...(req.query || {}) };

      // Clean up the raw JSON blob keys from req.body that came from form-encoded POST
      for (const k of Object.keys(req.body)) {
        if (k.startsWith("{") || k.startsWith("[")) {
          delete req.body[k];
        }
      }
    }

    // Clean relative req.url query string
    if (req.url && req.url.includes("?")) {
      req.url = req.url.slice(0, req.url.indexOf("?"));
    }
  } catch {
    // safety net — never block the request
  }

  next();
};

