'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PropertyAttribute extends Model {
    static associate(models) {
      PropertyAttribute.belongsTo(models.PropertyCategory, {
        foreignKey: 'categoryId',
        as: 'category',
      });
      PropertyAttribute.belongsToMany(models.Property, {
        through: models.PropertyAttributeValue,
        foreignKey: 'attributeId',
        otherKey: 'propertyId',
        as: 'properties',
      });
    }
  }

  PropertyAttribute.init({
    categoryId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM('SPECIFICATION', 'AMENITY'),
      allowNull: false,
    },
    nameEn: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    nameTe: DataTypes.TEXT,
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  }, {
    sequelize,
    modelName: 'PropertyAttribute',
    tableName: 'PropertyAttributes',
  });

  return PropertyAttribute;
};
