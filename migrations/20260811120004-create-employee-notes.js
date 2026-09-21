'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('CallNotes', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      interestId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'ExpressInterests', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      employeeId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      direction: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'outgoing',
      },
      result: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'connected',
      },
      summary: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      interestLevel: {
        type: Sequelize.STRING,
        allowNull: true,
        defaultValue: 'medium',
      },
      nextAction: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      nextFollowUpAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      callDateTime: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      createdBy: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      modifiedBy: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });

    await queryInterface.addIndex('CallNotes', ['interestId'], {
      name: 'call_notes_interest_id_idx',
    });
    await queryInterface.addIndex('CallNotes', ['employeeId'], {
      name: 'call_notes_employee_id_idx',
    });

    await queryInterface.createTable('InternalNotes', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      recordType: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'enquiry',
      },
      recordId: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      interestId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'ExpressInterests', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      employeeId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      text: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      createdBy: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      modifiedBy: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });

    await queryInterface.addIndex('InternalNotes', ['recordType', 'recordId'], {
      name: 'internal_notes_record_idx',
    });
    await queryInterface.addIndex('InternalNotes', ['interestId'], {
      name: 'internal_notes_interest_id_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('InternalNotes');
    await queryInterface.dropTable('CallNotes');
  },
};
