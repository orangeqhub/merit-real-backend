'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class WalletTransaction extends Model {
    static associate(models) {
      WalletTransaction.belongsTo(models.AgentWallet, { foreignKey: 'walletId', as: 'wallet' });
      WalletTransaction.belongsTo(models.User, { foreignKey: 'agentId', as: 'agent' });
      WalletTransaction.belongsTo(models.ClosedDeal, { foreignKey: 'closedDealId', as: 'closedDeal' });
      WalletTransaction.belongsTo(models.WalletRedemptionRequest, { foreignKey: 'redemptionRequestId', as: 'redemption' });
    }
  }

  WalletTransaction.init({
    transactionCode: { type: DataTypes.STRING(60), allowNull: false, unique: true },
    walletId: { type: DataTypes.INTEGER, allowNull: false },
    agentId: { type: DataTypes.INTEGER, allowNull: false },
    type: { type: DataTypes.STRING(40), allowNull: false },
    amount: { type: DataTypes.DECIMAL(14, 2), allowNull: false },
    status: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'COMPLETED' },
    closedDealId: DataTypes.INTEGER,
    redemptionRequestId: DataTypes.INTEGER,
    remarks: DataTypes.TEXT,
    metaJson: { type: DataTypes.JSONB, allowNull: true, defaultValue: {} },
    createdBy: DataTypes.INTEGER,
    modifiedBy: DataTypes.INTEGER,
  }, {
    sequelize,
    modelName: 'WalletTransaction',
    tableName: 'WalletTransactions',
  });

  return WalletTransaction;
};
