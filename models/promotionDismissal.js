'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PromotionDismissal extends Model {
    static associate(models) {
      PromotionDismissal.belongsTo(models.Promotion, { foreignKey: 'promotionId', as: 'promotion' });
      PromotionDismissal.belongsTo(models.User, { foreignKey: 'customerId', as: 'customer' });
    }
  }

  PromotionDismissal.init({
    promotionId: { type: DataTypes.INTEGER, allowNull: false },
    customerId: { type: DataTypes.INTEGER, allowNull: false },
  }, {
    sequelize,
    modelName: 'PromotionDismissal',
    tableName: 'PromotionDismissals',
  });

  return PromotionDismissal;
};
