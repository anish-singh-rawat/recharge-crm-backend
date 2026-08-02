import { mroboticsProvider } from '../services/providers/mrobotics/index.js';
import { rechargeProviderRepository } from '../repositories/provider.repository.js';
import { sendSuccess } from '../utils/response.util.js';
import { asyncHandler } from '../utils/async.util.js';

export const providerController = {
  getProviderBalance: asyncHandler(async (req, res) => {
    const result = await mroboticsProvider.getBalance();
    // Update stored balance
    rechargeProviderRepository.updateBalance('MROBOTICS', result.balance).catch(() => {});
    sendSuccess(res, { message: 'Provider balance retrieved', data: result });
  }),

  getProviders: asyncHandler(async (req, res) => {
    const providers = await rechargeProviderRepository.findActive();
    sendSuccess(res, { message: 'Providers retrieved', data: { providers } });
  }),

  getProviderOperators: asyncHandler(async (req, res) => {
    const operators = await mroboticsProvider.getOperators(req.query.type || null);
    sendSuccess(res, { message: 'Provider operators retrieved', data: { operators } });
  }),

  getProviderCircles: asyncHandler(async (req, res) => {
    const circles = await mroboticsProvider.getCircles();
    sendSuccess(res, { message: 'Provider circles retrieved', data: { circles } });
  }),

  getProviderPlans: asyncHandler(async (req, res) => {
    const { operatorCode, circleCode } = req.query;
    const plans = await mroboticsProvider.getPlans({ operatorCode, circleCode });
    sendSuccess(res, { message: 'Provider plans retrieved', data: { plans } });
  }),

  detectOperator: asyncHandler(async (req, res) => {
    const { mobile } = req.query;
    const result = await mroboticsProvider.detectOperator(mobile);
    sendSuccess(res, { message: 'Operator detected', data: result });
  }),
};
