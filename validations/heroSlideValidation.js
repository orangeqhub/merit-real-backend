'use strict';

const { body, param } = require('express-validator');

const createHeroSlideRules = [
  body('headingEn').optional({ nullable: true }).trim(),
  body('headingTe').optional({ nullable: true }).trim(),
  body('subtitleEn').optional({ nullable: true }).trim(),
  body('subtitleTe').optional({ nullable: true }).trim(),
  body('status').optional().isIn(['active', 'inactive']).withMessage('status must be active or inactive'),
  body('sortOrder').optional({ nullable: true }).isInt().withMessage('sortOrder must be an integer'),
];

const updateHeroSlideRules = [
  param('id').isInt({ min: 1 }).withMessage('Valid slide id is required.'),
  body('headingEn').optional({ nullable: true }).trim(),
  body('headingTe').optional({ nullable: true }).trim(),
  body('subtitleEn').optional({ nullable: true }).trim(),
  body('subtitleTe').optional({ nullable: true }).trim(),
  body('status').optional().isIn(['active', 'inactive']).withMessage('status must be active or inactive'),
  body('sortOrder').optional({ nullable: true }).isInt().withMessage('sortOrder must be an integer'),
];

const idParamRule = [
  param('id').isInt({ min: 1 }).withMessage('Valid slide id is required.'),
];

module.exports = {
  createHeroSlideRules,
  updateHeroSlideRules,
  idParamRule,
};
