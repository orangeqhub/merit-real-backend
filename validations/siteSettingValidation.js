'use strict';

const { body } = require('express-validator');

const updateSiteSettingsRules = [
  body('address').optional({ nullable: true }).isString().isLength({ max: 1000 }),
  body('phone').optional({ nullable: true }).isString().trim().isLength({ max: 64 }),
  body('email').optional({ nullable: true }).isString().trim().isLength({ max: 120 }),
];

module.exports = { updateSiteSettingsRules };
