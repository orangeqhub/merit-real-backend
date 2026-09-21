'use strict';

const express = require('express');
const router = express.Router();
const heroSlideController = require('../controllers/heroSlideController');
const validateRequest = require('../utils/validateRequest');
const authenticate = require('../middleware/auth');
const authorizeRoles = require('../middleware/authorize');
const { ROLES } = require('../constants/roles');
const { heroUpload } = require('../utils/upload');
const {
  createHeroSlideRules,
  updateHeroSlideRules,
  idParamRule,
} = require('../validations/heroSlideValidation');

/** Public — website hero carousel */
router.get('/', (req, res, next) => {
  heroSlideController.listActive(req, res, next);
});

/** Admin — full list including inactive */
router.get(
  '/all',
  authenticate,
  authorizeRoles(ROLES.ADMIN),
  (req, res, next) => {
    heroSlideController.listAll(req, res, next);
  }
);

router.post(
  '/',
  authenticate,
  authorizeRoles(ROLES.ADMIN),
  heroUpload.single('image'),
  createHeroSlideRules,
  validateRequest,
  (req, res, next) => {
    heroSlideController.create(req, res, next);
  }
);

router.patch(
  '/:id',
  authenticate,
  authorizeRoles(ROLES.ADMIN),
  heroUpload.single('image'),
  updateHeroSlideRules,
  validateRequest,
  (req, res, next) => {
    heroSlideController.update(req, res, next);
  }
);

router.delete(
  '/:id',
  authenticate,
  authorizeRoles(ROLES.ADMIN),
  idParamRule,
  validateRequest,
  (req, res, next) => {
    heroSlideController.remove(req, res, next);
  }
);

module.exports = router;
