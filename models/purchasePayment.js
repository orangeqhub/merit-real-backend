'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PurchasePayment extends Model {
    static associate(models) {
      PurchasePayment.belongsTo(models.PurchaseRequest, { foreignKey: 'purchaseRequestId', as: 'purchase' });
      PurchasePayment.belongsTo(models.User, { foreignKey: 'recordedBy', as: 'recorder' });
    }
  }

  PurchasePayment.init({
    purchaseRequestId: { type: DataTypes.INTEGER, allowNull: false },
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
    modelName: 'PurchasePayment',
    tableName: 'PurchasePayments',
  });

  return PurchasePayment;
};
