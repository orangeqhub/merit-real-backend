'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ExpressInterestHistory extends Model {
    static associate(models) {
      ExpressInterestHistory.belongsTo(models.ExpressInterest, { foreignKey: 'interestId', as: 'interest' });
      ExpressInterestHistory.belongsTo(models.User, { foreignKey: 'createdBy', as: 'actor' });
    }
  }

  ExpressInterestHistory.init({
    interestId: { type: DataTypes.INTEGER, allowNull: false },
    fromStatus: DataTypes.STRING,
    toStatus: { type: DataTypes.STRING, allowNull: false },
    note: DataTypes.TEXT,
    createdBy: DataTypes.INTEGER,
  }, {
    sequelize,
    modelName: 'ExpressInterestHistory',
    tableName: 'ExpressInterestHistories',
  });

  return ExpressInterestHistory;
};
