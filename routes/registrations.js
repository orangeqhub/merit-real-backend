'use strict';

const express = require('express');
const router = express.Router();
const registrationController = require('../controllers/registrationController');
const validateRequest = require('../utils/validateRequest');
const authenticate = require('../middleware/auth');
const authorizeRoles = require('../middleware/authorize');
const { ROLES } = require('../constants/roles');
const {
  idParamRule,
  listRules,
  approveRules,
  rejectRules,
} = require('../validations/registrationValidation');

router.use(authenticate, authorizeRoles(ROLES.ADMIN));

router.get('/', listRules, validateRequest, (req, res, next) => {
  registrationController.list(req, res, next);
});

router.get('/pending', (req, res, next) => {
  registrationController.listPending(req, res, next);
});

router.get('/:id', idParamRule, validateRequest, (req, res, next) => {
  registrationController.getById(req, res, next);
});

router.post('/:id/approve', approveRules, validateRequest, (req, res, next) => {
  registrationController.approve(req, res, next);
});

router.post('/:id/reject', rejectRules, validateRequest, (req, res, next) => {
  registrationController.reject(req, res, next);
});

module.exports = router;
