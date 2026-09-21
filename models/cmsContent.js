'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class CmsContent extends Model {
    static associate(models) {
      CmsContent.belongsTo(models.User, { foreignKey: 'updatedBy', as: 'updater' });
    }
  }

  CmsContent.init({
    aboutEn: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: '',
    },
    aboutTe: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: '',
    },
    disclaimerEn: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: '',
    },
    disclaimerTe: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: '',
    },
    contactPhone: {
      type: DataTypes.STRING(64),
      allowNull: false,
      defaultValue: '',
    },
    contactWhatsapp: {
      type: DataTypes.STRING(64),
      allowNull: false,
      defaultValue: '',
    },
    contactEmail: {
      type: DataTypes.STRING(120),
      allowNull: false,
      defaultValue: '',
    },
    contactAddressEn: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: '',
    },
    contactAddressTe: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: '',
    },
    contactLandmarkEn: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: '',
    },
    contactLandmarkTe: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: '',
    },
    contactMapUrl: {
      type: DataTypes.STRING(500),
      allowNull: false,
      defaultValue: '',
    },
    businessHoursWeekdayEn: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: '',
    },
    businessHoursWeekdayTe: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: '',
    },
    businessHoursSundayEn: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: '',
    },
    businessHoursSundayTe: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: '',
    },
    updatedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  }, {
    sequelize,
    modelName: 'CmsContent',
    tableName: 'CmsContents',
  });

  return CmsContent;
};
