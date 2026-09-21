'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class SaleCertificate extends Model {
    static associate(models) {
      SaleCertificate.belongsTo(models.User, { foreignKey: 'customerId', as: 'customer' });
      SaleCertificate.belongsTo(models.User, { foreignKey: 'agentId', as: 'agent' });
      SaleCertificate.belongsTo(models.Property, { foreignKey: 'propertyId', as: 'property' });
      SaleCertificate.belongsTo(models.PurchaseRequest, { foreignKey: 'purchaseRequestId', as: 'purchase' });
    }
  }

  SaleCertificate.init({
    saleConfirmationNumber: { type: DataTypes.STRING(60), allowNull: false, unique: true },
    customerId: { type: DataTypes.INTEGER, allowNull: false },
    propertyId: { type: DataTypes.INTEGER, allowNull: false },
    purchaseRequestId: { type: DataTypes.INTEGER, allowNull: false, unique: true },
    agentId: DataTypes.INTEGER,
    saleDate: { type: DataTypes.DATE, allowNull: false },
    generatedDate: { type: DataTypes.DATE, allowNull: false },
    status: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'ACTIVE' },
    snapshotJson: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
    verificationCode: DataTypes.STRING(80),
    createdBy: DataTypes.INTEGER,
    modifiedBy: DataTypes.INTEGER,
  }, {
    sequelize,
    modelName: 'SaleCertificate',
    tableName: 'SaleCertificates',
  });

  return SaleCertificate;
};
