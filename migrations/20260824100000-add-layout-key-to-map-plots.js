'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('MapPlots', 'layoutKey', {
      type: Sequelize.STRING(60),
      allowNull: false,
      defaultValue: 'anne-enclave',
    });
    await queryInterface.addIndex('MapPlots', ['layoutKey'], { name: 'map_plots_layout_key_idx' });
    await queryInterface.addIndex('MapPlots', ['externalId', 'layoutKey'], {
      name: 'map_plots_external_id_layout_idx',
      unique: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('MapPlots', 'map_plots_external_id_layout_idx');
    await queryInterface.removeIndex('MapPlots', 'map_plots_layout_key_idx');
    await queryInterface.removeColumn('MapPlots', 'layoutKey');
  },
};