'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Property extends Model {
    static associate(models) {
      Property.belongsTo(models.PropertyCategory, {
        foreignKey: 'categoryId',
        as: 'category',
      });
      Property.belongsTo(models.User, {
        foreignKey: 'postedByUserId',
        as: 'postedBy',
      });
      Property.hasMany(models.PropertyImage, {
        foreignKey: 'propertyId',
        as: 'images',
      });
      Property.belongsToMany(models.PropertyAttribute, {
        through: models.PropertyAttributeValue,
        foreignKey: 'propertyId',
        otherKey: 'attributeId',
        as: 'selectedAttributes',
      });
      Property.hasMany(models.PropertyAttributeValue, {
        foreignKey: 'propertyId',
        as: 'attributeValues',
      });
      Property.belongsToMany(models.Promotion, {
        through: models.PromotionProperty,
        foreignKey: 'propertyId',
        otherKey: 'promotionId',
        as: 'promotions',
      });
    }
  }

  Property.init({
    categoryId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    postedByUserId: DataTypes.INTEGER,
    titleEn: {
      type: DataTypes.STRING(300),
      allowNull: false,
    },
    titleTe: DataTypes.STRING(300),
    descriptionEn: DataTypes.TEXT,
    descriptionTe: DataTypes.TEXT,
    ventureName: DataTypes.STRING(200),
    transactionType: {
      type: DataTypes.STRING(40),
      allowNull: false,
      defaultValue: 'sale',
    },
    state: DataTypes.STRING(100),
    district: DataTypes.STRING(100),
    mandal: DataTypes.STRING(100),
    city: DataTypes.STRING(120),
    locality: DataTypes.STRING(200),
    landmark: DataTypes.STRING(200),
    pincode: DataTypes.STRING(20),
    address: DataTypes.TEXT,
    locationEn: DataTypes.STRING(400),
    locationTe: DataTypes.STRING(400),
    mapLocation: DataTypes.STRING(400),
    price: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
      defaultValue: 0,
    },
    priceNegotiable: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    area: DataTypes.STRING(120),
    areaUnit: {
      type: DataTypes.STRING(20),
      defaultValue: 'sqft',
    },
    dimensions: DataTypes.STRING(120),
    facing: DataTypes.STRING(60),
    northMeasurement: DataTypes.STRING(60),
    eastMeasurement: DataTypes.STRING(60),
    westMeasurement: DataTypes.STRING(60),
    southMeasurement: DataTypes.STRING(60),
    detailsJson: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    contactName: DataTypes.STRING(150),
    contactPhone: DataTypes.STRING(20),
    preferWhatsapp: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    preferCall: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    hidePhone: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    isFeatured: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    isTrending: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    isVerified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    status: {
      type: DataTypes.ENUM('ACTIVE', 'INACTIVE', 'DRAFT', 'BOOKED', 'SOLD'),
      allowNull: false,
      defaultValue: 'ACTIVE',
    },
    viewCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  }, {
    sequelize,
    modelName: 'Property',
    tableName: 'Properties',
  });

  return Property;
};
