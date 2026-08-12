'use strict';

const { body, param, query } = require('express-validator');

const submitRules = [
  body().custom((_, { req }) => {
    const hasProperty = Number(req.body?.propertyId) > 0;
    const hasPlot = String(
      req.body?.mapPlotExternalId || req.body?.mapPlotId || req.body?.externalId || req.body?.plotId || ''
    ).trim();
    if (!hasProperty && !hasPlot) {
      throw new Error('propertyId or mapPlotExternalId is required');
    }
    return true;
  }),
  body('propertyId').optional({ nullable: true, checkFalsy: true }).isInt({ min: 1 }).withMessage('Valid propertyId is required'),
  body('mapPlotExternalId').optional({ nullable: true }).isString().trim().isLength({ max: 100 }),
  body('mapPlotId').optional({ nullable: true, checkFalsy: true }).isInt({ min: 1 }),
  body('externalId').optional({ nullable: true }).isString().trim().isLength({ max: 100 }),
  body('plotId').optional({ nullable: true }).isString().trim().isLength({ max: 100 }),
  body('remarks').optional({ nullable: true }).isString().isLength({ max: 2000 }),
  body('message').optional({ nullable: true }).isString().isLength({ max: 2000 }),
  body('referralAgentCode').optional({ nullable: true }).isString().trim().isLength({ max: 64 }),
  body('agentId').optional({ nullable: true }).isString().trim().isLength({ max: 64 }),
  body('agentName').optional({ nullable: true }).isString().trim().isLength({ max: 120 }),
  body('referralAgentName').optional({ nullable: true }).isString().trim().isLength({ max: 120 }),
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

const assignEmployeeRules = [
  ...idParam,
  body('employeeId').optional().isInt({ min: 1 }),
  body('assignedEmployeeId').optional().isInt({ min: 1 }),
];

const employeeWorkflowRules = [
  ...idParam,
  body('status').optional({ nullable: true }).isString().trim().isLength({ max: 64 }),
  body('employeeWorkflowStatus').optional({ nullable: true }).isString().trim().isLength({ max: 64 }),
  body('priority').optional({ nullable: true }).isString().trim().isLength({ max: 32 }),
  body('nextFollowUpAt').optional({ nullable: true }),
  body('assignedEmployeeId').optional({ nullable: true }).isInt({ min: 1 }),
];

const callNoteRules = [
  ...idParam,
  body('summary').trim().notEmpty().withMessage('Call summary is required.'),
  body('direction').optional({ nullable: true }).isString().trim().isLength({ max: 32 }),
  body('result').optional({ nullable: true }).isString().trim().isLength({ max: 64 }),
  body('interestLevel').optional({ nullable: true }).isString().trim().isLength({ max: 32 }),
  body('nextAction').optional({ nullable: true }).isString().trim().isLength({ max: 255 }),
  body('nextFollowUpAt').optional({ nullable: true }),
  body('callDateTime').optional({ nullable: true }),
];

const internalNoteRules = [
  ...idParam,
  body('text').optional({ checkFalsy: true }).isString().trim(),
  body('note').optional({ checkFalsy: true }).isString().trim(),
];

const followUpRules = [
  ...idParam,
  body('remark').optional().isString().trim(),
  body('remarks').optional().isString().trim(),
  body('followUpStatus').optional().isString().trim().isLength({ max: 64 }),
];

const validateAgentRules = [
  query('code').trim().notEmpty().withMessage('Agent code is required'),
];

const searchAgentsRules = [
  query('q').optional({ checkFalsy: true }).trim().isLength({ max: 120 }),
  query('search').optional({ checkFalsy: true }).trim().isLength({ max: 120 }),
  query('limit').optional({ checkFalsy: true }).isInt({ min: 1, max: 25 }),
];

module.exports = {
  submitRules,
  idParam,
  rejectRules,
  assignRules,
  assignEmployeeRules,
  employeeWorkflowRules,
  callNoteRules,
  internalNoteRules,
  followUpRules,
  validateAgentRules,
  searchAgentsRules,
};
