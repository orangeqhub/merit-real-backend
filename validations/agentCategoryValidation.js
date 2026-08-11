'use strict';

const { body, param } = require('express-validator');

const createCategoryRules = [
  body('name').trim().notEmpty().withMessage('Category name is required.'),
  body('code').optional({ nullable: true }).trim(),
  body('description').optional({ nullable: true }).trim(),
  body('sortOrder').optional({ nullable: true }).isInt().withMessage('sortOrder must be an integer.'),
  body('isActive').optional({ nullable: true }).isBoolean().withMessage('isActive must be boolean.'),
];

const updateCategoryRules = [
  param('id').isInt({ min: 1 }).withMessage('Valid category id is required.'),
  body('name').optional().trim().notEmpty().withMessage('Category name cannot be empty.'),
  body('code').optional({ nullable: true }).trim(),
  body('description').optional({ nullable: true }).trim(),
  body('sortOrder').optional({ nullable: true }).isInt().withMessage('sortOrder must be an integer.'),
  body('isActive').optional({ nullable: true }).isBoolean().withMessage('isActive must be boolean.'),
];

module.exports = {
  createCategoryRules,
  updateCategoryRules,
};
