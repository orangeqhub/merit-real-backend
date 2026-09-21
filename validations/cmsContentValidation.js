'use strict';

const { body } = require('express-validator');

const updateCmsContentRules = [
  body('aboutEn').optional({ nullable: true }).isString().isLength({ max: 20000 }),
  body('aboutTe').optional({ nullable: true }).isString().isLength({ max: 20000 }),
  body('disclaimerEn').optional({ nullable: true }).isString().isLength({ max: 20000 }),
  body('disclaimerTe').optional({ nullable: true }).isString().isLength({ max: 20000 }),
  body('contactPhone').optional({ nullable: true }).isString().trim().isLength({ max: 64 }),
  body('contactWhatsapp').optional({ nullable: true }).isString().trim().isLength({ max: 64 }),
  body('contactEmail').optional({ nullable: true }).isString().trim().isLength({ max: 120 }),
  body('contactAddressEn').optional({ nullable: true }).isString().isLength({ max: 1000 }),
  body('contactAddressTe').optional({ nullable: true }).isString().isLength({ max: 1000 }),
  body('contactLandmarkEn').optional({ nullable: true }).isString().trim().isLength({ max: 255 }),
  body('contactLandmarkTe').optional({ nullable: true }).isString().trim().isLength({ max: 255 }),
  body('contactMapUrl').optional({ nullable: true }).isString().trim().isLength({ max: 500 }),
  body('businessHoursWeekdayEn').optional({ nullable: true }).isString().isLength({ max: 2000 }),
  body('businessHoursWeekdayTe').optional({ nullable: true }).isString().isLength({ max: 2000 }),
  body('businessHoursSundayEn').optional({ nullable: true }).isString().isLength({ max: 2000 }),
  body('businessHoursSundayTe').optional({ nullable: true }).isString().isLength({ max: 2000 }),
];

module.exports = { updateCmsContentRules };
