'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class AgentBankDetail extends Model {
    static associate(models) {
      AgentBankDetail.belongsTo(models.User, { foreignKey: 'agentId', as: 'agent' });
    }
  }

  AgentBankDetail.init({
    agentId: { type: DataTypes.INTEGER, allowNull: false, unique: true },
    accountHolderName: { type: DataTypes.STRING(150), allowNull: false },
    bankName: { type: DataTypes.STRING(150), allowNull: false },
    branchName: DataTypes.STRING(150),
    accountNumber: { type: DataTypes.STRING(40), allowNull: false },
    ifscCode: { type: DataTypes.STRING(20), allowNull: false },
    accountType: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'SAVINGS' },
    upiId: DataTypes.STRING(120),
    panNumber: DataTypes.STRING(20),
    cancelledChequePath: DataTypes.STRING,
    passbookCopyPath: DataTypes.STRING,
    createdBy: DataTypes.INTEGER,
    modifiedBy: DataTypes.INTEGER,
  }, {
    sequelize,
    modelName: 'AgentBankDetail',
    tableName: 'AgentBankDetails',
  });

  return AgentBankDetail;
};
