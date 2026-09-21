'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Extend Express Interest status enum
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        ALTER TYPE "enum_ExpressInterests_status" ADD VALUE IF NOT EXISTS 'PURCHASE_REQUESTED';
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        ALTER TYPE "enum_ExpressInterests_status" ADD VALUE IF NOT EXISTS 'BOOKING_REQUESTED';
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);

    await queryInterface.addColumn('ExpressInterests', 'customerDecision', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('ExpressInterests', 'decisionAt', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await queryInterface.createTable('PurchaseRequests', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      expressInterestId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'ExpressInterests', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
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
      assignedAgentId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      status: {
        type: Sequelize.ENUM(
          'PURCHASE_REQUESTED',
          'UNDER_VERIFICATION',
          'APPROVED',
          'REJECTED',
          'COMPLETED'
        ),
        allowNull: false,
        defaultValue: 'PURCHASE_REQUESTED',
      },
      remarks: { type: Sequelize.TEXT, allowNull: true },
      adminRemarks: { type: Sequelize.TEXT, allowNull: true },
      internalRemarks: { type: Sequelize.TEXT, allowNull: true },
      rejectionReason: { type: Sequelize.TEXT, allowNull: true },
      createdBy: { type: Sequelize.INTEGER, allowNull: true },
      modifiedBy: { type: Sequelize.INTEGER, allowNull: true },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });

    await queryInterface.addIndex('PurchaseRequests', ['expressInterestId'], { unique: true });
    await queryInterface.addIndex('PurchaseRequests', ['customerId']);
    await queryInterface.addIndex('PurchaseRequests', ['assignedAgentId']);
    await queryInterface.addIndex('PurchaseRequests', ['status']);

    await queryInterface.createTable('PurchaseRequestHistories', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      purchaseRequestId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'PurchaseRequests', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      fromStatus: { type: Sequelize.STRING, allowNull: true },
      toStatus: { type: Sequelize.STRING, allowNull: false },
      note: { type: Sequelize.TEXT, allowNull: true },
      createdBy: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });
    await queryInterface.addIndex('PurchaseRequestHistories', ['purchaseRequestId']);

    await queryInterface.createTable('BookingRequests', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      expressInterestId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'ExpressInterests', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
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
      assignedAgentId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      status: {
        type: Sequelize.ENUM(
          'BOOKING_REQUESTED',
          'BOOKING_VERIFICATION',
          'PAYMENT_PENDING',
          'BOOKING_CONFIRMED',
          'BOOKING_COMPLETED',
          'REJECTED'
        ),
        allowNull: false,
        defaultValue: 'BOOKING_REQUESTED',
      },
      remarks: { type: Sequelize.TEXT, allowNull: true },
      adminRemarks: { type: Sequelize.TEXT, allowNull: true },
      internalRemarks: { type: Sequelize.TEXT, allowNull: true },
      rejectionReason: { type: Sequelize.TEXT, allowNull: true },
      createdBy: { type: Sequelize.INTEGER, allowNull: true },
      modifiedBy: { type: Sequelize.INTEGER, allowNull: true },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });

    await queryInterface.addIndex('BookingRequests', ['expressInterestId'], { unique: true });
    await queryInterface.addIndex('BookingRequests', ['customerId']);
    await queryInterface.addIndex('BookingRequests', ['assignedAgentId']);
    await queryInterface.addIndex('BookingRequests', ['status']);

    await queryInterface.createTable('BookingRequestHistories', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      bookingRequestId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'BookingRequests', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      fromStatus: { type: Sequelize.STRING, allowNull: true },
      toStatus: { type: Sequelize.STRING, allowNull: false },
      note: { type: Sequelize.TEXT, allowNull: true },
      createdBy: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });
    await queryInterface.addIndex('BookingRequestHistories', ['bookingRequestId']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('BookingRequestHistories');
    await queryInterface.dropTable('BookingRequests');
    await queryInterface.dropTable('PurchaseRequestHistories');
    await queryInterface.dropTable('PurchaseRequests');
    await queryInterface.removeColumn('ExpressInterests', 'decisionAt');
    await queryInterface.removeColumn('ExpressInterests', 'customerDecision');
    // Enum values cannot be easily removed in PostgreSQL; leave them.
  },
};
