'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class WalletRedemptionRequest extends Model {
    static associate(models) {
      WalletRedemptionRequest.belongsTo(models.User, { foreignKey: 'agentId', as: 'agent' });
      WalletRedemptionRequest.belongsTo(models.AgentWallet, { foreignKey: 'walletId', as: 'wallet' });
      WalletRedemptionRequest.hasOne(models.WalletSettlement, { foreignKey: 'redemptionRequestId', as: 'settlement' });
    }
  }

  WalletRedemptionRequest.init({
    requestCode: { type: DataTypes.STRING(60), allowNull: false, unique: true },
    agentId: { type: DataTypes.INTEGER, allowNull: false },
    walletId: { type: DataTypes.INTEGER, allowNull: false },
    amount: { type: DataTypes.DECIMAL(14, 2), allowNull: false },
    status: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'PENDING' },
    remarks: DataTypes.TEXT,
    adminRemarks: DataTypes.TEXT,
    bankSnapshotJson: { type: DataTypes.JSONB, allowNull: true, defaultValue: {} },
    reviewedBy: DataTypes.INTEGER,
    reviewedAt: DataTypes.DATE,
    settlementDate: DataTypes.DATE,
    settledBy: DataTypes.INTEGER,
    createdBy: DataTypes.INTEGER,
    modifiedBy: DataTypes.INTEGER,
  }, {
    sequelize,
    modelName: 'WalletRedemptionRequest',
    tableName: 'WalletRedemptionRequests',
  });

  return WalletRedemptionRequest;
};
