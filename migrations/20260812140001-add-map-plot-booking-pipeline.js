'use strict';

/** Link ExpressInterest / BookingRequest to MapPlot for layout plot booking pipeline. */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('ExpressInterests', 'mapPlotId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'MapPlots', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
    await queryInterface.addColumn('ExpressInterests', 'mapPlotExternalId', {
      type: Sequelize.STRING(100),
      allowNull: true,
    });
    await queryInterface.addColumn('ExpressInterests', 'mapPlotNo', {
      type: Sequelize.STRING(50),
      allowNull: true,
    });
    await queryInterface.addColumn('ExpressInterests', 'mapPhase', {
      type: Sequelize.SMALLINT,
      allowNull: true,
    });

    await queryInterface.addColumn('BookingRequests', 'mapPlotId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'MapPlots', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });

    await queryInterface.addIndex('ExpressInterests', ['mapPlotId'], {
      name: 'express_interests_map_plot_id_idx',
    });
    await queryInterface.addIndex('BookingRequests', ['mapPlotId'], {
      name: 'booking_requests_map_plot_id_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('BookingRequests', 'booking_requests_map_plot_id_idx').catch(() => {});
    await queryInterface.removeIndex('ExpressInterests', 'express_interests_map_plot_id_idx').catch(() => {});
    await queryInterface.removeColumn('BookingRequests', 'mapPlotId');
    await queryInterface.removeColumn('ExpressInterests', 'mapPhase');
    await queryInterface.removeColumn('ExpressInterests', 'mapPlotNo');
    await queryInterface.removeColumn('ExpressInterests', 'mapPlotExternalId');
    await queryInterface.removeColumn('ExpressInterests', 'mapPlotId');
  },
};
