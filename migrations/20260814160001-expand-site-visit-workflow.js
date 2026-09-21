'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const enumValues = [
      'SCHEDULED',
      'RESCHEDULE_REQUESTED',
      'IN_PROGRESS',
      'NO_SHOW',
      'CANCELLED',
    ];
    for (const value of enumValues) {
      await queryInterface.sequelize.query(
        `ALTER TYPE "enum_SiteVisits_status" ADD VALUE IF NOT EXISTS '${value}'`
      );
    }

    const columns = {
      expressInterestId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'ExpressInterests', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      purchaseRequestId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'PurchaseRequests', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      scheduledAt: { type: Sequelize.DATE, allowNull: true },
      rescheduleReason: { type: Sequelize.TEXT, allowNull: true },
      previousSchedule: { type: Sequelize.JSONB, allowNull: true, defaultValue: [] },
      cancellationReason: { type: Sequelize.TEXT, allowNull: true },
      cancelledAt: { type: Sequelize.DATE, allowNull: true },
      cancelledById: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      noShowAt: { type: Sequelize.DATE, allowNull: true },
      noShowById: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      startedAt: { type: Sequelize.DATE, allowNull: true },
      startedById: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      meetingLocation: { type: Sequelize.TEXT, allowNull: true },
      attendeeCount: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
      vehicleRequired: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      vehicleStatus: { type: Sequelize.STRING(32), allowNull: false, defaultValue: 'NOT_REQUIRED' },
      vehicleType: { type: Sequelize.STRING(80), allowNull: true },
      vehicleNumber: { type: Sequelize.STRING(40), allowNull: true },
      driverName: { type: Sequelize.STRING(120), allowNull: true },
      driverMobile: { type: Sequelize.STRING(24), allowNull: true },
      pickupAddress: { type: Sequelize.TEXT, allowNull: true },
      pickupAt: { type: Sequelize.DATE, allowNull: true },
      vehicleAssignedAt: { type: Sequelize.DATE, allowNull: true },
      vehicleAssignedById: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      reminderFlags: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
      nextFollowUpAt: { type: Sequelize.DATE, allowNull: true },
    };

    for (const [name, definition] of Object.entries(columns)) {
      await queryInterface.addColumn('SiteVisits', name, definition);
    }

    await queryInterface.addIndex('SiteVisits', ['expressInterestId'], {
      name: 'site_visits_express_interest_id_idx',
    });
    await queryInterface.addIndex('SiteVisits', ['purchaseRequestId'], {
      name: 'site_visits_purchase_request_id_idx',
    });
    await queryInterface.addIndex('SiteVisits', ['status', 'visitDate'], {
      name: 'site_visits_status_visit_date_idx',
    });

    await queryInterface.createTable('SiteVisitFollowUps', {
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
      status: {
        type: Sequelize.STRING(40),
        allowNull: false,
        defaultValue: 'PENDING',
      },
      remarks: { type: Sequelize.TEXT, allowNull: false },
      nextFollowUpAt: { type: Sequelize.DATE, allowNull: true },
      createdBy: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      modifiedBy: { type: Sequelize.INTEGER, allowNull: true },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });
    await queryInterface.addIndex('SiteVisitFollowUps', ['siteVisitId'], {
      name: 'site_visit_followups_visit_id_idx',
    });
    await queryInterface.addIndex('SiteVisitFollowUps', ['nextFollowUpAt'], {
      name: 'site_visit_followups_next_at_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('SiteVisitFollowUps');
    await queryInterface.removeIndex('SiteVisits', 'site_visits_status_visit_date_idx');
    await queryInterface.removeIndex('SiteVisits', 'site_visits_purchase_request_id_idx');
    await queryInterface.removeIndex('SiteVisits', 'site_visits_express_interest_id_idx');

    const columns = [
      'nextFollowUpAt',
      'reminderFlags',
      'vehicleAssignedById',
      'vehicleAssignedAt',
      'pickupAt',
      'pickupAddress',
      'driverMobile',
      'driverName',
      'vehicleNumber',
      'vehicleType',
      'vehicleStatus',
      'vehicleRequired',
      'attendeeCount',
      'meetingLocation',
      'startedById',
      'startedAt',
      'noShowById',
      'noShowAt',
      'cancelledById',
      'cancelledAt',
      'cancellationReason',
      'previousSchedule',
      'rescheduleReason',
      'scheduledAt',
      'purchaseRequestId',
      'expressInterestId',
    ];
    for (const name of columns) {
      await queryInterface.removeColumn('SiteVisits', name);
    }
    // PostgreSQL enum values are intentionally retained to keep rollback non-destructive.
  },
};
