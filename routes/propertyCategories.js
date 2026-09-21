'use strict';

const express = require('express');
const router = express.Router();
const propertyCategoryController = require('../controllers/propertyCategoryController');
const validateRequest = require('../utils/validateRequest');
const authenticate = require('../middleware/auth');
const authorizeRoles = require('../middleware/authorize');
const { ROLES } = require('../constants/roles');
const {
  createCategoryRules,
  updateCategoryRules,
  reorderRules,
} = require('../validations/propertyValidation');

/** Public — active & visible categories for website */
router.get('/', (req, res, next) => {
  propertyCategoryController.listPublic(req, res, next);
});

/** Admin / sales — all categories (including hidden) with attributes */
router.get(
  '/all',
  authenticate,
  authorizeRoles(ROLES.ADMIN, ROLES.SALES_MEMBER),
  (req, res, next) => {
    propertyCategoryController.listAll(req, res, next);
  }
);

router.get('/:slug', (req, res, next) => {
  propertyCategoryController.getBySlug(req, res, next);
});

router.post(
  '/',
  authenticate,
  authorizeRoles(ROLES.ADMIN),
  createCategoryRules,
  validateRequest,
  (req, res, next) => {
    propertyCategoryController.create(req, res, next);
  }
);

router.patch(
  '/:slug',
  authenticate,
  authorizeRoles(ROLES.ADMIN),
  updateCategoryRules,
  validateRequest,
  (req, res, next) => {
    propertyCategoryController.update(req, res, next);
  }
);

router.post(
  '/:slug/reorder',
  authenticate,
  authorizeRoles(ROLES.ADMIN),
  reorderRules,
  validateRequest,
  (req, res, next) => {
    propertyCategoryController.reorder(req, res, next);
  }
);

router.delete(
  '/:slug',
  authenticate,
  authorizeRoles(ROLES.ADMIN),
  (req, res, next) => {
    propertyCategoryController.remove(req, res, next);
  }
);

module.exports = router;
