'use strict';

const express = require('express');
const router = express.Router();
const propertyController = require('../controllers/propertyController');
const validateRequest = require('../utils/validateRequest');
const authenticate = require('../middleware/auth');
const authorizeRoles = require('../middleware/authorize');
const { ROLES } = require('../constants/roles');
const { propertyUpload, propertyDocumentUpload } = require('../utils/upload');
const {
  idParamRule,
  documentIdParamRule,
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

router.get('/city-counts', (req, res, next) => {
  propertyController.getCityCounts(req, res, next);
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

/**
 * Property documents (PDFs). Metadata (filename/size) already travels on the
 * property payload for public display; these routes gate the actual file.
 */
router.get(
  '/:id/documents',
  authenticate,
  idParamRule,
  validateRequest,
  (req, res, next) => {
    propertyController.listDocuments(req, res, next);
  }
);

router.get(
  '/:id/documents/:documentId',
  authenticate,
  documentIdParamRule,
  validateRequest,
  (req, res, next) => {
    propertyController.downloadDocument(req, res, next);
  }
);

router.post(
  '/:id/documents',
  authenticate,
  authorizeRoles(ROLES.ADMIN),
  idParamRule,
  validateRequest,
  propertyDocumentUpload.array('documents', 10),
  (req, res, next) => {
    propertyController.uploadDocuments(req, res, next);
  }
);

router.delete(
  '/:id/documents/:documentId',
  authenticate,
  authorizeRoles(ROLES.ADMIN),
  documentIdParamRule,
  validateRequest,
  (req, res, next) => {
    propertyController.deleteDocument(req, res, next);
  }
);

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
