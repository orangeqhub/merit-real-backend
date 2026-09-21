'use strict';

const express = require('express');
const router = express.Router();
const agentCategoryController = require('../controllers/agentCategoryController');
const validateRequest = require('../utils/validateRequest');
const authenticate = require('../middleware/auth');
const authorizeRoles = require('../middleware/authorize');
const { ROLES } = require('../constants/roles');
const {
  createCategoryRules,
  updateCategoryRules,
} = require('../validations/agentCategoryValidation');

/** Public — registration UI loads active categories dynamically */
router.get('/', (req, res, next) => {
  agentCategoryController.listActive(req, res, next);
});

/** Admin — manage categories dynamically (no hardcoded list) */
router.get(
  '/all',
  authenticate,
  authorizeRoles(ROLES.ADMIN),
  (req, res, next) => {
    agentCategoryController.listAll(req, res, next);
  }
);

router.post(
  '/',
  authenticate,
  authorizeRoles(ROLES.ADMIN),
  createCategoryRules,
  validateRequest,
  (req, res, next) => {
    agentCategoryController.create(req, res, next);
  }
);

router.patch(
  '/:id',
  authenticate,
  authorizeRoles(ROLES.ADMIN),
  updateCategoryRules,
  validateRequest,
  (req, res, next) => {
    agentCategoryController.update(req, res, next);
  }
);

module.exports = router;
