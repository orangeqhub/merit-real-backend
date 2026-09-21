'use strict';

const { param, body, query } = require('express-validator');
const { AGENT_GRADE_LIST } = require('../constants/roles');

const idParamRule = [
  param('id').isInt({ min: 1 }).withMessage('Valid registration id is required.'),
];

const listRules = [
  query('status')
    .optional({ nullable: true, checkFalsy: true })
    .isIn(['PENDING', 'ACTIVE', 'INACTIVE', 'SUSPENDED', 'REJECTED', 'pending', 'active', 'inactive', 'suspended', 'rejected'])
    .withMessage('Invalid status filter.'),
  query('role')
    .optional({ nullable: true, checkFalsy: true })
    .customSanitizer((value) => String(value).toUpperCase())
    .isIn(['CUSTOMER', 'AGENT'])
    .withMessage('Role filter must be customer or agent.'),
];

const approveRules = [
  ...idParamRule,
  body('grade')
    .optional({ nullable: true, checkFalsy: true })
    .customSanitizer((value) => String(value).trim().toUpperCase())
    .isIn(AGENT_GRADE_LIST)
    .withMessage(`Grade must be one of: ${AGENT_GRADE_LIST.join(', ')}.`),
  body('agentGrade')
    .optional({ nullable: true, checkFalsy: true })
    .customSanitizer((value) => String(value).trim().toUpperCase())
    .isIn(AGENT_GRADE_LIST)
    .withMessage(`Grade must be one of: ${AGENT_GRADE_LIST.join(', ')}.`),
];

const rejectRules = [
  ...idParamRule,
  body('reason')
    .optional({ nullable: true })
    .trim(),
  body('rejectionReason')
    .optional({ nullable: true })
    .trim(),
  body().custom((_value, { req }) => {
    const reason = String(req.body.reason || req.body.rejectionReason || '').trim();
    if (!reason) {
      throw new Error('Rejection reason is required.');
    }
    return true;
  }),
];

module.exports = {
  idParamRule,
  listRules,
  approveRules,
  rejectRules,
};
