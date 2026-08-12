'use strict';

const express = require('express');
const mapBookingController = require('../controllers/mapBookingController');
const authenticate = require('../middleware/auth');
const authorizeRoles = require('../middleware/authorize');
const { ROLES } = require('../constants/roles');

const router = express.Router();

router.get('/plots', (req, res, next) => mapBookingController.list(req, res, next));
router.get('/plots/:id', (req, res, next) => mapBookingController.getById(req, res, next));

router.post(
  '/plots/seed',
  authenticate,
  authorizeRoles(ROLES.ADMIN),
  (req, res, next) => mapBookingController.seed(req, res, next)
);

router.post(
  '/plots/pricing/bulk',
  authenticate,
  authorizeRoles(ROLES.ADMIN, ROLES.SALES_MEMBER),
  (req, res, next) => mapBookingController.bulkPricing(req, res, next)
);

router.post(
  '/plots/import',
  authenticate,
  authorizeRoles(ROLES.ADMIN, ROLES.SALES_MEMBER),
  (req, res, next) => mapBookingController.importSheet(req, res, next)
);

router.post(
  '/plots',
  authenticate,
  authorizeRoles(ROLES.ADMIN, ROLES.SALES_MEMBER),
  (req, res, next) => mapBookingController.upsert(req, res, next)
);

router.patch(
  '/plots/:id/pricing',
  authenticate,
  authorizeRoles(ROLES.ADMIN, ROLES.SALES_MEMBER),
  (req, res, next) => mapBookingController.updatePricing(req, res, next)
);

/** Admin/sales override only — customers book via Express Interest → Booking pipeline. */
router.post(
  '/plots/:id/book',
  authenticate,
  authorizeRoles(ROLES.ADMIN, ROLES.SALES_MEMBER),
  (req, res, next) => mapBookingController.book(req, res, next)
);

router.patch(
  '/plots/:id/status',
  authenticate,
  authorizeRoles(ROLES.ADMIN, ROLES.SALES_MEMBER),
  (req, res, next) => mapBookingController.updateStatus(req, res, next)
);

module.exports = router;
