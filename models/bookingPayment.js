'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class BookingPayment extends Model {
    static associate(models) {
      BookingPayment.belongsTo(models.BookingRequest, { foreignKey: 'bookingRequestId', as: 'booking' });
      BookingPayment.belongsTo(models.User, { foreignKey: 'recordedBy', as: 'recorder' });
    }
  }

  BookingPayment.init({
    bookingRequestId: { type: DataTypes.INTEGER, allowNull: false },
    amount: { type: DataTypes.DECIMAL(14, 2), allowNull: false },
    paymentDate: { type: DataTypes.DATE, allowNull: false },
    paymentMethod: DataTypes.STRING(80),
    paymentReference: DataTypes.STRING(80),
    remarks: DataTypes.TEXT,
    proofPath: DataTypes.STRING,
    recordedBy: DataTypes.INTEGER,
    createdBy: DataTypes.INTEGER,
    modifiedBy: DataTypes.INTEGER,
  }, {
    sequelize,
    modelName: 'BookingPayment',
    tableName: 'BookingPayments',
  });

  return BookingPayment;
};
