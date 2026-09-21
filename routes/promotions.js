'use strict';

const express = require('express');
const router = express.Router();
const promotionController = require('../controllers/promotionController');
const validateRequest = require('../utils/validateRequest');
const authenticate = require('../middleware/auth');
const optionalAuth = require('../middleware/optionalAuth');
const authorizeRoles = require('../middleware/authorize');
const { ROLES } = require('../constants/roles');
const { promotionUpload } = require('../utils/upload');
const {
  createPromotionRules,
  updatePromotionRules,
  idParamRule,
} = require('../validations/promotionValidation');

/** Public / customer — active promotions (optional auth excludes dismissed) */
router.get('/active', optionalAuth, (req, res, next) => {
  promotionController.listActive(req, res, next);
});

/** Customer — my promotions */
router.get(
  '/mine',
  authenticate,
  authorizeRoles(ROLES.CUSTOMER),
  (req, res, next) => {
    promotionController.myPromotions(req, res, next);
  }
);

router.get(
  '/dismissed',
  authenticate,
  authorizeRoles(ROLES.CUSTOMER),
  (req, res, next) => {
    promotionController.dismissed(req, res, next);
  }
);

router.post(
  '/:id/dismiss',
  authenticate,
  authorizeRoles(ROLES.CUSTOMER),
  idParamRule,
  validateRequest,
  (req, res, next) => {
    promotionController.dismiss(req, res, next);
  }
);

router.post(
  '/:id/restore',
  authenticate,
  authorizeRoles(ROLES.CUSTOMER),
  idParamRule,
  validateRequest,
  (req, res, next) => {
    promotionController.restore(req, res, next);
  }
);

router.patch(
  '/notifications/:notificationId/read',
  authenticate,
  authorizeRoles(ROLES.CUSTOMER),
  (req, res, next) => {
    promotionController.markNotificationRead(req, res, next);
  }
);

/** Admin */
router.get(
  '/',
  authenticate,
  authorizeRoles(ROLES.ADMIN),
  (req, res, next) => {
    promotionController.listAll(req, res, next);
  }
);

router.get(
  '/:id',
  authenticate,
  authorizeRoles(ROLES.ADMIN),
  idParamRule,
  validateRequest,
  (req, res, next) => {
    promotionController.getById(req, res, next);
  }
);

router.post(
  '/',
  authenticate,
  authorizeRoles(ROLES.ADMIN),
  promotionUpload.single('banner'),
  createPromotionRules,
  validateRequest,
  (req, res, next) => {
    promotionController.create(req, res, next);
  }
);

router.patch(
  '/:id',
  authenticate,
  authorizeRoles(ROLES.ADMIN),
  promotionUpload.single('banner'),
  updatePromotionRules,
  validateRequest,
  (req, res, next) => {
    promotionController.update(req, res, next);
  }
);

router.post(
  '/:id/activate',
  authenticate,
  authorizeRoles(ROLES.ADMIN),
  idParamRule,
  validateRequest,
  (req, res, next) => {
    promotionController.activate(req, res, next);
  }
);

router.post(
  '/:id/deactivate',
  authenticate,
  authorizeRoles(ROLES.ADMIN),
  idParamRule,
  validateRequest,
  (req, res, next) => {
    promotionController.deactivate(req, res, next);
  }
);

router.delete(
  '/:id',
  authenticate,
  authorizeRoles(ROLES.ADMIN),
  idParamRule,
  validateRequest,
  (req, res, next) => {
    promotionController.remove(req, res, next);
  }
);

module.exports = router;
