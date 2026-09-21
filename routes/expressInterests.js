'use strict';

const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const authorizeRoles = require('../middleware/authorize');
const validateRequest = require('../utils/validateRequest');
const { ROLES } = require('../constants/roles');
const controller = require('../controllers/expressInterestController');
const {
  submitRules,
  idParam,
  rejectRules,
  assignRules,
  assignEmployeeRules,
  employeeWorkflowRules,
  callNoteRules,
  internalNoteRules,
  followUpRules,
  validateAgentRules,
  searchAgentsRules,
} = require('../validations/expressInterestValidation');

const ADMIN_SALES = [ROLES.ADMIN, ROLES.SALES_MEMBER];
const PIPELINE_READ = [ROLES.ADMIN, ROLES.CUSTOMER, ROLES.AGENT, ROLES.SALES_MEMBER, ROLES.EMPLOYEE];
const REMARKS_ROLES = [ROLES.ADMIN, ROLES.AGENT, ROLES.SALES_MEMBER, ROLES.EMPLOYEE];
const EMPLOYEE_PIPELINE = [ROLES.ADMIN, ROLES.SALES_MEMBER, ROLES.EMPLOYEE];

router.get(
  '/agents/validate',
  authenticate,
  validateAgentRules,
  validateRequest,
  (req, res, next) => controller.validateAgent(req, res, next)
);

