'use strict';

const { body, param, query } = require('express-validator');

const createCategoryRules = [
  body('nameEn').trim().notEmpty().withMessage('nameEn is required'),
  body('slug').optional({ nullable: true }).trim(),
  body('icon').optional({ nullable: true }).trim(),
];

const updateCategoryRules = [
  param('slug').trim().notEmpty(),
  body('nameEn').optional().trim().notEmpty(),
];

const reorderRules = [
  param('slug').trim().notEmpty(),
  body('direction').isIn(['up', 'down']).withMessage('direction must be up or down'),
];

const idParamRule = [param('id').isInt({ min: 1 }).withMessage('Valid id is required')];

const listPropertyRules = [
  query('page').optional().isInt({ min: 1 }),
  query('pageSize').optional().isInt({ min: 1, max: 100 }),
];

const createPropertyRules = [
  body('titleEn').trim().notEmpty().withMessage('titleEn is required'),
  body('categoryId').notEmpty().withMessage('categoryId is required'),
  body('price').optional().isFloat({ min: 0 }),
];

const updatePropertyRules = [
  param('id').isInt({ min: 1 }),
  body('titleEn').optional().trim().notEmpty(),
  body('price').optional().isFloat({ min: 0 }),
];

module.exports = {
  createCategoryRules,
  updateCategoryRules,
  reorderRules,
  idParamRule,
  listPropertyRules,
  createPropertyRules,
  updatePropertyRules,
};
