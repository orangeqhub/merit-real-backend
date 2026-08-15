'use strict';

const { body, param, query } = require('express-validator');

const submitRules = [
  body('visitMode').optional().isIn(['own_vehicle', 'company_vehicle']),
  body('visitorCount').optional().isInt({ min: 1, max: 20 }),
  body('propertyId').isInt({ min: 1 }).withMessage('Valid propertyId is required'),
  body('visitDate').optional().isString().trim(),
  body('preferredDate').optional().isString().trim(),
  body('visitTime').optional().isString().trim(),
  body('preferredTime').optional().isString().trim(),
  body('remarks').optional({ nullable: true }).isString().isLength({ max: 2000 }),
  body('referralAgentCode').optional({ nullable: true }).isString().trim().isLength({ max: 64 }),
  body('agentId').optional({ nullable: true }).isString().trim().isLength({ max: 64 }),
  body('expressInterestId').optional({ nullable: true, checkFalsy: true }).isInt({ min: 1 }),
  body('meetingLocation').optional({ nullable: true }).isString().trim().isLength({ max: 1000 }),
  body('attendeeCount').optional({ nullable: true }).isInt({ min: 1, max: 20 }),
  body('vehicleRequired').optional({ nullable: true }).isBoolean(),
  body('needVehicle').optional({ nullable: true }).isBoolean(),
  body('transportRequired').optional({ nullable: true }).isBoolean(),
  body('pickupAddress').optional({ nullable: true }).isString().trim().isLength({ max: 2000 }),
  body('pickupAt').optional({ nullable: true }).isISO8601(),
  body('pickupLocation').optional({ nullable: true }).isString().trim().isLength({ max: 2000 }),
  body('preferredPickupTime').optional({ nullable: true }).matches(/^([01]\d|2[0-3]):[0-5]\d$/),
  body().custom((_, { req }) => {
    if (String(req.body?.visitMode || '').toLowerCase() !== 'company_vehicle') return true;
    if (
      !String(req.body?.pickupAddress || '').trim()
      || !String(req.body?.pickupLocation || '').trim()
      || !String(req.body?.preferredPickupTime || '').trim()
    ) {
      throw new Error('Company vehicle requires pickupAddress, pickupLocation, and preferredPickupTime');
    }
    return true;
  }),
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

const rescheduleRules = [
  ...idParam,
  body('visitDate').optional().isISO8601({ strict: true }),
  body('preferredDate').optional().isISO8601({ strict: true }),
  body('visitTime').optional().matches(/^([01]\d|2[0-3]):[0-5]\d$/),
  body('preferredTime').optional().matches(/^([01]\d|2[0-3]):[0-5]\d$/),
  body('reason').optional().isString().trim().isLength({ max: 2000 }),
  body('rescheduleReason').optional().isString().trim().isLength({ max: 2000 }),
];

const reasonRules = [
  ...idParam,
  body('reason').optional().isString().trim().isLength({ max: 2000 }),
  body('remarks').optional().isString().trim().isLength({ max: 2000 }),
];

const vehicleRules = [
  ...idParam,
  body('vehicleRequired').optional().isBoolean(),
  body('vehicleStatus').optional().isString().trim().isLength({ max: 32 }),
  body('status').optional().isString().trim().isLength({ max: 32 }),
  body('vehicleType').optional({ nullable: true }).isString().trim().isLength({ max: 80 }),
  body('vehicleNumber').optional({ nullable: true }).isString().trim().isLength({ max: 40 }),
  body('driverName').optional({ nullable: true }).isString().trim().isLength({ max: 120 }),
  body('driverMobile').optional({ nullable: true }).isString().trim().isLength({ max: 24 }),
  body('pickupAddress').optional({ nullable: true }).isString().trim().isLength({ max: 2000 }),
  body('pickupAt').optional({ nullable: true }).isISO8601(),
  body('vehicleModel').optional({ nullable: true }).isString().trim().isLength({ max: 120 }),
  body('vehicleColor').optional({ nullable: true }).isString().trim().isLength({ max: 60 }),
  body('vehicleCapacity').optional({ nullable: true }).isInt({ min: 1, max: 100 }),
  body('capacity').optional({ nullable: true }).isInt({ min: 1, max: 100 }),
  body('vehicleReference').optional({ nullable: true }).isString().trim().isLength({ max: 120 }),
  body('driverId').optional({ nullable: true }).isInt({ min: 1 }),
  body('driverPhone').optional({ nullable: true }).isString().trim().isLength({ max: 24 }),
  body('driverReference').optional({ nullable: true }).isString().trim().isLength({ max: 120 }),
  body('driverLicenseNumber').optional({ nullable: true }).isString().trim().isLength({ max: 80 }),
  body('pickupDate').optional({ nullable: true }).isISO8601({ strict: true }),
  body('pickupTime').optional({ nullable: true }).matches(/^([01]\d|2[0-3]):[0-5]\d$/),
  body('pickupLocation').optional({ nullable: true }).isString().trim().isLength({ max: 2000 }),
  body('dropLocation').optional({ nullable: true }).isString().trim().isLength({ max: 2000 }),
  body('driverRemarks').optional({ nullable: true }).isString().trim().isLength({ max: 4000 }),
  body('vehicleRemarks').optional({ nullable: true }).isString().trim().isLength({ max: 4000 }),
  body('remarks').optional({ nullable: true }).isString().trim().isLength({ max: 4000 }),
];

const startRules = [
  ...idParam,
  body('overrideEarlyStart').optional().isBoolean(),
  body('remarks').optional().isString().trim().isLength({ max: 2000 }),
  body('note').optional().isString().trim().isLength({ max: 2000 }),
];

const followUpRules = [
  ...idParam,
  body('remarks').optional().isString().trim().isLength({ max: 4000 }),
  body('remark').optional().isString().trim().isLength({ max: 4000 }),
  body('note').optional().isString().trim().isLength({ max: 4000 }),
  body('status').optional().isString().trim().isLength({ max: 40 }),
  body('followUpStatus').optional().isString().trim().isLength({ max: 40 }),
  body('nextFollowUpAt').optional({ nullable: true }).isISO8601(),
];

module.exports = {
  submitRules,
  idParam,
  rejectRules,
  assignRules,
  dropRules,
  validateAgentRules,
  rescheduleRules,
  reasonRules,
  vehicleRules,
  followUpRules,
  startRules,
};
