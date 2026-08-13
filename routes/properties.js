'use strict';

const express = require('express');
const router = express.Router();
const propertyController = require('../controllers/propertyController');
const validateRequest = require('../utils/validateRequest');
const authenticate = require('../middleware/auth');
const authorizeRoles = require('../middleware/authorize');
const { ROLES } = require('../constants/roles');
const { propertyUpload } = require('../utils/upload');
const {
  idParamRule,
  listPropertyRules,
  createPropertyRules,
  updatePropertyRules,
} = require('../validations/propertyValidation');

/** Public list / sections */
router.get('/', listPropertyRules, validateRequest, (req, res, next) => {
  propertyController.list(req, res, next);
});

router.get('/featured', (req, res, next) => {
  propertyController.getFeatured(req, res, next);
});

router.get('/latest', (req, res, next) => {
  propertyController.getLatest(req, res, next);
});

router.get('/trending', (req, res, next) => {
  propertyController.getTrending(req, res, next);
});

/** Admin full list */
router.get(
  '/admin/all',
  authenticate,
  authorizeRoles(ROLES.ADMIN, ROLES.SALES_MEMBER),
  listPropertyRules,
  validateRequest,
  (req, res, next) => {
    propertyController.listAdmin(req, res, next);
  }
);

router.get('/:id/related', idParamRule, validateRequest, (req, res, next) => {
  propertyController.getRelated(req, res, next);
});

router.post('/:id/view', idParamRule, validateRequest, (req, res, next) => {
  propertyController.recordView(req, res, next);
});

router.get('/:id', idParamRule, validateRequest, (req, res, next) => {
  propertyController.getByIdPublic(req, res, next);
});

router.post(
  '/bulk',
  authenticate,
  authorizeRoles(ROLES.ADMIN),
  createPropertyRules,
  validateRequest,
  (req, res, next) => {
    propertyController.createBulk(req, res, next);
  }
);

router.post(
  '/',
  authenticate,
  authorizeRoles(ROLES.ADMIN),
  propertyUpload.array('images', 12),
  createPropertyRules,
  validateRequest,
  (req, res, next) => {
    propertyController.create(req, res, next);
  }
);

router.patch(
  '/:id',
  authenticate,
  authorizeRoles(ROLES.ADMIN),
  propertyUpload.array('images', 12),
  updatePropertyRules,
  validateRequest,
  (req, res, next) => {
    propertyController.update(req, res, next);
  }
);

router.delete(
  '/:id',
  authenticate,
  authorizeRoles(ROLES.ADMIN),
  idParamRule,
  validateRequest,
  (req, res, next) => {
    propertyController.remove(req, res, next);
  }
);

module.exports = router;
