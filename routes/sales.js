'use strict';

const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const authorizeRoles = require('../middleware/authorize');
const { ROLES } = require('../constants/roles');
const salesController = require('../controllers/salesController');

router.use(authenticate, authorizeRoles(ROLES.SALES_MEMBER));

router.get('/dashboard/stats', (req, res, next) => {
  salesController.dashboardStats(req, res, next);
});

module.exports = router;
