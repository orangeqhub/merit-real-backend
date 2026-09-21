'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PropertyImage extends Model {
    static associate(models) {
      PropertyImage.belongsTo(models.Property, {
        foreignKey: 'propertyId',
        as: 'property',
      });
    }
  }

  PropertyImage.init({
    propertyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    imagePath: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    caption: DataTypes.STRING(300),
    isPrimary: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  }, {
    sequelize,
    modelName: 'PropertyImage',
    tableName: 'PropertyImages',
  });

  return PropertyImage;
};
