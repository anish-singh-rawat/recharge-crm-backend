import { mroboticsRechargeService } from './recharge.service.js';

/**
 * MRobotics Status Service — thin wrapper around recharge status check.
 * Kept as a separate file per spec to allow independent extension.
 */
export const mroboticsStatusService = {
  async checkStatus(providerTxnId, clientTxnId = null) {
    return mroboticsRechargeService.checkStatus(providerTxnId, clientTxnId);
  },
};
