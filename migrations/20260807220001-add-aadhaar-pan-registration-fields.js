'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Users', 'aadhaarNumber', {
      type: Sequelize.STRING(12),
      allowNull: true,
    });
    await queryInterface.addColumn('Users', 'panNumber', {
      type: Sequelize.STRING(10),
      allowNull: true,
    });
    await queryInterface.addColumn('Users', 'aadhaarProofPath', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('Users', 'panProofPath', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('Users', 'panProofPath');
    await queryInterface.removeColumn('Users', 'aadhaarProofPath');
    await queryInterface.removeColumn('Users', 'panNumber');
    await queryInterface.removeColumn('Users', 'aadhaarNumber');
  },
};
