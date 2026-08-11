'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Notification extends Model {
    static associate(models) {
      Notification.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    }
  }

  Notification.init({
    userId: { type: DataTypes.INTEGER, allowNull: false },
    userRole: { type: DataTypes.STRING, allowNull: false },
    titleEn: { type: DataTypes.STRING, allowNull: false },
    titleTe: DataTypes.STRING,
    messageEn: { type: DataTypes.TEXT, allowNull: false },
    messageTe: DataTypes.TEXT,
    notificationType: { type: DataTypes.STRING, allowNull: false },
    referenceType: DataTypes.STRING,
    referenceId: DataTypes.INTEGER,
    linkPath: DataTypes.STRING,
    imageUrl: DataTypes.STRING,
    isRead: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    createdBy: DataTypes.INTEGER,
  }, {
    sequelize,
    modelName: 'Notification',
    tableName: 'Notifications',
  });

  return Notification;
};
