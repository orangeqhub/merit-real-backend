'use strict';

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const validateRequest = require('../utils/validateRequest');
const authenticate = require('../middleware/auth');
const { registrationUpload } = require('../utils/upload');
const {
  registerRules,
  loginRules,
  applicationStatusRules,
  updateProfileRules,
  searchReferralAgentsRules,
} = require('../validations/authValidation');

router.post(
  '/register',
  registrationUpload.fields([
    { name: 'profilePhoto', maxCount: 1 },
    { name: 'aadhaarProof', maxCount: 1 },
    { name: 'panProof', maxCount: 1 },
    { name: 'identityProof', maxCount: 1 },
    { name: 'addressProof', maxCount: 1 },
  ]),
  registerRules,
  validateRequest,
  (req, res, next) => {
    authController.register(req, res, next);
  }
);

router.post('/login', loginRules, validateRequest, (req, res, next) => {
  authController.login(req, res, next);
});

router.post('/admin/login', loginRules, validateRequest, (req, res, next) => {
  authController.adminLogin(req, res, next);
});

router.get('/me', authenticate, (req, res, next) => {
  authController.me(req, res, next);
});

router.patch('/me', authenticate, updateProfileRules, validateRequest, (req, res, next) => {
  authController.updateMe(req, res, next);
});

router.get('/application-status', applicationStatusRules, validateRequest, (req, res, next) => {
  authController.applicationStatus(req, res, next);
});

router.get('/referral-agents/search', searchReferralAgentsRules, validateRequest, (req, res, next) => {
  authController.searchReferralAgents(req, res, next);
});

router.post('/logout', authenticate, (req, res, next) => {
  authController.logout(req, res, next);
});

module.exports = router;
