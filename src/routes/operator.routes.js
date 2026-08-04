import { Router } from 'express';
import { operatorController } from '../controllers/operator.controller.js';
import { authenticate } from '../middlewares/authenticate.middleware.js';
import { authorizeRoles, authorizePermissions } from '../middlewares/authorize.middleware.js';
import {
  createOperatorValidator,
  updateOperatorValidator,
  operatorListValidator,
  createCircleValidator,
  updateCircleValidator,
} from '../validators/operator.validator.js';
import {
  createPlanValidator,
  updatePlanValidator,
  planListValidator,
} from '../validators/plan.validator.js';
import { mongoIdParam } from '../validators/common.validator.js';
import { PERMISSIONS } from '../constants/permissions.js';
import { ROLES } from '../constants/roles.js';

const router = Router();


router.use(authenticate);


router.get('/active', authorizePermissions(PERMISSIONS.OPERATOR_LIST), operatorController.listActiveOperators);

router.get('/', authorizePermissions(PERMISSIONS.OPERATOR_LIST), operatorListValidator, operatorController.listOperators);

router.post('/', authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN), authorizePermissions(PERMISSIONS.OPERATOR_CREATE), createOperatorValidator, operatorController.createOperator);

router.get('/:id', [mongoIdParam('id')], authorizePermissions(PERMISSIONS.OPERATOR_READ), operatorController.getOperator);

router.put('/:id', authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN), authorizePermissions(PERMISSIONS.OPERATOR_UPDATE), updateOperatorValidator, operatorController.updateOperator);

router.delete('/:id', [mongoIdParam('id')], authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN), authorizePermissions(PERMISSIONS.OPERATOR_DELETE), operatorController.deleteOperator);


router.get('/circles/all', authorizePermissions(PERMISSIONS.CIRCLE_LIST), operatorController.listCircles);

router.post('/circles', authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN), authorizePermissions(PERMISSIONS.CIRCLE_CREATE), createCircleValidator, operatorController.createCircle);

router.get('/circles/:id', [mongoIdParam('id')], authorizePermissions(PERMISSIONS.CIRCLE_READ), operatorController.getCircle);

router.put('/circles/:id', authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN), authorizePermissions(PERMISSIONS.CIRCLE_UPDATE), updateCircleValidator, operatorController.updateCircle);


router.get('/plans/by-operator', authorizePermissions(PERMISSIONS.PLAN_LIST), operatorController.getPlansByOperatorCircle);

router.get('/plans/recommendations', authorizePermissions(PERMISSIONS.PLAN_LIST), operatorController.getPlanRecommendations);

router.get('/plans/validate', authorizePermissions(PERMISSIONS.PLAN_LIST), operatorController.validatePlanAmount);

router.get('/plans', authorizePermissions(PERMISSIONS.PLAN_LIST), planListValidator, operatorController.listPlans);

router.post('/plans', authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN), authorizePermissions(PERMISSIONS.PLAN_CREATE), createPlanValidator, operatorController.createPlan);

router.get('/plans/:id', [mongoIdParam('id')], authorizePermissions(PERMISSIONS.PLAN_READ), operatorController.getPlan);

router.put('/plans/:id', authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN), authorizePermissions(PERMISSIONS.PLAN_UPDATE), updatePlanValidator, operatorController.updatePlan);

router.delete('/plans/:id', [mongoIdParam('id')], authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN), authorizePermissions(PERMISSIONS.PLAN_DELETE), operatorController.deletePlan);

export default router;
