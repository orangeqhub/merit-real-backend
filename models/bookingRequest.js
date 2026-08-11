'use strict';

const { Model } = require('sequelize');

const BOOKING_STATUSES = [
  'BOOKING_REQUESTED',
  'BOOKING_VERIFICATION',
  'BOOKING_APPROVED',
  'PAYMENT_PENDING',
  'PARTIALLY_PAID',
  'FULLY_PAID',
  'BOOKING_CONFIRMED',
  'BOOKING_COMPLETED',
  'AWAITING_ADMIN_DECISION',
  'UNDER_REVIEW',
  'BOOKING_EXPIRED',
  'CONVERTED_TO_PURCHASE',
  'CANCELLED',
  'REJECTED',
];

/** Statuses that keep the property reserved (BOOKED). */
const ACTIVE_RESERVATION_STATUSES = [
  'BOOKING_REQUESTED',
  'BOOKING_VERIFICATION',
  'BOOKING_APPROVED',
  'PAYMENT_PENDING',
  'PARTIALLY_PAID',
  'FULLY_PAID',
  'BOOKING_CONFIRMED',
  'AWAITING_ADMIN_DECISION',
  'UNDER_REVIEW',
];

const DECISION_AWAITING_STATUSES = ['AWAITING_ADMIN_DECISION', 'UNDER_REVIEW'];

const PAYMENT_STATUSES = ['PENDING', 'PARTIAL', 'FULLY_PAID'];

const RESERVATION_DAYS = 15;

module.exports = (sequelize, DataTypes) => {
  class BookingRequest extends Model {
    static associate(models) {
      BookingRequest.belongsTo(models.ExpressInterest, { foreignKey: 'expressInterestId', as: 'expressInterest' });
      BookingRequest.belongsTo(models.User, { foreignKey: 'customerId', as: 'customer' });
      BookingRequest.belongsTo(models.User, { foreignKey: 'assignedAgentId', as: 'assignedAgent' });
      BookingRequest.belongsTo(models.Property, { foreignKey: 'propertyId', as: 'property' });
      BookingRequest.hasMany(models.BookingRequestHistory, { foreignKey: 'bookingRequestId', as: 'history' });
      BookingRequest.hasMany(models.BookingPayment, { foreignKey: 'bookingRequestId', as: 'payments' });
      BookingRequest.hasMany(models.BookingFollowUp, { foreignKey: 'bookingRequestId', as: 'followUps' });
    }
  }

  BookingRequest.BOOKING_STATUSES = BOOKING_STATUSES;
  BookingRequest.ACTIVE_RESERVATION_STATUSES = ACTIVE_RESERVATION_STATUSES;
  BookingRequest.DECISION_AWAITING_STATUSES = DECISION_AWAITING_STATUSES;
  BookingRequest.PAYMENT_STATUSES = PAYMENT_STATUSES;
  BookingRequest.RESERVATION_DAYS = RESERVATION_DAYS;

  BookingRequest.init({
    expressInterestId: { type: DataTypes.INTEGER, allowNull: false },
    customerId: { type: DataTypes.INTEGER, allowNull: false },
    propertyId: { type: DataTypes.INTEGER, allowNull: false },
    assignedAgentId: DataTypes.INTEGER,
    status: {
      type: DataTypes.ENUM(...BOOKING_STATUSES),
      allowNull: false,
      defaultValue: 'BOOKING_REQUESTED',
    },
    remarks: DataTypes.TEXT,
    adminRemarks: DataTypes.TEXT,
    internalRemarks: DataTypes.TEXT,
    rejectionReason: DataTypes.TEXT,
    bookingDate: DataTypes.DATE,
    expiryDate: DataTypes.DATE,
    originalExpiryDate: DataTypes.DATE,
    extensionCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    extensionHistory: { type: DataTypes.JSONB, allowNull: true, defaultValue: [] },
    adminDecision: DataTypes.STRING(40),
    decisionDate: DataTypes.DATE,
    decisionRemarks: DataTypes.TEXT,
    decisionBy: DataTypes.INTEGER,
    reviewDate: DataTypes.DATE,
    totalAmount: DataTypes.DECIMAL(14, 2),
    amountPaid: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
    paymentStatus: { type: DataTypes.STRING, allowNull: false, defaultValue: 'PENDING' },
    followUpStatus: { type: DataTypes.STRING, allowNull: true, defaultValue: 'PENDING_CUSTOMER_RESPONSE' },
    nextFollowUpAt: DataTypes.DATE,
    reminderFlags: { type: DataTypes.JSONB, allowNull: true, defaultValue: {} },
    createdBy: DataTypes.INTEGER,
    modifiedBy: DataTypes.INTEGER,
  }, {
    sequelize,
    modelName: 'BookingRequest',
    tableName: 'BookingRequests',
  });

  return BookingRequest;
};
