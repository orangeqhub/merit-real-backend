'use strict';

const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const authorizeRoles = require('../middleware/authorize');
const validateRequest = require('../utils/validateRequest');
const { ROLES } = require('../constants/roles');
const controller = require('../controllers/siteSettingController');
const { updateSiteSettingsRules } = require('../validations/siteSettingValidation');

/** Public — contact details for website / footer */
router.get('/', (req, res, next) => controller.getPublic(req, res, next));

/** Admin — update contact details */
router.put(
  '/',
  authenticate,
  authorizeRoles(ROLES.ADMIN),
  updateSiteSettingsRules,
  validateRequest,
  (req, res, next) => controller.update(req, res, next)
);

router.patch(
  '/',
  authenticate,
  authorizeRoles(ROLES.ADMIN),
  updateSiteSettingsRules,
  validateRequest,
  (req, res, next) => controller.update(req, res, next)
);

module.exports = router;
