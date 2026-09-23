'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // ABE (Area Business Executive) grade is replaced by BA (Business Advisor).
    await queryInterface.sequelize.query(
      'ALTER TYPE "enum_Users_agentGrade" RENAME VALUE \'ABE\' TO \'BA\';'
    );

    await queryInterface.addColumn('Users', 'linkedAbpId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'Users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });

    await queryInterface.addColumn('Users', 'linkedAbcId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'Users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });

    await queryInterface.addIndex('Users', ['linkedAbpId']);
    await queryInterface.addIndex('Users', ['linkedAbcId']);
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('Users', ['linkedAbcId']);
    await queryInterface.removeIndex('Users', ['linkedAbpId']);
    await queryInterface.removeColumn('Users', 'linkedAbcId');
    await queryInterface.removeColumn('Users', 'linkedAbpId');
    await queryInterface.sequelize.query(
      'ALTER TYPE "enum_Users_agentGrade" RENAME VALUE \'BA\' TO \'ABE\';'
    );
  },
};
