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
  rescheduleRules,
  reasonRules,
  vehicleRules,
  followUpRules,
  startRules,
} = require('../validations/siteVisitValidation');

const ADMIN_SALES = [ROLES.ADMIN, ROLES.SALES_MEMBER];
const EMPLOYEE_PIPELINE = [ROLES.ADMIN, ROLES.SALES_MEMBER, ROLES.EMPLOYEE];
const VISIT_READ = [ROLES.ADMIN, ROLES.CUSTOMER, ROLES.AGENT, ROLES.SALES_MEMBER, ROLES.EMPLOYEE];
const VISIT_PARTICIPANTS = [ROLES.ADMIN, ROLES.CUSTOMER, ROLES.AGENT, ROLES.SALES_MEMBER, ROLES.EMPLOYEE];
const VISIT_STAFF = [ROLES.ADMIN, ROLES.AGENT, ROLES.SALES_MEMBER, ROLES.EMPLOYEE];

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

router.post(
  '/from-interest/:interestId',
  authenticate,
  authorizeRoles(ROLES.CUSTOMER),
  submitRules,
  validateRequest,
  (req, res, next) => controller.submitFromInterest(req, res, next)
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
  authorizeRoles(...ADMIN_SALES),
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
  authorizeRoles(...VISIT_STAFF),
  idParam,
  validateRequest,
  (req, res, next) => controller.markCompleted(req, res, next)
);

router.post(
  '/:id/reschedule',
  authenticate,
  authorizeRoles(...ADMIN_SALES),
  rescheduleRules,
  validateRequest,
  (req, res, next) => controller.reschedule(req, res, next)
);

router.post(
  '/:id/request-reschedule',
  authenticate,
  authorizeRoles(ROLES.CUSTOMER),
  rescheduleRules,
  validateRequest,
  (req, res, next) => controller.requestReschedule(req, res, next)
);

router.post(
  '/:id/confirm',
  authenticate,
  authorizeRoles(ROLES.ADMIN),
  idParam,
  validateRequest,
  (req, res, next) => controller.confirm(req, res, next)
);

router.post(
  '/:id/approve-vehicle',
  authenticate,
  authorizeRoles(...ADMIN_SALES),
  idParam,
  validateRequest,
  (req, res, next) => controller.approveVehicle(req, res, next)
);

router.post(
  '/:id/assign-vehicle',
  authenticate,
  authorizeRoles(...ADMIN_SALES),
  vehicleRules,
  validateRequest,
  (req, res, next) => controller.assignVehicleCompatible(req, res, next)
);

router.post(
  '/:id/reject-vehicle',
  authenticate,
  authorizeRoles(...ADMIN_SALES),
  reasonRules,
  validateRequest,
  (req, res, next) => controller.rejectVehicle(req, res, next)
);

router.post(
  '/:id/accept-vehicle',
  authenticate,
  authorizeRoles(ROLES.CUSTOMER),
  idParam,
  validateRequest,
  (req, res, next) => controller.acceptVehicle(req, res, next)
);

router.post(
  '/:id/request-vehicle-change',
  authenticate,
  authorizeRoles(ROLES.CUSTOMER),
  reasonRules,
  validateRequest,
  (req, res, next) => controller.requestVehicleChange(req, res, next)
);

router.post(
  '/:id/remarks',
  authenticate,
  authorizeRoles(...VISIT_PARTICIPANTS),
  reasonRules,
  validateRequest,
  (req, res, next) => controller.remarks(req, res, next)
);

router.post(
  '/:id/cancel',
  authenticate,
  authorizeRoles(...VISIT_PARTICIPANTS),
  reasonRules,
  validateRequest,
  (req, res, next) => controller.cancel(req, res, next)
);

router.post(
  '/:id/no-show',
  authenticate,
  authorizeRoles(...VISIT_STAFF),
  reasonRules,
  validateRequest,
  (req, res, next) => controller.noShow(req, res, next)
);

router.post(
  '/:id/start',
  authenticate,
  authorizeRoles(...VISIT_STAFF),
  startRules,
  validateRequest,
  (req, res, next) => controller.start(req, res, next)
);

router.post(
  '/:id/vehicle/request',
  authenticate,
  authorizeRoles(...VISIT_PARTICIPANTS),
  vehicleRules,
  validateRequest,
  (req, res, next) => controller.requestVehicle(req, res, next)
);

router.post(
  '/:id/vehicle/assign',
  authenticate,
  authorizeRoles(...ADMIN_SALES),
  vehicleRules,
  validateRequest,
  (req, res, next) => controller.assignVehicle(req, res, next)
);

router.patch(
  '/:id/vehicle',
  authenticate,
  authorizeRoles(...VISIT_PARTICIPANTS),
  vehicleRules,
  validateRequest,
  (req, res, next) => controller.updateVehicle(req, res, next)
);

router.post(
  '/:id/follow-ups',
  authenticate,
  authorizeRoles(...VISIT_STAFF),
  followUpRules,
  validateRequest,
  (req, res, next) => controller.addFollowUp(req, res, next)
);

router.get(
  '/:id/follow-ups',
  authenticate,
  authorizeRoles(...VISIT_READ),
  idParam,
  validateRequest,
  (req, res, next) => controller.listFollowUps(req, res, next)
);

router.get(
  '/:id/history',
  authenticate,
  authorizeRoles(...VISIT_READ),
  idParam,
  validateRequest,
  (req, res, next) => controller.listHistory(req, res, next)
);

router.post(
  '/:id/purchase',
  authenticate,
  authorizeRoles(ROLES.CUSTOMER),
  idParam,
  validateRequest,
  (req, res, next) => controller.postVisitPurchase(req, res, next)
);

router.post(
  '/jobs/reminders',
  authenticate,
  authorizeRoles(ROLES.ADMIN),
  (req, res, next) => controller.runReminderJob(req, res, next)
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
