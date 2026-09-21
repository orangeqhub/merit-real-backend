'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PurchaseReceipt extends Model {
    static associate(models) {
      PurchaseReceipt.belongsTo(models.PurchaseRequest, { foreignKey: 'purchaseRequestId', as: 'purchase' });
      PurchaseReceipt.belongsTo(models.User, { foreignKey: 'generatedBy', as: 'generator' });
    }
  }

  PurchaseReceipt.init({
    purchaseRequestId: { type: DataTypes.INTEGER, allowNull: false },
    receiptNumber: { type: DataTypes.STRING(60), allowNull: false, unique: true },
    receiptType: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'SALE' },
    receiptDate: { type: DataTypes.DATE, allowNull: false },
    snapshotJson: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
    generatedBy: DataTypes.INTEGER,
    createdBy: DataTypes.INTEGER,
    modifiedBy: DataTypes.INTEGER,
  }, {
    sequelize,
    modelName: 'PurchaseReceipt',
    tableName: 'PurchaseReceipts',
  });

  return PurchaseReceipt;
};
