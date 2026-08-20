import { realroboRechargeService } from './recharge.service.js';

export const realroboProvider = {
  recharge: (params) => realroboRechargeService.doRecharge(params),
  checkStatus: (txnId) => realroboRechargeService.checkStatus(txnId),
};
