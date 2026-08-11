'use strict';

const { Model } = require('sequelize');

const FOLLOW_UP_STATUSES = [
  'PENDING_CUSTOMER_RESPONSE',
  'CUSTOMER_INTERESTED',
  'WAITING_FOR_PAYMENT',
  'PAYMENT_RECEIVED',
  'DOCUMENTATION_PENDING',
  'COMPLETED',
];

module.exports = (sequelize, DataTypes) => {
  class BookingFollowUp extends Model {
    static associate(models) {
      BookingFollowUp.belongsTo(models.BookingRequest, { foreignKey: 'bookingRequestId', as: 'booking' });
      BookingFollowUp.belongsTo(models.User, { foreignKey: 'createdBy', as: 'actor' });
    }
  }

  BookingFollowUp.FOLLOW_UP_STATUSES = FOLLOW_UP_STATUSES;

  BookingFollowUp.init({
    bookingRequestId: { type: DataTypes.INTEGER, allowNull: false },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'PENDING_CUSTOMER_RESPONSE',
    },
    remarks: DataTypes.TEXT,
    nextFollowUpAt: DataTypes.DATE,
    createdBy: DataTypes.INTEGER,
    modifiedBy: DataTypes.INTEGER,
  }, {
    sequelize,
    modelName: 'BookingFollowUp',
    tableName: 'BookingFollowUps',
  });

  return BookingFollowUp;
};
