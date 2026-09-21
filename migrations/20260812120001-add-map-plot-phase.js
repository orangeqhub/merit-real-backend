'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('MapPlots', 'phase', {
      type: Sequelize.SMALLINT,
      allowNull: false,
      defaultValue: 1,
    });
    await queryInterface.addIndex('MapPlots', ['phase'], { name: 'map_plots_phase_idx' });
    await queryInterface.addIndex('MapPlots', ['phase', 'plotNo'], { name: 'map_plots_phase_plot_no_idx' });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('MapPlots', 'map_plots_phase_plot_no_idx');
    await queryInterface.removeIndex('MapPlots', 'map_plots_phase_idx');
    await queryInterface.removeColumn('MapPlots', 'phase');
  },
};
