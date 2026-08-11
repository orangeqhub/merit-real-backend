'use strict';

const { body, param } = require('express-validator');
const { Promotion } = require('../models');

const types = Promotion.PROMOTION_TYPES || [
  'TRENDING_PROPERTY',
  'FEATURED_PROPERTY',
  'HOT_PROPERTY',
  'LIMITED_TIME_OFFER',
  'NEW_LAUNCH',
  'PREMIUM_LISTING',
  'FESTIVAL_OFFER',
];

const createPromotionRules = [
  body('title').trim().notEmpty().withMessage('Title is required.'),
  body('promotionType').trim().isIn(types).withMessage('Invalid promotion type.'),
  body('status').optional().isIn(['ACTIVE', 'INACTIVE', 'active', 'inactive']),
  body('priority').optional({ nullable: true }).isInt(),
  body('ctaButtonText').optional({ nullable: true }).trim(),
  body('ctaAction').optional({ nullable: true }).trim(),
];

const updatePromotionRules = [
  param('id').isInt({ min: 1 }).withMessage('Valid promotion id is required.'),
  body('title').optional().trim().notEmpty().withMessage('Title cannot be empty.'),
  body('promotionType').optional().trim().isIn(types).withMessage('Invalid promotion type.'),
  body('status').optional().isIn(['ACTIVE', 'INACTIVE', 'active', 'inactive']),
  body('priority').optional({ nullable: true }).isInt(),
];

const idParamRule = [
  param('id').isInt({ min: 1 }).withMessage('Valid promotion id is required.'),
];

module.exports = {
  createPromotionRules,
  updatePromotionRules,
  idParamRule,
};
