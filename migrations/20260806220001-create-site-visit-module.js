'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('SiteVisits', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      customerId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      propertyId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Properties', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      referralAgentId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      assignedAgentId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      visitDate: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      visitTime: {
        type: Sequelize.STRING(16),
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM(
          'PENDING_APPROVAL',
          'APPROVED',
          'ASSIGNED',
          'REJECTED',
          'COMPLETED',
          'PURCHASE_INTEREST',
          'DROPPED',
          'CLOSED'
        ),
        allowNull: false,
        defaultValue: 'PENDING_APPROVAL',
      },
      remarks: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      adminRemarks: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      internalRemarks: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      referralAgentCode: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      referralAgentNameSnapshot: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      rejectionReason: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      dropReason: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      dropRemarks: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      customerDecision: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      customerDecisionAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      completedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      completedById: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      approvedById: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      approvedAt: {
        type: Sequelize.DATE,
        allowNull: true,
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

    await queryInterface.addIndex('SiteVisits', ['customerId']);
    await queryInterface.addIndex('SiteVisits', ['propertyId']);
    await queryInterface.addIndex('SiteVisits', ['assignedAgentId']);
    await queryInterface.addIndex('SiteVisits', ['status']);
    await queryInterface.addIndex('SiteVisits', ['customerId', 'propertyId']);
    await queryInterface.addIndex('SiteVisits', ['visitDate']);

    await queryInterface.createTable('SiteVisitHistories', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      siteVisitId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'SiteVisits', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      fromStatus: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      toStatus: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      note: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      createdBy: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
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

    await queryInterface.addIndex('SiteVisitHistories', ['siteVisitId']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('SiteVisitHistories');
    await queryInterface.dropTable('SiteVisits');
  },
};
