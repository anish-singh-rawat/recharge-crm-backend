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

export const mroboticsProvider = {
  recharge: (params) => mroboticsRechargeService.doRecharge(params),
  checkStatus: (providerTxnId, clientTxnId) =>
    mroboticsStatusService.checkStatus(providerTxnId, clientTxnId),

  getBalance: () => mroboticsBalanceService.getBalance(),

  getOperators: (type) => mroboticsOperatorService.getOperators(type),
  detectOperator: (mobile) => mroboticsOperatorService.detectOperator(mobile),
  getPlans: (params) => mroboticsPlansService.getPlans(params),
  getCircles: () => mroboticsCircleService.getCircles(),

  requestRefund: (params) => mroboticsRefundService.requestRefund(params),

  verifyWebhookSignature: (payload, sig) =>
    mroboticsWebhookService.verifySignature(payload, sig),
  checkWebhookDuplicate: (payload) => mroboticsWebhookService.checkDuplicate(payload),
  normaliseWebhook: (payload) => mroboticsWebhookService.normalise(payload),
  logWebhook: (data) => mroboticsWebhookService.logWebhook(data),

  getToken: () => mroboticsAuthService.getToken(),
  invalidateToken: () => mroboticsAuthService.invalidate(),
  generateSignature: (params) => signatureService.generate(params),
  mapResponse: (raw) => mapperService.mapRechargeResponse(raw),
};

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
