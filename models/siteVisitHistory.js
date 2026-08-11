'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class SiteVisitHistory extends Model {
    static associate(models) {
      SiteVisitHistory.belongsTo(models.SiteVisit, { foreignKey: 'siteVisitId', as: 'siteVisit' });
      SiteVisitHistory.belongsTo(models.User, { foreignKey: 'createdBy', as: 'actor' });
    }
  }

  SiteVisitHistory.init({
    siteVisitId: { type: DataTypes.INTEGER, allowNull: false },
    fromStatus: DataTypes.STRING,
    toStatus: { type: DataTypes.STRING, allowNull: false },
    note: DataTypes.TEXT,
    createdBy: DataTypes.INTEGER,
  }, {
    sequelize,
    modelName: 'SiteVisitHistory',
    tableName: 'SiteVisitHistories',
  });

  return SiteVisitHistory;
};
