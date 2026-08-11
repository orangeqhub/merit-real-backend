'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ExpressInterests', {
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
      status: {
        type: Sequelize.ENUM('PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'ASSIGNED', 'CLOSED'),
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
      followUpStatus: {
        type: Sequelize.STRING,
        allowNull: true,
        defaultValue: 'NEW',
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

    await queryInterface.addIndex('ExpressInterests', ['customerId']);
    await queryInterface.addIndex('ExpressInterests', ['propertyId']);
    await queryInterface.addIndex('ExpressInterests', ['assignedAgentId']);
    await queryInterface.addIndex('ExpressInterests', ['status']);
    await queryInterface.addIndex('ExpressInterests', ['customerId', 'propertyId']);

    await queryInterface.createTable('ExpressInterestHistories', {
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

    await queryInterface.addIndex('ExpressInterestHistories', ['interestId']);

    await queryInterface.createTable('FollowUpRemarks', {
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
      agentId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      remark: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      followUpStatus: {
        type: Sequelize.STRING,
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

    await queryInterface.addIndex('FollowUpRemarks', ['interestId']);

    await queryInterface.createTable('Notifications', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      userRole: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      titleEn: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      titleTe: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      messageEn: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      messageTe: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      notificationType: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      referenceType: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      referenceId: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      linkPath: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      isRead: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      createdBy: {
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

    await queryInterface.addIndex('Notifications', ['userId']);
    await queryInterface.addIndex('Notifications', ['userId', 'isRead']);
    await queryInterface.addIndex('Notifications', ['createdAt']);

    await queryInterface.createTable('ActivityLogs', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      entityType: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      entityId: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      action: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      details: {
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

    await queryInterface.addIndex('ActivityLogs', ['entityType', 'entityId']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('ActivityLogs');
    await queryInterface.dropTable('Notifications');
    await queryInterface.dropTable('FollowUpRemarks');
    await queryInterface.dropTable('ExpressInterestHistories');
    await queryInterface.dropTable('ExpressInterests');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_ExpressInterests_status";');
  },
};
