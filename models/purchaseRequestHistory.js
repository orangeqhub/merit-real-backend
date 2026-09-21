'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PurchaseRequestHistory extends Model {
    static associate(models) {
      PurchaseRequestHistory.belongsTo(models.PurchaseRequest, { foreignKey: 'purchaseRequestId', as: 'purchaseRequest' });
      PurchaseRequestHistory.belongsTo(models.User, { foreignKey: 'createdBy', as: 'actor' });
    }
  }

  PurchaseRequestHistory.init({
    purchaseRequestId: { type: DataTypes.INTEGER, allowNull: false },
    fromStatus: DataTypes.STRING,
    toStatus: { type: DataTypes.STRING, allowNull: false },
    note: DataTypes.TEXT,
    createdBy: DataTypes.INTEGER,
  }, {
    sequelize,
    modelName: 'PurchaseRequestHistory',
    tableName: 'PurchaseRequestHistories',
  });

  return PurchaseRequestHistory;
};