router.get(
  '/agents/search',
  authenticate,
  authorizeRoles(ROLES.CUSTOMER, ROLES.ADMIN, ROLES.SALES_MEMBER),
  searchAgentsRules,
  validateRequest,
  (req, res, next) => controller.searchAgents(req, res, next)
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

// Purchase request lists (before /:id)
router.get('/purchases/mine', authenticate, authorizeRoles(ROLES.CUSTOMER), (req, res, next) =>
  controller.listPurchasesMine(req, res, next)
);
router.get('/purchases/admin', authenticate, authorizeRoles(...ADMIN_SALES), (req, res, next) =>
  controller.listPurchasesAdmin(req, res, next)
);
router.get('/purchases/agent', authenticate, authorizeRoles(ROLES.AGENT), (req, res, next) =>
  controller.listPurchasesAgent(req, res, next)
);
router.get(
  '/purchases/:id',
  authenticate,
  authorizeRoles(...PIPELINE_READ),
  idParam,
  validateRequest,
  (req, res, next) => controller.getPurchaseById(req, res, next)
);
router.post(
  '/purchases/:id/status',
  authenticate,
  authorizeRoles(ROLES.ADMIN),
  idParam,
  validateRequest,
  (req, res, next) => controller.updatePurchaseStatus(req, res, next)
);
router.post(
  '/purchases/:id/remarks',
  authenticate,
  authorizeRoles(...REMARKS_ROLES),
  idParam,
  validateRequest,
  (req, res, next) => controller.purchaseRemarks(req, res, next)
);
router.post(
  '/purchases/:id/complete',
  authenticate,
  authorizeRoles(ROLES.ADMIN),
  idParam,
  validateRequest,
  (req, res, next) => controller.completePurchase(req, res, next)
);
router.post(
  '/purchases/:id/payments',
  authenticate,
  authorizeRoles(ROLES.ADMIN),
  require('../utils/upload').bookingPaymentUpload.single('proof'),
  idParam,
  validateRequest,
  (req, res, next) => controller.recordPurchasePayment(req, res, next)
);
router.get(
  '/purchases/:id/receipts',
  authenticate,
  authorizeRoles(...PIPELINE_READ),
  idParam,
  validateRequest,
  (req, res, next) => controller.listPurchaseReceipts(req, res, next)
);
router.get(
  '/purchases/:id/receipt',
  authenticate,
  authorizeRoles(...PIPELINE_READ),
  idParam,
  validateRequest,
  (req, res, next) => controller.getPurchaseReceipt(req, res, next)
);

router.get(
  '/closed-deals/mine',
  authenticate,
  authorizeRoles(ROLES.AGENT),
  (req, res, next) => controller.listClosedDeals(req, res, next)
);
router.get(
  '/closed-deals/admin',
  authenticate,
  authorizeRoles(...ADMIN_SALES),
  (req, res, next) => controller.listClosedDeals(req, res, next)
);
router.get(
  '/closed-deals/stats',
  authenticate,
  authorizeRoles(ROLES.AGENT),
  (req, res, next) => controller.agentClosedDealStats(req, res, next)
);
router.get(
  '/reports/sales',
  authenticate,
  authorizeRoles(...ADMIN_SALES),
  (req, res, next) => controller.salesReports(req, res, next)
);

router.get(
  '/documents',
  authenticate,
  authorizeRoles(...PIPELINE_READ),
  (req, res, next) => controller.listDocuments(req, res, next)
);
router.get(
  '/documents/payment-receipts/:id',
  authenticate,
  authorizeRoles(...PIPELINE_READ),
  idParam,
  validateRequest,
  (req, res, next) => controller.getPaymentReceiptById(req, res, next)
);
router.get(
  '/documents/sale-certificates/:id',
  authenticate,
  authorizeRoles(...PIPELINE_READ),
  idParam,
  validateRequest,
  (req, res, next) => controller.getSaleCertificateById(req, res, next)
);
router.get(
  '/purchases/:id/sale-certificate',
  authenticate,
  authorizeRoles(...PIPELINE_READ),
  idParam,
  validateRequest,
  (req, res, next) => controller.getSaleCertificateByPurchase(req, res, next)
);

// Booking request lists
router.get('/bookings/mine', authenticate, authorizeRoles(ROLES.CUSTOMER), (req, res, next) =>
  controller.listBookingsMine(req, res, next)
);
router.get('/bookings/admin', authenticate, authorizeRoles(...ADMIN_SALES), (req, res, next) =>
  controller.listBookingsAdmin(req, res, next)
);
router.get('/bookings/agent', authenticate, authorizeRoles(ROLES.AGENT), (req, res, next) =>
  controller.listBookingsAgent(req, res, next)
);
router.get(
  '/bookings/stats/summary',
  authenticate,
  authorizeRoles(...ADMIN_SALES),
  (req, res, next) => controller.bookingStats(req, res, next)
);
router.get(
  '/bookings/requiring-decision',
  authenticate,
  authorizeRoles(...ADMIN_SALES),
  (req, res, next) => controller.listBookingsRequiringDecision(req, res, next)
);
router.post(
  '/bookings/jobs/expire',
  authenticate,
  authorizeRoles(ROLES.ADMIN),
  (req, res, next) => controller.runBookingExpiryJob(req, res, next)
);
router.get(
  '/bookings/:id',
  authenticate,
  authorizeRoles(...PIPELINE_READ),
  idParam,
  validateRequest,
  (req, res, next) => controller.getBookingById(req, res, next)
);
router.post(
  '/bookings/:id/status',
  authenticate,
  authorizeRoles(ROLES.ADMIN),
  idParam,
  validateRequest,
  (req, res, next) => controller.updateBookingStatus(req, res, next)
);
router.post(
  '/bookings/:id/remarks',
  authenticate,
  authorizeRoles(...REMARKS_ROLES),
  idParam,
  validateRequest,
  (req, res, next) => controller.bookingRemarks(req, res, next)
);

router.post(
  '/bookings/:id/payments',
  authenticate,
  authorizeRoles(ROLES.ADMIN),
  require('../utils/upload').bookingPaymentUpload.single('proof'),
  idParam,
  validateRequest,
  (req, res, next) => controller.recordBookingPayment(req, res, next)
);

router.post(
  '/bookings/:id/follow-ups',
  authenticate,
  authorizeRoles(...REMARKS_ROLES),
  idParam,
  validateRequest,
  (req, res, next) => controller.addBookingFollowUp(req, res, next)
);

router.post(
  '/bookings/:id/convert-purchase',
  authenticate,
  authorizeRoles(ROLES.ADMIN),
  idParam,
  validateRequest,
  (req, res, next) => controller.convertBookingToPurchase(req, res, next)
);

router.post(
  '/bookings/:id/cancel',
  authenticate,
  authorizeRoles(ROLES.ADMIN),
  idParam,
  validateRequest,
  (req, res, next) => controller.cancelBooking(req, res, next)
);

router.post(
  '/bookings/:id/extend',
  authenticate,
  authorizeRoles(ROLES.ADMIN),
  idParam,
  validateRequest,
  (req, res, next) => controller.extendBooking(req, res, next)
);

router.post(
  '/bookings/:id/release',
  authenticate,
  authorizeRoles(ROLES.ADMIN),
  idParam,
  validateRequest,
  (req, res, next) => controller.releaseBooking(req, res, next)
);

router.post(
  '/bookings/:id/under-review',
  authenticate,
  authorizeRoles(ROLES.ADMIN),
  idParam,
  validateRequest,
  (req, res, next) => controller.keepBookingUnderReview(req, res, next)
);

router.get(
  '/:id',
  authenticate,
  authorizeRoles(...PIPELINE_READ),
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
  assignEmployeeRules,
  validateRequest,
  (req, res, next) => controller.assignEmployee(req, res, next)
);

router.patch(
  '/:id/employee-workflow',
  authenticate,
  authorizeRoles(...EMPLOYEE_PIPELINE),
  employeeWorkflowRules,
  validateRequest,
  (req, res, next) => controller.updateEmployeeWorkflow(req, res, next)
);

router.get(
  '/:id/call-notes',
  authenticate,
  authorizeRoles(...EMPLOYEE_PIPELINE),
  idParam,
  validateRequest,
  (req, res, next) => controller.listCallNotes(req, res, next)
);

router.post(
  '/:id/call-notes',
  authenticate,
  authorizeRoles(...EMPLOYEE_PIPELINE),
  callNoteRules,
  validateRequest,
  (req, res, next) => controller.addCallNote(req, res, next)
);

router.get(
  '/:id/internal-notes',
  authenticate,
  authorizeRoles(...EMPLOYEE_PIPELINE),
  idParam,
  validateRequest,
  (req, res, next) => controller.listInternalNotes(req, res, next)
);

router.post(
  '/:id/internal-notes',
  authenticate,
  authorizeRoles(...EMPLOYEE_PIPELINE),
  internalNoteRules,
  validateRequest,
  (req, res, next) => controller.addInternalNote(req, res, next)
);

router.post(
  '/:id/internal-remarks',
  authenticate,
  authorizeRoles(...REMARKS_ROLES),
  idParam,
  validateRequest,
  (req, res, next) => controller.internalRemarks(req, res, next)
);

router.post(
  '/:id/follow-ups',
  authenticate,
  authorizeRoles(ROLES.AGENT, ROLES.SALES_MEMBER, ROLES.EMPLOYEE),
  followUpRules,
  validateRequest,
  (req, res, next) => controller.addFollowUp(req, res, next)
);

router.post(
  '/:id/purchase',
  authenticate,
  authorizeRoles(ROLES.CUSTOMER),
  idParam,
  validateRequest,
  (req, res, next) => controller.submitPurchase(req, res, next)
);

router.post(
  '/:id/booking',
  authenticate,
  authorizeRoles(ROLES.CUSTOMER),
  idParam,
  validateRequest,
  (req, res, next) => controller.submitBooking(req, res, next)
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
