'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class FollowUpRemark extends Model {
    static associate(models) {
      FollowUpRemark.belongsTo(models.ExpressInterest, { foreignKey: 'interestId', as: 'interest' });
      FollowUpRemark.belongsTo(models.User, { foreignKey: 'agentId', as: 'agent' });
    }
  }

  FollowUpRemark.init({
    interestId: { type: DataTypes.INTEGER, allowNull: false },
    agentId: DataTypes.INTEGER,
    remark: { type: DataTypes.TEXT, allowNull: false },
    followUpStatus: DataTypes.STRING,
    createdBy: DataTypes.INTEGER,
    modifiedBy: DataTypes.INTEGER,
  }, {
    sequelize,
    modelName: 'FollowUpRemark',
    tableName: 'FollowUpRemarks',
  });

  return FollowUpRemark;
};
