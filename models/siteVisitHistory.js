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
    action: DataTypes.STRING(80),
    actorRole: DataTypes.STRING(40),
    remarks: DataTypes.TEXT,
    metadata: { type: DataTypes.JSONB, defaultValue: {} },
    createdBy: DataTypes.INTEGER,
  }, {
    sequelize,
    modelName: 'SiteVisitHistory',
    tableName: 'SiteVisitHistories',
  });

  return SiteVisitHistory;
};
