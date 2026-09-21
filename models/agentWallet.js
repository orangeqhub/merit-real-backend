'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class AgentWallet extends Model {
    static associate(models) {
      AgentWallet.belongsTo(models.User, { foreignKey: 'agentId', as: 'agent' });
      AgentWallet.hasMany(models.WalletTransaction, { foreignKey: 'walletId', as: 'transactions' });
      AgentWallet.hasMany(models.WalletRedemptionRequest, { foreignKey: 'walletId', as: 'redemptions' });
    }
  }

  AgentWallet.init({
    agentId: { type: DataTypes.INTEGER, allowNull: false, unique: true },
    balance: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
    pendingRedemption: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
    totalEarned: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
    totalRedeemed: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
    lastCreditAt: DataTypes.DATE,
    lastRedemptionAt: DataTypes.DATE,
    createdBy: DataTypes.INTEGER,
    modifiedBy: DataTypes.INTEGER,
  }, {
    sequelize,
    modelName: 'AgentWallet',
    tableName: 'AgentWallets',
  });

  return AgentWallet;
};
