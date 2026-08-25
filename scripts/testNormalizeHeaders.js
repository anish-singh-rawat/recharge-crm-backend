import { parseHeadersFromUrl } from '../src/middlewares/normalizeHeaders.middleware.js';

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅  ${name}`);
    passed++;
  } catch (err) {
    console.log(`  ❌  ${name}`);
    console.log(`       ${err.message}`);
    failed++;
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg);
}

const BASE = '/api/v1/ext/recharge';

console.log('\n══════════════════════════════════════');
console.log('  normalizeHeaders — unit tests');
console.log('══════════════════════════════════════\n');

test('Normal URL — no headers in query', () => {
  const { cleanUrl, extractedHeaders } = parseHeadersFromUrl(BASE);
  assert(cleanUrl === BASE, `cleanUrl should be ${BASE}`);
  assert(Object.keys(extractedHeaders).length === 0, 'extractedHeaders should be empty');
});

test('Format 2 — ?[{"X-Api-Key":"crm_xxx"}]', () => {
  const raw = `${BASE}?[{"X-Api-Key":"crm_xxx","Content-Type":"application/json"}]`;
  const { cleanUrl, extractedHeaders } = parseHeadersFromUrl(raw);
  assert(cleanUrl === BASE, 'URL should be cleaned');
  assert(extractedHeaders['X-Api-Key'] === 'crm_xxx', 'X-Api-Key should be extracted');
  assert(extractedHeaders['Content-Type'] === 'application/json', 'Content-Type should be extracted');
});

test('Format 3 — URL-encoded header JSON', () => {
  const encoded = encodeURIComponent('[{"X-Api-Key":"crm_abc","Content-Type":"application/json"}]');
  const raw = `${BASE}?${encoded}`;
  const { cleanUrl, extractedHeaders } = parseHeadersFromUrl(raw);
  assert(cleanUrl === BASE, 'URL should be cleaned');
  assert(extractedHeaders['X-Api-Key'] === 'crm_abc', 'X-Api-Key should be extracted');
});

test('Format 4 — ?headers=[{...}]', () => {
  const raw = `${BASE}?headers=${encodeURIComponent('[{"X-Api-Key":"crm_def"}]')}`;
  const { cleanUrl, extractedHeaders } = parseHeadersFromUrl(raw);
  assert(cleanUrl === BASE, 'URL should be cleaned');
  assert(extractedHeaders['X-Api-Key'] === 'crm_def', 'X-Api-Key should be extracted');
});

test('Format 4 with extra params — other params preserved', () => {
  const raw = `${BASE}?page=1&headers=${encodeURIComponent('[{"X-Api-Key":"crm_ghi"}]')}`;
  const { cleanUrl, extractedHeaders } = parseHeadersFromUrl(raw);
  assert(cleanUrl.includes('page=1'), 'page param should be preserved');
  assert(!cleanUrl.includes('headers='), 'headers param should be removed');
  assert(extractedHeaders['X-Api-Key'] === 'crm_ghi', 'X-Api-Key should be extracted');
});

test('Malformed header JSON — does not throw, returns empty', () => {
  const raw = `${BASE}?[not-valid-json]`;
  const { cleanUrl, extractedHeaders } = parseHeadersFromUrl(raw);
  assert(Object.keys(extractedHeaders).length === 0, 'should return empty headers for malformed JSON');
});

test('Non-string header values ignored', () => {
  const raw = `${BASE}?[{"X-Api-Key":"crm_valid","bad-header":12345}]`;
  const { cleanUrl, extractedHeaders } = parseHeadersFromUrl(raw);
  assert(extractedHeaders['X-Api-Key'] === 'crm_valid', 'valid header should be kept');
  assert(!('bad-header' in extractedHeaders), 'non-string value should be ignored');
});

test('Missing API key — empty extracted headers (no X-Api-Key in URL)', () => {
  const raw = `${BASE}?[{"Content-Type":"application/json"}]`;
  const { extractedHeaders } = parseHeadersFromUrl(raw);
  assert(!('X-Api-Key' in extractedHeaders), 'no X-Api-Key key in result');
  assert(extractedHeaders['Content-Type'] === 'application/json', 'Content-Type still extracted');
});

test('Precedence — existing headers NOT overridden by URL headers', () => {
  const raw = `${BASE}?[{"X-Api-Key":"from-url"}]`;
  const { extractedHeaders } = parseHeadersFromUrl(raw);

  const reqHeaders = { 'x-api-key': 'from-request' };
  for (const [k, v] of Object.entries(extractedHeaders)) {
    if (!reqHeaders[k.toLowerCase()]) reqHeaders[k.toLowerCase()] = v;
  }
  assert(reqHeaders['x-api-key'] === 'from-request', 'request header must not be overridden');
});

test('Direct JSON object (not wrapped in array) — ?{"X-Api-Key":"crm_obj"}', () => {
  const raw = `${BASE}?${encodeURIComponent('{"X-Api-Key":"crm_obj"}')}`;
  const { cleanUrl, extractedHeaders } = parseHeadersFromUrl(raw);
  assert(cleanUrl === BASE, 'URL should be cleaned');
  assert(extractedHeaders['X-Api-Key'] === 'crm_obj', 'X-Api-Key should be extracted');
});

test('User format — raw un-comma JSON in query string with recharge payload', () => {
  const raw = `${BASE}?{ "X-Api-Key": "crm_e95b5dd1daae531d36a06ef8d29936840d585b2a90401f46", "Content-Type": "application/json" "mobileNumber": "8288880000", "amount": 10, "operatorId": "6a6f8d11d8fcb29986f98350", "circleId": "6a6f8d11d8fcb29986f98338", "type": "MOBILE_PREPAID" }`;
  const { cleanUrl, extractedHeaders, extractedParams } = parseHeadersFromUrl(raw);
  assert(cleanUrl === BASE, 'URL should be cleaned');
  assert(extractedHeaders['X-Api-Key'] === 'crm_e95b5dd1daae531d36a06ef8d29936840d585b2a90401f46', 'X-Api-Key should be extracted');
  assert(extractedParams.mobileNumber === '8288880000', 'mobileNumber should be extracted');
  assert(extractedParams.amount === 10, 'amount should be extracted');
  assert(extractedParams.operatorId === '6a6f8d11d8fcb29986f98350', 'operatorId should be extracted');
});

test('Standard GET Query Params — ?apiKey=...&mobileNumber=...&amount=10', () => {
  const raw = `${BASE}?apiKey=crm_test123&mobileNumber=8288880000&amount=10&operatorId=6a6f8d11d8fcb29986f98350`;
  const { extractedHeaders, extractedParams } = parseHeadersFromUrl(raw);
  assert(extractedHeaders['X-Api-Key'] === 'crm_test123', 'apiKey param should be converted to X-Api-Key header');
  assert(extractedParams.mobileNumber === '8288880000', 'mobileNumber should be extracted');
  assert(extractedParams.amount === 10, 'amount should be extracted');
});

console.log(`\n══════════════════════════════════════`);
console.log(`  ${passed} passed  |  ${failed} failed`);
console.log(`══════════════════════════════════════\n`);
process.exit(failed > 0 ? 1 : 0);
