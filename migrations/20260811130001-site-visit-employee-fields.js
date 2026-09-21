'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('SiteVisits', 'assignedEmployeeId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'Users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
    await queryInterface.addColumn('SiteVisits', 'employeeOutcome', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('SiteVisits', 'employeeNotes', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    await queryInterface.addColumn('SiteVisits', 'employeeVisitStatus', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addIndex('SiteVisits', ['assignedEmployeeId'], {
      name: 'site_visits_assigned_employee_id_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('SiteVisits', 'site_visits_assigned_employee_id_idx');
    await queryInterface.removeColumn('SiteVisits', 'employeeVisitStatus');
    await queryInterface.removeColumn('SiteVisits', 'employeeNotes');
    await queryInterface.removeColumn('SiteVisits', 'employeeOutcome');
    await queryInterface.removeColumn('SiteVisits', 'assignedEmployeeId');
  },
};
