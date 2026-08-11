'use strict';

const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const authorizeRoles = require('../middleware/authorize');
const validateRequest = require('../utils/validateRequest');
const { ROLES } = require('../constants/roles');
const controller = require('../controllers/siteVisitController');
const {
  submitRules,
  idParam,
  rejectRules,
  assignRules,
  dropRules,
  validateAgentRules,
} = require('../validations/siteVisitValidation');

const ADMIN_SALES = [ROLES.ADMIN, ROLES.SALES_MEMBER];
const EMPLOYEE_PIPELINE = [ROLES.ADMIN, ROLES.SALES_MEMBER, ROLES.EMPLOYEE];
const VISIT_READ = [ROLES.ADMIN, ROLES.CUSTOMER, ROLES.AGENT, ROLES.SALES_MEMBER, ROLES.EMPLOYEE];

router.get(
  '/agents/validate',
  authenticate,
  validateAgentRules,
  validateRequest,
  (req, res, next) => controller.validateAgent(req, res, next)
);

router.post(
  '/',
  authenticate,
  authorizeRoles(ROLES.CUSTOMER),
  submitRules,
  validateRequest,
  (req, res, next) => controller.submit(req, res, next)
);

router.get(
  '/mine',
  authenticate,
  authorizeRoles(ROLES.CUSTOMER),
  (req, res, next) => controller.listMine(req, res, next)
);

router.get(
  '/admin',
  authenticate,
  authorizeRoles(ROLES.ADMIN),
  (req, res, next) => controller.listAdmin(req, res, next)
);

router.get(
  '/agent',
  authenticate,
  authorizeRoles(ROLES.AGENT),
  (req, res, next) => controller.listAgent(req, res, next)
);

router.get(
  '/employee',
  authenticate,
  authorizeRoles(ROLES.EMPLOYEE),
  (req, res, next) => controller.listEmployee(req, res, next)
);

router.get(
  '/:id',
  authenticate,
  authorizeRoles(...VISIT_READ),
  idParam,
  validateRequest,
  (req, res, next) => controller.getById(req, res, next)
);

router.post(
  '/:id/approve',
  authenticate,
  authorizeRoles(ROLES.ADMIN),
  idParam,
  validateRequest,
  (req, res, next) => controller.approve(req, res, next)
);

router.post(
  '/:id/reject',
  authenticate,
  authorizeRoles(ROLES.ADMIN),
  rejectRules,
  validateRequest,
  (req, res, next) => controller.reject(req, res, next)
);

router.post(
  '/:id/assign',
  authenticate,
  authorizeRoles(ROLES.ADMIN),
  assignRules,
  validateRequest,
  (req, res, next) => controller.assign(req, res, next)
);

router.post(
  '/:id/assign-employee',
  authenticate,
  authorizeRoles(...ADMIN_SALES),
  idParam,
  validateRequest,
  (req, res, next) => controller.assignEmployee(req, res, next)
);

router.patch(
  '/:id/employee-workflow',
  authenticate,
  authorizeRoles(...EMPLOYEE_PIPELINE),
  idParam,
  validateRequest,
  (req, res, next) => controller.updateEmployeeVisit(req, res, next)
);

router.post(
  '/:id/internal-remarks',
  authenticate,
  authorizeRoles(...EMPLOYEE_PIPELINE),
  idParam,
  validateRequest,
  (req, res, next) => controller.internalRemarks(req, res, next)
);

router.post(
  '/:id/complete',
  authenticate,
  authorizeRoles(ROLES.ADMIN, ROLES.AGENT, ROLES.EMPLOYEE),
  idParam,
  validateRequest,
  (req, res, next) => controller.markCompleted(req, res, next)
);

router.post(
  '/:id/purchase-interest',
  authenticate,
  authorizeRoles(ROLES.CUSTOMER),
  idParam,
  validateRequest,
  (req, res, next) => controller.purchaseInterest(req, res, next)
);

router.post(
  '/:id/drop',
  authenticate,
  authorizeRoles(ROLES.CUSTOMER),
  dropRules,
  validateRequest,
  (req, res, next) => controller.drop(req, res, next)
);

router.post(
  '/:id/close',
  authenticate,
  authorizeRoles(ROLES.ADMIN),
  idParam,
  validateRequest,
  (req, res, next) => controller.close(req, res, next)
);

module.exports = router;
