'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class AgentBankDetailHistory extends Model {
    static associate() {}
  }

  AgentBankDetailHistory.init({
    agentId: { type: DataTypes.INTEGER, allowNull: false },
    bankDetailId: { type: DataTypes.INTEGER, allowNull: false },
    snapshotJson: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
    note: DataTypes.TEXT,
    createdBy: DataTypes.INTEGER,
  }, {
    sequelize,
    modelName: 'AgentBankDetailHistory',
    tableName: 'AgentBankDetailHistories',
  });

  return AgentBankDetailHistory;
};
