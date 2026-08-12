'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class MapPlot extends Model {
    static associate(models) {
      MapPlot.belongsTo(models.Property, { foreignKey: 'propertyId', as: 'property' });
      MapPlot.belongsTo(models.User, { foreignKey: 'customerId', as: 'customer' });
      MapPlot.belongsTo(models.BookingRequest, { foreignKey: 'bookingRequestId', as: 'bookingRequest' });
      MapPlot.hasMany(models.ExpressInterest, { foreignKey: 'mapPlotId', as: 'expressInterests' });
    }
  }

  MapPlot.init({
    externalId: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    plotNo: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    phase: {
      type: DataTypes.SMALLINT,
      allowNull: false,
      defaultValue: 1,
    },
    propertyId: DataTypes.INTEGER,
    customerName: DataTypes.STRING(150),
    customerId: DataTypes.INTEGER,
    plotArea: DataTypes.DECIMAL(12, 2),
    facing: DataTypes.STRING(50),
    status: {
      type: DataTypes.ENUM('available', 'booked', 'registered', 'sold'),
      allowNull: false,
      defaultValue: 'available',
    },
    remarks: DataTypes.TEXT,
    plotCost: DataTypes.DECIMAL(14, 2),
    ratePerSqYd: DataTypes.DECIMAL(14, 2),
    plotType: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: 'residential',
    },
    sizeEast: DataTypes.DECIMAL(12, 2),
    sizeWest: DataTypes.DECIMAL(12, 2),
    sizeNorth: DataTypes.DECIMAL(12, 2),
    sizeSouth: DataTypes.DECIMAL(12, 2),
    bookingRequestId: DataTypes.INTEGER,
    bookedAt: DataTypes.DATE,
  }, {
    sequelize,
    modelName: 'MapPlot',
    tableName: 'MapPlots',
  });

  return MapPlot;
};
