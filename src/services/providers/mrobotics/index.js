import { mroboticsRechargeService } from './recharge.service.js';
import { mroboticsStatusService } from './status.service.js';
import { mroboticsBalanceService } from './balance.service.js';
import { mroboticsOperatorService } from './operator.service.js';
import { mroboticsPlansService } from './plans.service.js';
import { mroboticsCircleService } from './circle.service.js';
import { mroboticsRefundService } from './refund.service.js';
import { mroboticsWebhookService } from './webhook.service.js';
import { mroboticsAuthService } from './auth.service.js';
import { signatureService } from './signature.service.js';
import { mapperService } from './mapper.service.js';

/**
 * MRobotics Provider — unified facade.
 *
 * All public service methods in one object. This is what recharge.service.js
 * and webhook handlers import — they never import individual sub-services directly.
 */
export const mroboticsProvider = {
  // ── Core recharge ─────────────────────────────────────────────────────────
  recharge: (params) => mroboticsRechargeService.doRecharge(params),
  checkStatus: (providerTxnId, clientTxnId) =>
    mroboticsStatusService.checkStatus(providerTxnId, clientTxnId),

  // ── Account ───────────────────────────────────────────────────────────────
  getBalance: () => mroboticsBalanceService.getBalance(),

  // ── Operators / Circles / Plans ───────────────────────────────────────────
  getOperators: (type) => mroboticsOperatorService.getOperators(type),
  detectOperator: (mobile) => mroboticsOperatorService.detectOperator(mobile),
  getPlans: (params) => mroboticsPlansService.getPlans(params),
  getCircles: () => mroboticsCircleService.getCircles(),

  // ── Refund ────────────────────────────────────────────────────────────────
  requestRefund: (params) => mroboticsRefundService.requestRefund(params),

  // ── Webhooks ──────────────────────────────────────────────────────────────
  verifyWebhookSignature: (payload, sig) =>
    mroboticsWebhookService.verifySignature(payload, sig),
  checkWebhookDuplicate: (payload) => mroboticsWebhookService.checkDuplicate(payload),
  normaliseWebhook: (payload) => mroboticsWebhookService.normalise(payload),
  logWebhook: (data) => mroboticsWebhookService.logWebhook(data),

  // ── Auth / Internals ──────────────────────────────────────────────────────
  getToken: () => mroboticsAuthService.getToken(),
  invalidateToken: () => mroboticsAuthService.invalidate(),
  generateSignature: (params) => signatureService.generate(params),
  mapResponse: (raw) => mapperService.mapRechargeResponse(raw),
};

// Named exports for individual services (for unit testing)
export {
  mroboticsRechargeService,
  mroboticsStatusService,
  mroboticsBalanceService,
  mroboticsOperatorService,
  mroboticsPlansService,
  mroboticsCircleService,
  mroboticsRefundService,
  mroboticsWebhookService,
  mroboticsAuthService,
  signatureService,
  mapperService,
};
