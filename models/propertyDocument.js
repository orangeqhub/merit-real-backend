'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PropertyDocument extends Model {
    static associate(models) {
      PropertyDocument.belongsTo(models.Property, {
        foreignKey: 'propertyId',
        as: 'property',
      });
      PropertyDocument.belongsTo(models.User, {
        foreignKey: 'uploadedByUserId',
        as: 'uploadedBy',
      });
    }
  }

  PropertyDocument.init({
    propertyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    fileName: {
      type: DataTypes.STRING(300),
      allowNull: false,
    },
    storedFileName: {
      type: DataTypes.STRING(300),
      allowNull: false,
    },
    mimeType: {
      type: DataTypes.STRING(120),
      allowNull: false,
      defaultValue: 'application/pdf',
    },
    fileSize: {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue: 0,
    },
    uploadedByUserId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  }, {
    sequelize,
    modelName: 'PropertyDocument',
    tableName: 'PropertyDocuments',
  });

  return PropertyDocument;
};
