'use strict';

const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const authorizeRoles = require('../middleware/authorize');
const validateRequest = require('../utils/validateRequest');
const { ROLES } = require('../constants/roles');
const controller = require('../controllers/contactEnquiryController');
const {
  submitContactRules,
  listContactRules,
  updateStatusRules,
  idParam,
} = require('../validations/contactEnquiryValidation');

const STAFF = [ROLES.ADMIN, ROLES.SALES_MEMBER];

/** Public — About Us / Home contact forms */
router.post('/', submitContactRules, validateRequest, (req, res, next) =>
  controller.submit(req, res, next)
);

router.get(
  '/',
  authenticate,
  authorizeRoles(...STAFF),
  listContactRules,
  validateRequest,
  (req, res, next) => controller.list(req, res, next)
);

router.get(
  '/:id',
  authenticate,
  authorizeRoles(...STAFF),
  idParam,
  validateRequest,
  (req, res, next) => controller.getById(req, res, next)
);

router.patch(
  '/:id/status',
  authenticate,
  authorizeRoles(...STAFF),
  updateStatusRules,
  validateRequest,
  (req, res, next) => controller.updateStatus(req, res, next)
);

module.exports = router;
