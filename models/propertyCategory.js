'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PropertyCategory extends Model {
    static associate(models) {
      PropertyCategory.hasMany(models.PropertyAttribute, {
        foreignKey: 'categoryId',
        as: 'attributes',
      });
      PropertyCategory.hasMany(models.Property, {
        foreignKey: 'categoryId',
        as: 'properties',
      });
    }
  }

  PropertyCategory.init({
    slug: {
      type: DataTypes.STRING(120),
      allowNull: false,
      unique: true,
    },
    nameEn: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    nameTe: DataTypes.STRING(200),
    descriptionEn: DataTypes.TEXT,
    descriptionTe: DataTypes.TEXT,
    groupLabel: DataTypes.STRING(200),
    image: DataTypes.STRING,
    icon: {
      type: DataTypes.STRING(80),
      allowNull: false,
      defaultValue: 'Home',
    },
    ruleKey: {
      type: DataTypes.STRING(80),
      allowNull: false,
    },
    transactionTypes: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: ['sale'],
    },
    areaUnits: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: ['sqft'],
    },
    propertyFields: DataTypes.STRING,
    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    visible: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  }, {
    sequelize,
    modelName: 'PropertyCategory',
    tableName: 'PropertyCategories',
  });

  return PropertyCategory;
};
