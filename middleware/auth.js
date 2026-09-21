'use strict';

const jwt = require('jsonwebtoken');
const { User } = require('../models');
const authService = require('../services/authService');
const { USER_STATUSES } = require('../constants/roles');

module.exports = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
        errors: [],
      });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Invalid token format.',
        errors: [],
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. User account not found.',
        errors: [],
      });
    }

    if (user.status !== USER_STATUSES.ACTIVE) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. User account is not active.',
        errors: [],
      });
    }

    const currentVersion = authService.passwordVersion(user);
    if (decoded.passwordVersion !== undefined && decoded.passwordVersion !== currentVersion) {
      return res.status(401).json({
        success: false,
        message: 'Session expired. Please log in again.',
        code: 'SESSION_INVALIDATED',
        errors: [],
      });
    }

    req.user = user;
    next();
  } catch (error) {
    let message = 'Access denied. Invalid or expired token.';
    if (error.name === 'TokenExpiredError') {
      message = 'Session expired. Please log in again.';
    }
    return res.status(401).json({
      success: false,
      message,
      errors: [],
    });
  }
};
