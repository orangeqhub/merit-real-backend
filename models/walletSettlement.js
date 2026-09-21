'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class WalletSettlement extends Model {
    static associate(models) {
      WalletSettlement.belongsTo(models.WalletRedemptionRequest, { foreignKey: 'redemptionRequestId', as: 'redemption' });
    }
  }

  WalletSettlement.init({
    redemptionRequestId: { type: DataTypes.INTEGER, allowNull: false, unique: true },
    agentId: { type: DataTypes.INTEGER, allowNull: false },
    amount: { type: DataTypes.DECIMAL(14, 2), allowNull: false },
    settledBy: DataTypes.INTEGER,
    settledAt: { type: DataTypes.DATE, allowNull: false },
    remarks: DataTypes.TEXT,
    createdBy: DataTypes.INTEGER,
    modifiedBy: DataTypes.INTEGER,
  }, {
    sequelize,
    modelName: 'WalletSettlement',
    tableName: 'WalletSettlements',
  });

  return WalletSettlement;
};
