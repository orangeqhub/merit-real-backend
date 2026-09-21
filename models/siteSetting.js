'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class SiteSetting extends Model {
    static associate(models) {
      SiteSetting.belongsTo(models.User, { foreignKey: 'updatedBy', as: 'updater' });
    }
  }

  SiteSetting.init({
    address: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: '',
    },
    phone: {
      type: DataTypes.STRING(64),
      allowNull: false,
      defaultValue: '',
    },
    email: {
      type: DataTypes.STRING(120),
      allowNull: false,
      defaultValue: '',
    },
    updatedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  }, {
    sequelize,
    modelName: 'SiteSetting',
    tableName: 'SiteSettings',
  });

  return SiteSetting;
};
