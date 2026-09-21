'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class SalesHistory extends Model {
    static associate(models) {
      SalesHistory.belongsTo(models.PurchaseRequest, { foreignKey: 'purchaseRequestId', as: 'purchase' });
    }
  }

  SalesHistory.init({
    purchaseRequestId: { type: DataTypes.INTEGER, allowNull: false },
    propertyId: { type: DataTypes.INTEGER, allowNull: false },
    customerId: { type: DataTypes.INTEGER, allowNull: false },
    agentId: DataTypes.INTEGER,
    eventType: { type: DataTypes.STRING(60), allowNull: false },
    fromStatus: DataTypes.STRING(60),
    toStatus: DataTypes.STRING(60),
    amount: DataTypes.DECIMAL(14, 2),
    note: DataTypes.TEXT,
    metaJson: { type: DataTypes.JSONB, allowNull: true, defaultValue: {} },
    createdBy: DataTypes.INTEGER,
    modifiedBy: DataTypes.INTEGER,
  }, {
    sequelize,
    modelName: 'SalesHistory',
    tableName: 'SalesHistories',
  });

  return SalesHistory;
};
