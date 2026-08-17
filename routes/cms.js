'use strict';

const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const authorizeRoles = require('../middleware/authorize');
const validateRequest = require('../utils/validateRequest');
const { ROLES } = require('../constants/roles');
const controller = require('../controllers/cmsContentController');
const { updateCmsContentRules } = require('../validations/cmsContentValidation');

/** Public — CMS content for website (about, disclaimer, contact, business hours) */
router.get('/', (req, res, next) => controller.getPublic(req, res, next));

/** Admin — update CMS content */
router.put(
  '/',
  authenticate,
  authorizeRoles(ROLES.ADMIN),
  updateCmsContentRules,
  validateRequest,
  (req, res, next) => controller.update(req, res, next)
);

router.patch(
  '/',
  authenticate,
  authorizeRoles(ROLES.ADMIN),
  updateCmsContentRules,
  validateRequest,
  (req, res, next) => controller.update(req, res, next)
);

module.exports = router;
