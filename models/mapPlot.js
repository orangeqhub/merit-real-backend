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
    // NOTE: `externalId` still carries a legacy DB-level global UNIQUE constraint
    // (MapPlots_externalId_key, from before layoutKey existed) in addition to the
    // composite (externalId, layoutKey) uniqueness below. App logic treats
    // externalId as unique per-layout only (see mapBookingService.js), so this
    // legacy global constraint is a latent landmine, not an intentional rule —
    // it just hasn't collided yet because most layouts prefix their externalId.
    externalId: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    layoutKey: {
      type: DataTypes.STRING(60),
      allowNull: false,
      defaultValue: 'anne-enclave',
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
    indexes: [
      {
        name: 'map_plots_external_id_layout_idx',
        unique: true,
        fields: ['externalId', 'layoutKey'],
      },
      {
        name: 'map_plots_layout_key_idx',
        fields: ['layoutKey'],
      },
      {
        name: 'map_plots_phase_plot_no_idx',
        fields: ['phase', 'plotNo'],
      },
    ],
  });

  return MapPlot;
};
