'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Allow free-text area values such as "1200 Sq.Ft"
    await queryInterface.changeColumn('Properties', 'area', {
      type: Sequelize.STRING(120),
      allowNull: true,
    });

    await queryInterface.addColumn('Properties', 'facing', {
      type: Sequelize.STRING(60),
      allowNull: true,
    });
    await queryInterface.addColumn('Properties', 'northMeasurement', {
      type: Sequelize.STRING(60),
      allowNull: true,
    });
    await queryInterface.addColumn('Properties', 'eastMeasurement', {
      type: Sequelize.STRING(60),
      allowNull: true,
    });
    await queryInterface.addColumn('Properties', 'westMeasurement', {
      type: Sequelize.STRING(60),
      allowNull: true,
    });
    await queryInterface.addColumn('Properties', 'southMeasurement', {
      type: Sequelize.STRING(60),
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Properties', 'southMeasurement');
    await queryInterface.removeColumn('Properties', 'westMeasurement');
    await queryInterface.removeColumn('Properties', 'eastMeasurement');
    await queryInterface.removeColumn('Properties', 'northMeasurement');
    await queryInterface.removeColumn('Properties', 'facing');

    await queryInterface.changeColumn('Properties', 'area', {
      type: Sequelize.DECIMAL(14, 2),
      allowNull: true,
    });
  },
};
