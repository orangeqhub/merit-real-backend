'use strict';

const { body, param, query } = require('express-validator');
const { AGENT_GRADE_LIST, USER_STATUS_LIST } = require('../constants/roles');
const { ASSIGNABLE_EMPLOYEE_PERMISSIONS } = require('../constants/employeePermissions');

const idParamRule = [
  param('id').isInt({ min: 1 }).withMessage('Valid id is required.'),
];

const listRules = [
  query('page').optional({ checkFalsy: true }).isInt({ min: 1 }),
  query('pageSize').optional({ checkFalsy: true }).isInt({ min: 1, max: 200 }),
  query('search').optional({ nullable: true }).trim(),
  query('status').optional({ checkFalsy: true }).trim(),
  query('sortBy').optional({ checkFalsy: true }).isIn(['name', 'email', 'mobile', 'createdAt', 'status', 'memberId']),
  query('sortDir').optional({ checkFalsy: true }).isIn(['ASC', 'DESC', 'asc', 'desc']),
];

const permissionsRule = body('permissions')
  .optional({ nullable: true })
  .isArray()
  .withMessage('Permissions must be an array.')
  .custom((perms) => {
    if (!Array.isArray(perms)) return true;
    const allowed = new Set(ASSIGNABLE_EMPLOYEE_PERMISSIONS);
    const invalid = perms.filter((p) => !allowed.has(String(p)));
    if (invalid.length) {
      throw new Error(`Invalid permissions: ${invalid.join(', ')}`);
    }
    return true;
  });

const createRules = [
  body('name').trim().notEmpty().withMessage('Name is required.'),
  body('mobile').trim().matches(/^\d{10}$/).withMessage('Mobile must be a 10-digit number.'),
  body('email').trim().isEmail().withMessage('Valid email is required.'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters.'),
  body('district').optional({ nullable: true }).trim(),
  body('city').optional({ nullable: true }).trim(),
  body('address').optional({ nullable: true }).trim(),
  body('occupation').optional({ nullable: true }).trim(),
  body('preferredPropertyType').optional({ nullable: true }).trim(),
  body('status').optional({ checkFalsy: true }).trim(),
  body('agentGrade').optional({ nullable: true, checkFalsy: true })
    .customSanitizer((v) => String(v).trim().toUpperCase())
    .isIn(AGENT_GRADE_LIST)
    .withMessage(`Grade must be one of: ${AGENT_GRADE_LIST.join(', ')}.`),
  body('grade').optional({ nullable: true, checkFalsy: true })
    .customSanitizer((v) => String(v).trim().toUpperCase())
    .isIn(AGENT_GRADE_LIST)
    .withMessage(`Grade must be one of: ${AGENT_GRADE_LIST.join(', ')}.`),
];

const updateRules = [
  ...idParamRule,
  body('name').optional({ checkFalsy: true }).trim().notEmpty(),
  body('mobile').optional({ checkFalsy: true }).trim().matches(/^\d{10}$/),
  body('email').optional({ checkFalsy: true }).trim().isEmail(),
  body('password').optional({ checkFalsy: true }).isLength({ min: 6 }),
  body('district').optional({ nullable: true }).trim(),
  body('city').optional({ nullable: true }).trim(),
  body('address').optional({ nullable: true }).trim(),
  body('occupation').optional({ nullable: true }).trim(),
  body('preferredPropertyType').optional({ nullable: true }).trim(),
  body('status').optional({ checkFalsy: true }).trim(),
  body('agentGrade').optional({ nullable: true, checkFalsy: true })
    .customSanitizer((v) => String(v).trim().toUpperCase())
    .isIn(AGENT_GRADE_LIST),
  body('grade').optional({ nullable: true, checkFalsy: true })
    .customSanitizer((v) => String(v).trim().toUpperCase())
    .isIn(AGENT_GRADE_LIST),
];

const employeeCreateRules = [
  ...createRules,
  permissionsRule,
];

const employeeUpdateRules = [
  ...updateRules,
  permissionsRule,
];

module.exports = {
  idParamRule,
  listRules,
  createRules,
  updateRules,
  employeeCreateRules,
  employeeUpdateRules,
  USER_STATUS_LIST,
};
