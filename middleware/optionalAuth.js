'use strict';

const jwt = require('jsonwebtoken');
const { User } = require('../models');
const authService = require('../services/authService');
const { USER_STATUSES } = require('../constants/roles');

/** Attach req.user when a valid Bearer token is present; otherwise continue anonymously. */
module.exports = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    if (!token) return next();

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);
    if (!user || user.status !== USER_STATUSES.ACTIVE) {
      return next();
    }

    const currentVersion = authService.passwordVersion(user);
    if (decoded.passwordVersion !== undefined && decoded.passwordVersion !== currentVersion) {
      return next();
    }

    req.user = user;
    return next();
  } catch {
    return next();
  }
};
