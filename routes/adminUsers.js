'use strict';

const express = require('express');
const authenticate = require('../middleware/auth');
const authorizeRoles = require('../middleware/authorize');
const validateRequest = require('../utils/validateRequest');
const { ROLES } = require('../constants/roles');
const {
  customerController,
  agentController,
  salesMemberController,
  employeeController,
} = require('../controllers/adminUserController');
const {
  idParamRule,
  listRules,
  createRules,
  updateRules,
  employeeCreateRules,
  employeeUpdateRules,
} = require('../validations/adminUserValidation');

function buildAdminMutatingRouter(controller) {
  const router = express.Router();

  router.get(
    '/',
    authenticate,
    authorizeRoles(ROLES.ADMIN, ROLES.SALES_MEMBER),
    listRules,
    validateRequest,
    (req, res, next) => controller.list(req, res, next)
  );
  router.get(
    '/:id',
    authenticate,
    authorizeRoles(ROLES.ADMIN, ROLES.SALES_MEMBER),
    idParamRule,
    validateRequest,
    (req, res, next) => controller.getById(req, res, next)
  );

  router.post(
    '/',
    authenticate,
    authorizeRoles(ROLES.ADMIN),
    createRules,
    validateRequest,
    (req, res, next) => controller.create(req, res, next)
  );
  router.patch(
    '/:id',
    authenticate,
    authorizeRoles(ROLES.ADMIN),
    updateRules,
    validateRequest,
    (req, res, next) => controller.update(req, res, next)
  );
  router.delete(
    '/:id',
    authenticate,
    authorizeRoles(ROLES.ADMIN),
    idParamRule,
    validateRequest,
    (req, res, next) => controller.remove(req, res, next)
  );

  return router;
}

function buildAdminOnlyRouter(controller, { create = createRules, update = updateRules } = {}) {
  const router = express.Router();
  router.use(authenticate, authorizeRoles(ROLES.ADMIN));

  router.get('/', listRules, validateRequest, (req, res, next) => controller.list(req, res, next));
  router.post('/', create, validateRequest, (req, res, next) => controller.create(req, res, next));
  router.get('/:id', idParamRule, validateRequest, (req, res, next) => controller.getById(req, res, next));
  router.patch('/:id', update, validateRequest, (req, res, next) => controller.update(req, res, next));
  router.delete('/:id', idParamRule, validateRequest, (req, res, next) => controller.remove(req, res, next));

  return router;
}

module.exports = {
  customersRouter: buildAdminMutatingRouter(customerController),
  agentsRouter: buildAdminMutatingRouter(agentController),
  salesMembersRouter: buildAdminOnlyRouter(salesMemberController),
  employeesRouter: buildAdminOnlyRouter(employeeController, {
    create: employeeCreateRules,
    update: employeeUpdateRules,
  }),
};
