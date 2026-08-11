'use strict';

const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const authorizeRoles = require('../middleware/authorize');
const { ROLES } = require('../constants/roles');

router.get(
  '/dashboard',
  authenticate,
  authorizeRoles(ROLES.AGENT),
  (req, res) => {
    res.json({
      success: true,
      message: 'Agent dashboard placeholder.',
      data: {
        userId: req.user.id,
        role: req.user.role,
        agentCategoryId: req.user.agentCategoryId,
      },
      errors: [],
    });
  }
);

module.exports = router;
