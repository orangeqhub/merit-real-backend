'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('MapPlots', 'ratePerSqYd', {
      type: Sequelize.DECIMAL(14, 2),
      allowNull: true,
    });
    await queryInterface.addColumn('MapPlots', 'plotType', {
      type: Sequelize.STRING(30),
      allowNull: false,
      defaultValue: 'residential',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('MapPlots', 'plotType');
    await queryInterface.removeColumn('MapPlots', 'ratePerSqYd');
  },
};
