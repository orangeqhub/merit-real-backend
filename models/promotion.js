'use strict';

const { Model } = require('sequelize');

const PROMOTION_TYPES = [
  'TRENDING_PROPERTY',
  'FEATURED_PROPERTY',
  'HOT_PROPERTY',
  'LIMITED_TIME_OFFER',
  'NEW_LAUNCH',
  'PREMIUM_LISTING',
  'FESTIVAL_OFFER',
];

const PROMOTION_STATUSES = ['ACTIVE', 'INACTIVE'];

module.exports = (sequelize, DataTypes) => {
  class Promotion extends Model {
    static associate(models) {
      Promotion.belongsTo(models.Property, { foreignKey: 'primaryPropertyId', as: 'primaryProperty' });
      Promotion.belongsToMany(models.Property, {
        through: models.PromotionProperty,
        foreignKey: 'promotionId',
        otherKey: 'propertyId',
        as: 'properties',
      });
      Promotion.hasMany(models.PromotionDismissal, { foreignKey: 'promotionId', as: 'dismissals' });
    }
  }

  Promotion.PROMOTION_TYPES = PROMOTION_TYPES;
  Promotion.PROMOTION_STATUSES = PROMOTION_STATUSES;

  Promotion.init({
    primaryPropertyId: { type: DataTypes.INTEGER, allowNull: false },
    promotionType: { type: DataTypes.STRING, allowNull: false },
    title: { type: DataTypes.STRING, allowNull: false },
    description: DataTypes.TEXT,
    bannerImage: DataTypes.STRING,
    ctaButtonText: { type: DataTypes.STRING, allowNull: false, defaultValue: 'View Property' },
    ctaAction: { type: DataTypes.STRING, allowNull: false, defaultValue: 'PROPERTY_DETAILS' },
    priority: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    offerPrice: DataTypes.DECIMAL(14, 2),
    startDate: DataTypes.DATE,
    endDate: DataTypes.DATE,
    status: {
      type: DataTypes.ENUM(...PROMOTION_STATUSES),
      allowNull: false,
      defaultValue: 'ACTIVE',
    },
    createdBy: DataTypes.INTEGER,
    modifiedBy: DataTypes.INTEGER,
  }, {
    sequelize,
    modelName: 'Promotion',
    tableName: 'Promotions',
  });

  return Promotion;
};
