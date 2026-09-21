'use strict';

const { body, param, query } = require('express-validator');

const submitContactRules = [
  body('fullName').optional({ checkFalsy: true }).isString().trim().isLength({ max: 120 }),
  body('name').optional({ checkFalsy: true }).isString().trim().isLength({ max: 120 }),
  body('mobile').optional({ checkFalsy: true }).isString().trim().isLength({ max: 20 }),
  body('phone').optional({ checkFalsy: true }).isString().trim().isLength({ max: 20 }),
  body('email').optional({ checkFalsy: true }).isString().trim().isLength({ max: 120 }),
  body('message').isString().trim().notEmpty().withMessage('Message is required').isLength({ max: 4000 }),
  body('source').optional({ checkFalsy: true }).isString().trim().isLength({ max: 32 }),
  body('enquiryType').optional({ checkFalsy: true }).isString().trim().isLength({ max: 64 }),
  body('preferredLocation').optional({ checkFalsy: true }).isString().trim().isLength({ max: 120 }),
  body('propertyCategory').optional({ checkFalsy: true }).isString().trim().isLength({ max: 120 }),
  body('budgetRange').optional({ checkFalsy: true }).isString().trim().isLength({ max: 64 }),
  body('contactMethod').optional({ checkFalsy: true }).isString().trim().isLength({ max: 32 }),
];

const idParam = [param('id').isInt({ min: 1 }).withMessage('Valid id is required')];

const listContactRules = [
  query('page').optional({ checkFalsy: true }).isInt({ min: 1 }),
  query('pageSize').optional({ checkFalsy: true }).isInt({ min: 1, max: 100 }),
  query('status').optional({ checkFalsy: true }).isString().trim(),
  query('source').optional({ checkFalsy: true }).isString().trim(),
  query('search').optional({ checkFalsy: true }).isString().trim().isLength({ max: 120 }),
];

const updateStatusRules = [
  ...idParam,
  body('status').isString().trim().isIn(['NEW', 'READ', 'CLOSED', 'new', 'read', 'closed']),
];

module.exports = {
  submitContactRules,
  listContactRules,
  updateStatusRules,
  idParam,
};
