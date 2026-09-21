'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('ExpressInterests', 'assignedEmployeeId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'Users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
    await queryInterface.addColumn('ExpressInterests', 'priority', {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: 'medium',
    });
    await queryInterface.addColumn('ExpressInterests', 'nextFollowUpAt', {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn('ExpressInterests', 'employeeWorkflowStatus', {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: 'new',
    });

    await queryInterface.addIndex('ExpressInterests', ['assignedEmployeeId'], {
      name: 'express_interests_assigned_employee_id_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('ExpressInterests', 'express_interests_assigned_employee_id_idx');
    await queryInterface.removeColumn('ExpressInterests', 'employeeWorkflowStatus');
    await queryInterface.removeColumn('ExpressInterests', 'nextFollowUpAt');
    await queryInterface.removeColumn('ExpressInterests', 'priority');
    await queryInterface.removeColumn('ExpressInterests', 'assignedEmployeeId');
  },
};
