'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Properties', 'latitude', {
      type: Sequelize.DECIMAL(10, 7),
      allowNull: true,
      after: 'mapLocation',
    });
    await queryInterface.addColumn('Properties', 'longitude', {
      type: Sequelize.DECIMAL(10, 7),
      allowNull: true,
      after: 'latitude',
    });

    await queryInterface.addIndex('Properties', ['latitude', 'longitude'], {
      name: 'properties_lat_lng_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('Properties', 'properties_lat_lng_idx');
    await queryInterface.removeColumn('Properties', 'longitude');
    await queryInterface.removeColumn('Properties', 'latitude');
  },
};
