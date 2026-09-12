import { realroboRechargeService } from './recharge.service.js';
import { realroboWebhookService } from './webhook.service.js';
import { realroboMapperService } from './mapper.service.js';

export const realroboProvider = {
  recharge: (params) => realroboRechargeService.doRecharge(params),
  checkStatus: (txnId) => realroboRechargeService.checkStatus(txnId),
  checkWebhookDuplicate: (payload) => realroboWebhookService.checkDuplicate(payload),
  normaliseWebhook: (payload) => realroboWebhookService.normalise(payload),
  logWebhook: (data) => realroboWebhookService.logWebhook(data),
  mapResponse: (raw) => realroboMapperService.mapRechargeResponse(raw),
};

export {
  realroboRechargeService,
  realroboWebhookService,
  realroboMapperService,
};
