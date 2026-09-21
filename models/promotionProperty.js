'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PromotionProperty extends Model {
    static associate(models) {
      PromotionProperty.belongsTo(models.Promotion, { foreignKey: 'promotionId', as: 'promotion' });
      PromotionProperty.belongsTo(models.Property, { foreignKey: 'propertyId', as: 'property' });
    }
  }

  PromotionProperty.init({
    promotionId: { type: DataTypes.INTEGER, allowNull: false },
    propertyId: { type: DataTypes.INTEGER, allowNull: false },
  }, {
    sequelize,
    modelName: 'PromotionProperty',
    tableName: 'PromotionProperties',
  });

  return PromotionProperty;
};
