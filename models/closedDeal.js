'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ClosedDeal extends Model {
    static associate(models) {
      ClosedDeal.belongsTo(models.PurchaseRequest, { foreignKey: 'purchaseRequestId', as: 'purchase' });
      ClosedDeal.belongsTo(models.BookingRequest, { foreignKey: 'bookingRequestId', as: 'booking' });
      ClosedDeal.belongsTo(models.User, { foreignKey: 'customerId', as: 'customer' });
      ClosedDeal.belongsTo(models.User, { foreignKey: 'agentId', as: 'agent' });
      ClosedDeal.belongsTo(models.Property, { foreignKey: 'propertyId', as: 'property' });
    }
  }

  ClosedDeal.init({
    dealCode: { type: DataTypes.STRING(60), allowNull: false, unique: true },
    purchaseRequestId: { type: DataTypes.INTEGER, allowNull: false },
    bookingRequestId: DataTypes.INTEGER,
    customerId: { type: DataTypes.INTEGER, allowNull: false },
    agentId: DataTypes.INTEGER,
    propertyId: { type: DataTypes.INTEGER, allowNull: false },
    saleAmount: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
    bookingDate: DataTypes.DATE,
    purchaseDate: { type: DataTypes.DATE, allowNull: false },
    commissionPercent: DataTypes.DECIMAL(8, 2),
    commissionAmount: DataTypes.DECIMAL(14, 2),
    commissionStatus: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'PENDING' },
    commissionCreditedAt: DataTypes.DATE,
    commissionCreditedBy: DataTypes.INTEGER,
    dealStatus: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'CLOSED' },
    createdBy: DataTypes.INTEGER,
    modifiedBy: DataTypes.INTEGER,
  }, {
    sequelize,
    modelName: 'ClosedDeal',
    tableName: 'ClosedDeals',
  });

  return ClosedDeal;
};
