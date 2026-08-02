import { mroboticsRechargeService } from './recharge.service.js';

export const mroboticsStatusService = {
  async checkStatus(providerTxnId, clientTxnId = null) {
    return mroboticsRechargeService.checkStatus(providerTxnId, clientTxnId);
  },
};
