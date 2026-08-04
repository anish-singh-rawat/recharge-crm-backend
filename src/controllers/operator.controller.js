import { operatorService } from '../services/operator.service.js';
import { rechargePlanService } from '../services/rechargePlan.service.js';
import { sendSuccess, paginatedResponse } from '../utils/response.util.js';
import { asyncHandler } from '../utils/async.util.js';
import { HTTP_STATUS } from '../constants/http.js';
import { ValidationError } from '../helpers/error.helper.js';

export const operatorController = {

  createOperator: asyncHandler(async (req, res) => {
    const operator = await operatorService.createOperator(req.body, req.user.id);
    sendSuccess(res, {
      message: 'Operator created successfully',
      data: { operator },
      statusCode: HTTP_STATUS.CREATED,
    });
  }),

  listOperators: asyncHandler(async (req, res) => {
    const { items, total } = await operatorService.listOperators(req.query);
    sendSuccess(res, {
      message: 'Operators retrieved',
      data: paginatedResponse(items, {
        page: parseInt(req.query.page, 10) || 1,
        limit: parseInt(req.query.limit, 10) || 20,
        total,
      }),
    });
  }),

  listActiveOperators: asyncHandler(async (req, res) => {
    const operators = await operatorService.listActiveOperators(req.query.type || null);
    sendSuccess(res, { message: 'Active operators retrieved', data: { operators } });
  }),

  getOperator: asyncHandler(async (req, res) => {
    const operator = await operatorService.getOperator(req.params.id);
    sendSuccess(res, { message: 'Operator retrieved', data: { operator } });
  }),

  updateOperator: asyncHandler(async (req, res) => {
    const operator = await operatorService.updateOperator(req.params.id, req.body, req.user.id);
    sendSuccess(res, { message: 'Operator updated successfully', data: { operator } });
  }),

  deleteOperator: asyncHandler(async (req, res) => {
    await operatorService.deleteOperator(req.params.id, req.user.id);
    sendSuccess(res, { message: 'Operator deactivated successfully' });
  }),


  createCircle: asyncHandler(async (req, res) => {
    const circle = await operatorService.createCircle(req.body, req.user.id);
    sendSuccess(res, {
      message: 'Circle created successfully',
      data: { circle },
      statusCode: HTTP_STATUS.CREATED,
    });
  }),

  listCircles: asyncHandler(async (req, res) => {
    const circles = await operatorService.listCircles(req.query);
    sendSuccess(res, { message: 'Circles retrieved', data: { circles } });
  }),

  getCircle: asyncHandler(async (req, res) => {
    const circle = await operatorService.getCircle(req.params.id);
    sendSuccess(res, { message: 'Circle retrieved', data: { circle } });
  }),

  updateCircle: asyncHandler(async (req, res) => {
    const circle = await operatorService.updateCircle(req.params.id, req.body);
    sendSuccess(res, { message: 'Circle updated successfully', data: { circle } });
  }),


  createPlan: asyncHandler(async (req, res) => {
    const plan = await operatorService.createPlan(req.body, req.user.id);
    sendSuccess(res, {
      message: 'Plan created successfully',
      data: { plan },
      statusCode: HTTP_STATUS.CREATED,
    });
  }),

  listPlans: asyncHandler(async (req, res) => {
    const { items, total } = await operatorService.listPlans(req.query);
    sendSuccess(res, {
      message: 'Plans retrieved',
      data: paginatedResponse(items, {
        page: parseInt(req.query.page, 10) || 1,
        limit: parseInt(req.query.limit, 10) || 20,
        total,
      }),
    });
  }),

  getPlansByOperatorCircle: asyncHandler(async (req, res) => {
    const { operatorId, circleId } = req.query;
    const plans = await operatorService.getPlansByOperatorCircle(operatorId, circleId);
    sendSuccess(res, { message: 'Plans retrieved', data: { plans } });
  }),

  getPlan: asyncHandler(async (req, res) => {
    const plan = await operatorService.getPlan(req.params.id);
    sendSuccess(res, { message: 'Plan retrieved', data: { plan } });
  }),

  updatePlan: asyncHandler(async (req, res) => {
    const plan = await operatorService.updatePlan(req.params.id, req.body, req.user.id);
    sendSuccess(res, { message: 'Plan updated successfully', data: { plan } });
  }),

  deletePlan: asyncHandler(async (req, res) => {
    await operatorService.deletePlan(req.params.id, req.user.id);
    sendSuccess(res, { message: 'Plan deactivated successfully' });
  }),


  getPlanRecommendations: asyncHandler(async (req, res) => {
    const { operatorId, circleId } = req.query;

    if (!operatorId || !circleId) {
      throw new ValidationError('operatorId and circleId are required');
    }

    const result = await rechargePlanService.getPlans(operatorId, circleId);

    const popularPlans = result.plans.filter((p) => p.isPopular);
    const regularPlans = result.plans.filter((p) => !p.isPopular);

    sendSuccess(res, {
      message: 'Plan recommendations retrieved',
      data: {
        popularPlans,
        allPlans: result.plans,
        regularPlans,
        total: result.plans.length,
        source: result.source,          
        cachedAt: result.cachedAt ?? null,
        operator: result.operator,
        circle: result.circle,
      },
    });
  }),


  validatePlanAmount: asyncHandler(async (req, res) => {
    const { operatorId, circleId, amount } = req.query;

    if (!operatorId || !circleId || amount === undefined || amount === '') {
      throw new ValidationError('operatorId, circleId and amount are required');
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      throw new ValidationError('amount must be a positive number');
    }

    const result = await rechargePlanService.validateAmount(parsedAmount, operatorId, circleId);

    sendSuccess(res, {
      message: result.valid ? 'Plan found' : 'No matching plan',
      data: result,
    });
  }),
};
