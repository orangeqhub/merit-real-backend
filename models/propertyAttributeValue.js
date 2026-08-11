'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PropertyAttributeValue extends Model {
    static associate(models) {
      PropertyAttributeValue.belongsTo(models.Property, {
        foreignKey: 'propertyId',
        as: 'property',
      });
      PropertyAttributeValue.belongsTo(models.PropertyAttribute, {
        foreignKey: 'attributeId',
        as: 'attribute',
      });
    }
  }

  PropertyAttributeValue.init({
    propertyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    attributeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  }, {
    sequelize,
    modelName: 'PropertyAttributeValue',
    tableName: 'PropertyAttributeValues',
  });

  return PropertyAttributeValue;
};
