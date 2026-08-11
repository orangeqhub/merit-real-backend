'use strict';

const { body, query } = require('express-validator');

const registerRules = [
  body('name').trim().notEmpty().withMessage('Name is required.'),
  body('mobile')
    .trim()
    .matches(/^\d{10}$/)
    .withMessage('Mobile must be a 10-digit number.'),
  body('email').trim().isEmail().withMessage('Valid email is required.'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters.'),
  body('role')
    .trim()
    .notEmpty()
    .withMessage('Role is required.')
    .customSanitizer((value) => String(value).toLowerCase())
    .isIn(['customer', 'agent', 'sales_member'])
    .withMessage('Role must be customer, agent, or sales_member.'),
  body('agentCategoryId')
    .optional({ nullable: true, checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage('agentCategoryId must be a valid category id.'),
  body('district').optional({ nullable: true }).trim(),
  body('city').optional({ nullable: true }).trim(),
  body('address').optional({ nullable: true }).trim(),
  body('preferredPropertyType').optional({ nullable: true }).trim(),
  body('occupation')
    .trim()
    .notEmpty()
    .withMessage('Occupation is required.'),
  body('aadhaarNumber')
    .trim()
    .notEmpty()
    .withMessage('Aadhaar number is required.')
    .matches(/^\d{12}$/)
    .withMessage('Aadhaar number must be exactly 12 digits.'),
  body('panNumber')
    .trim()
    .notEmpty()
    .withMessage('PAN number is required.')
    .customSanitizer((value) => String(value || '').toUpperCase())
    .matches(/^[A-Z]{5}[0-9]{4}[A-Z]$/)
    .withMessage('PAN number must follow the format ABCDE1234F.'),
  body('referralAgentCode')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ min: 3, max: 40 })
    .withMessage('Agent referral code must be 3–40 characters.'),
];

const loginRules = [
  body('password').notEmpty().withMessage('Password is required.'),
  body().custom((_value, { req }) => {
    if (!req.body.identifier && !req.body.email && !req.body.mobile) {
      throw new Error('Provide identifier, email, or mobile.');
    }
    return true;
  }),
];

const applicationStatusRules = [
  query('mobile')
    .trim()
    .matches(/^\d{10}$/)
    .withMessage('Mobile must be a 10-digit number.'),
];

const updateProfileRules = [
  body('name').optional({ checkFalsy: true }).trim().notEmpty().withMessage('Name is required.'),
  body('email').optional({ checkFalsy: true }).trim().isEmail().withMessage('Valid email is required.'),
  body('address').optional({ nullable: true }).trim(),
  body('occupation')
    .optional({ nullable: true })
    .custom((value) => {
      if (value === undefined || value === null) return true;
      if (!String(value).trim()) {
        throw new Error('Occupation is required.');
      }
      return true;
    }),
  body('referralAgentCode')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ min: 3, max: 40 })
    .withMessage('Agent referral code must be 3–40 characters.'),
  body('clearReferralAgent')
    .optional({ nullable: true, checkFalsy: true })
    .isIn([true, false, 'true', 'false', '1', '0', 1, 0])
    .withMessage('clearReferralAgent must be a boolean-like value.'),
];

module.exports = {
  registerRules,
  loginRules,
  applicationStatusRules,
  updateProfileRules,
};
