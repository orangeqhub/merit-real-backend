'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class SiteVisitRescheduleHistory extends Model {
    static associate(models) {
      SiteVisitRescheduleHistory.belongsTo(models.SiteVisit, { foreignKey: 'siteVisitId', as: 'siteVisit' });
      SiteVisitRescheduleHistory.belongsTo(models.User, { foreignKey: 'requestedById', as: 'requestedBy' });
      SiteVisitRescheduleHistory.belongsTo(models.User, { foreignKey: 'appliedById', as: 'appliedBy' });
    }
  }
  SiteVisitRescheduleHistory.init({
    siteVisitId: { type: DataTypes.INTEGER, allowNull: false },
    oldVisitDate: DataTypes.DATEONLY,
    oldVisitTime: DataTypes.STRING(16),
    oldScheduledAt: DataTypes.DATE,
    newVisitDate: { type: DataTypes.DATEONLY, allowNull: false },
    newVisitTime: { type: DataTypes.STRING(16), allowNull: false },
    newScheduledAt: { type: DataTypes.DATE, allowNull: false },
    reason: { type: DataTypes.TEXT, allowNull: false },
    status: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'APPLIED' },
    requestedById: DataTypes.INTEGER,
    appliedById: DataTypes.INTEGER,
    metadata: { type: DataTypes.JSONB, defaultValue: {} },
  }, {
    sequelize,
    modelName: 'SiteVisitRescheduleHistory',
    tableName: 'SiteVisitRescheduleHistories',
  });
  return SiteVisitRescheduleHistory;
};
