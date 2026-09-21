'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class SiteVisitVehicleAssignment extends Model {
    static associate(models) {
      SiteVisitVehicleAssignment.belongsTo(models.SiteVisit, { foreignKey: 'siteVisitId', as: 'siteVisit' });
      SiteVisitVehicleAssignment.belongsTo(models.User, { foreignKey: 'driverId', as: 'driver' });
      SiteVisitVehicleAssignment.belongsTo(models.User, { foreignKey: 'assignedById', as: 'assignedBy' });
    }
  }
  SiteVisitVehicleAssignment.init({
    siteVisitId: { type: DataTypes.INTEGER, allowNull: false },
    vehicleStatus: { type: DataTypes.STRING(40), allowNull: false },
    vehicleType: DataTypes.STRING(80),
    vehicleModel: DataTypes.STRING(120),
    vehicleNumber: DataTypes.STRING(40),
    vehicleColor: DataTypes.STRING(60),
    vehicleCapacity: DataTypes.INTEGER,
    vehicleReference: DataTypes.STRING(120),
    driverId: DataTypes.INTEGER,
    driverName: DataTypes.STRING(120),
    driverPhone: DataTypes.STRING(24),
    driverReference: DataTypes.STRING(120),
    driverLicenseNumber: DataTypes.STRING(80),
    pickupDate: DataTypes.DATEONLY,
    pickupTime: DataTypes.STRING(16),
    pickupAddress: DataTypes.TEXT,
    pickupLocation: DataTypes.TEXT,
    dropLocation: DataTypes.TEXT,
    remarks: DataTypes.TEXT,
    assignedById: DataTypes.INTEGER,
    metadata: { type: DataTypes.JSONB, defaultValue: {} },
  }, {
    sequelize,
    modelName: 'SiteVisitVehicleAssignment',
    tableName: 'SiteVisitVehicleAssignments',
  });
  return SiteVisitVehicleAssignment;
};
