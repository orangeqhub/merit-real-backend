'use strict';

const { AGENT_GRADE_LIST } = require('../constants/roles');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Users', 'agentGrade', {
      type: Sequelize.ENUM(...AGENT_GRADE_LIST),
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('Users', 'agentGrade');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Users_agentGrade";');
  },
};
