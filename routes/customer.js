'use strict';

const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const authorizeRoles = require('../middleware/authorize');
const { ROLES } = require('../constants/roles');

router.get(
  '/dashboard',
  authenticate,
  authorizeRoles(ROLES.CUSTOMER),
  (req, res) => {
    res.json({
      success: true,
      message: 'Customer dashboard placeholder.',
      data: {
        userId: req.user.id,
        role: req.user.role,
      },
      errors: [],
    });
  }
);

module.exports = router;
