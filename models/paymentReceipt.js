'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PaymentReceipt extends Model {
    static associate(models) {
      PaymentReceipt.belongsTo(models.User, { foreignKey: 'customerId', as: 'customer' });
      PaymentReceipt.belongsTo(models.Property, { foreignKey: 'propertyId', as: 'property' });
      PaymentReceipt.belongsTo(models.BookingRequest, { foreignKey: 'bookingRequestId', as: 'booking' });
      PaymentReceipt.belongsTo(models.PurchaseRequest, { foreignKey: 'purchaseRequestId', as: 'purchase' });
      PaymentReceipt.belongsTo(models.PurchasePayment, { foreignKey: 'purchasePaymentId', as: 'purchasePayment' });
      PaymentReceipt.belongsTo(models.BookingPayment, { foreignKey: 'bookingPaymentId', as: 'bookingPayment' });
    }
  }

  PaymentReceipt.init({
    receiptNumber: { type: DataTypes.STRING(60), allowNull: false, unique: true },
    customerId: { type: DataTypes.INTEGER, allowNull: false },
    propertyId: { type: DataTypes.INTEGER, allowNull: false },
    bookingRequestId: DataTypes.INTEGER,
    purchaseRequestId: DataTypes.INTEGER,
    purchasePaymentId: DataTypes.INTEGER,
    bookingPaymentId: DataTypes.INTEGER,
    amount: { type: DataTypes.DECIMAL(14, 2), allowNull: false },
    totalPropertyAmount: DataTypes.DECIMAL(14, 2),
    totalAmountPaid: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
    balanceAmount: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
    paymentMethod: DataTypes.STRING(80),
    paymentReference: DataTypes.STRING(80),
    paymentDate: { type: DataTypes.DATE, allowNull: false },
    receiptDate: { type: DataTypes.DATE, allowNull: false },
    status: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'PARTIAL' },
    remarks: DataTypes.TEXT,
    snapshotJson: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
    verificationCode: DataTypes.STRING(80),
    createdBy: DataTypes.INTEGER,
    modifiedBy: DataTypes.INTEGER,
  }, {
    sequelize,
    modelName: 'PaymentReceipt',
    tableName: 'PaymentReceipts',
  });

  return PaymentReceipt;
};
