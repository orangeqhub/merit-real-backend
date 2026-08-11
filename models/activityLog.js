'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ActivityLog extends Model {
    static associate(models) {
      ActivityLog.belongsTo(models.User, { foreignKey: 'createdBy', as: 'actor' });
    }
  }

  ActivityLog.init({
    entityType: { type: DataTypes.STRING, allowNull: false },
    entityId: { type: DataTypes.INTEGER, allowNull: false },
    action: { type: DataTypes.STRING, allowNull: false },
    details: DataTypes.TEXT,
    createdBy: DataTypes.INTEGER,
  }, {
    sequelize,
    modelName: 'ActivityLog',
    tableName: 'ActivityLogs',
  });

  return ActivityLog;
};
