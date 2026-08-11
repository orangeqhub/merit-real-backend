'use strict';

const { body, param, query } = require('express-validator');

const submitRules = [
  body('propertyId').isInt({ min: 1 }).withMessage('Valid propertyId is required'),
  body('visitDate').optional().isString().trim(),
  body('preferredDate').optional().isString().trim(),
  body('visitTime').optional().isString().trim(),
  body('preferredTime').optional().isString().trim(),
  body('remarks').optional({ nullable: true }).isString().isLength({ max: 2000 }),
  body('referralAgentCode').optional({ nullable: true }).isString().trim().isLength({ max: 64 }),
  body('agentId').optional({ nullable: true }).isString().trim().isLength({ max: 64 }),
];

const idParam = [param('id').isInt({ min: 1 }).withMessage('Valid id is required')];

const rejectRules = [
  ...idParam,
  body('reason').optional().isString().trim(),
  body('rejectionReason').optional().isString().trim(),
  body('adminRemarks').optional().isString().trim(),
];

const assignRules = [
  ...idParam,
  body('agentId').optional(),
  body('assignedAgentId').optional(),
];

const dropRules = [
  ...idParam,
  body('dropReason').optional().isString().trim(),
  body('reason').optional().isString().trim(),
  body('otherReason').optional().isString().trim(),
  body('dropRemarks').optional().isString().trim(),
  body('remarks').optional().isString().trim(),
];

const validateAgentRules = [
  query('code').trim().notEmpty().withMessage('Agent code is required'),
];

module.exports = {
  submitRules,
  idParam,
  rejectRules,
  assignRules,
  dropRules,
  validateAgentRules,
};
