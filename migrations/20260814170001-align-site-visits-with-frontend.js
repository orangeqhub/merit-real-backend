'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const statuses = [
      'VEHICLE_REQUIRED',
      'VEHICLE_APPROVED',
      'VEHICLE_ASSIGNED',
      'VEHICLE_CHANGE_REQUESTED',
      'CONFIRMED',
      'STARTED',
    ];
    for (const status of statuses) {
      await queryInterface.sequelize.query(
        `ALTER TYPE "enum_SiteVisits_status" ADD VALUE IF NOT EXISTS '${status}'`
      );
    }

    const columns = {
      visitMode: { type: Sequelize.STRING(32), allowNull: false, defaultValue: 'own_vehicle' },
      visitorCount: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
      pickupLocation: { type: Sequelize.TEXT, allowNull: true },
      pickupCity: { type: Sequelize.STRING(120), allowNull: true },
      pickupDistrict: { type: Sequelize.STRING(120), allowNull: true },
      pickupState: { type: Sequelize.STRING(120), allowNull: true },
      pickupLatitude: { type: Sequelize.DECIMAL(10, 7), allowNull: true },
      pickupLongitude: { type: Sequelize.DECIMAL(10, 7), allowNull: true },
      preferredPickupTime: { type: Sequelize.STRING(16), allowNull: true },
      pickupDate: { type: Sequelize.DATEONLY, allowNull: true },
      pickupTime: { type: Sequelize.STRING(16), allowNull: true },
      propertyAddressSnapshot: { type: Sequelize.TEXT, allowNull: true },
      propertyCitySnapshot: { type: Sequelize.STRING(120), allowNull: true },
      propertyDistrictSnapshot: { type: Sequelize.STRING(120), allowNull: true },
      propertyStateSnapshot: { type: Sequelize.STRING(120), allowNull: true },
      propertyLatitudeSnapshot: { type: Sequelize.DECIMAL(10, 7), allowNull: true },
      propertyLongitudeSnapshot: { type: Sequelize.DECIMAL(10, 7), allowNull: true },
      vehicleModel: { type: Sequelize.STRING(120), allowNull: true },
      vehicleColor: { type: Sequelize.STRING(60), allowNull: true },
      vehicleCapacity: { type: Sequelize.INTEGER, allowNull: true },
      vehicleReference: { type: Sequelize.STRING(120), allowNull: true },
      driverId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      driverReference: { type: Sequelize.STRING(120), allowNull: true },
      driverLicenseNumber: { type: Sequelize.STRING(80), allowNull: true },
      dropLocation: { type: Sequelize.TEXT, allowNull: true },
      driverRemarks: { type: Sequelize.TEXT, allowNull: true },
      vehicleRemarks: { type: Sequelize.TEXT, allowNull: true },
      customerAcceptedAt: { type: Sequelize.DATE, allowNull: true },
      confirmedAt: { type: Sequelize.DATE, allowNull: true },
      adminReviewedAt: { type: Sequelize.DATE, allowNull: true },
      rescheduledAt: { type: Sequelize.DATE, allowNull: true },
      agentRemarks: { type: Sequelize.TEXT, allowNull: true },
      customerVehicleChangeRequest: { type: Sequelize.TEXT, allowNull: true },
      rescheduleRequest: { type: Sequelize.JSONB, allowNull: true },
    };
    for (const [name, definition] of Object.entries(columns)) {
      await queryInterface.addColumn('SiteVisits', name, definition);
    }
    await queryInterface.addIndex('SiteVisits', ['visitMode', 'vehicleStatus'], {
      name: 'site_visits_mode_vehicle_status_idx',
    });
    await queryInterface.addIndex('SiteVisits', ['driverId'], {
      name: 'site_visits_driver_id_idx',
    });

    for (const [name, definition] of Object.entries({
      action: { type: Sequelize.STRING(80), allowNull: true },
      actorRole: { type: Sequelize.STRING(40), allowNull: true },
      remarks: { type: Sequelize.TEXT, allowNull: true },
      metadata: { type: Sequelize.JSONB, allowNull: true, defaultValue: {} },
    })) {
      await queryInterface.addColumn('SiteVisitHistories', name, definition);
    }

    await queryInterface.createTable('SiteVisitVehicleAssignments', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      siteVisitId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'SiteVisits', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      vehicleStatus: { type: Sequelize.STRING(40), allowNull: false },
      vehicleType: { type: Sequelize.STRING(80), allowNull: true },
      vehicleModel: { type: Sequelize.STRING(120), allowNull: true },
      vehicleNumber: { type: Sequelize.STRING(40), allowNull: true },
      vehicleColor: { type: Sequelize.STRING(60), allowNull: true },
      vehicleCapacity: { type: Sequelize.INTEGER, allowNull: true },
      vehicleReference: { type: Sequelize.STRING(120), allowNull: true },
      driverId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      driverName: { type: Sequelize.STRING(120), allowNull: true },
      driverPhone: { type: Sequelize.STRING(24), allowNull: true },
      driverReference: { type: Sequelize.STRING(120), allowNull: true },
      driverLicenseNumber: { type: Sequelize.STRING(80), allowNull: true },
      pickupDate: { type: Sequelize.DATEONLY, allowNull: true },
      pickupTime: { type: Sequelize.STRING(16), allowNull: true },
      pickupAddress: { type: Sequelize.TEXT, allowNull: true },
      pickupLocation: { type: Sequelize.TEXT, allowNull: true },
      dropLocation: { type: Sequelize.TEXT, allowNull: true },
      remarks: { type: Sequelize.TEXT, allowNull: true },
      assignedById: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      metadata: { type: Sequelize.JSONB, allowNull: true, defaultValue: {} },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });
    await queryInterface.addIndex('SiteVisitVehicleAssignments', ['siteVisitId'], {
      name: 'site_visit_vehicle_assignments_visit_idx',
    });

    await queryInterface.createTable('SiteVisitRescheduleHistories', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      siteVisitId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'SiteVisits', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      oldVisitDate: { type: Sequelize.DATEONLY, allowNull: true },
      oldVisitTime: { type: Sequelize.STRING(16), allowNull: true },
      oldScheduledAt: { type: Sequelize.DATE, allowNull: true },
      newVisitDate: { type: Sequelize.DATEONLY, allowNull: false },
      newVisitTime: { type: Sequelize.STRING(16), allowNull: false },
      newScheduledAt: { type: Sequelize.DATE, allowNull: false },
      reason: { type: Sequelize.TEXT, allowNull: false },
      status: { type: Sequelize.STRING(40), allowNull: false, defaultValue: 'APPLIED' },
      requestedById: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      appliedById: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      metadata: { type: Sequelize.JSONB, allowNull: true, defaultValue: {} },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });
    await queryInterface.addIndex('SiteVisitRescheduleHistories', ['siteVisitId'], {
      name: 'site_visit_reschedule_history_visit_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('SiteVisitRescheduleHistories');
    await queryInterface.dropTable('SiteVisitVehicleAssignments');
    for (const name of ['metadata', 'remarks', 'actorRole', 'action']) {
      await queryInterface.removeColumn('SiteVisitHistories', name);
    }
    await queryInterface.removeIndex('SiteVisits', 'site_visits_driver_id_idx');
    await queryInterface.removeIndex('SiteVisits', 'site_visits_mode_vehicle_status_idx');
    const columns = [
      'rescheduleRequest', 'customerVehicleChangeRequest', 'agentRemarks', 'rescheduledAt',
      'adminReviewedAt', 'confirmedAt', 'customerAcceptedAt', 'vehicleRemarks', 'driverRemarks',
      'dropLocation', 'driverLicenseNumber', 'driverReference', 'driverId', 'vehicleReference',
      'vehicleCapacity', 'vehicleColor', 'vehicleModel', 'propertyLongitudeSnapshot',
      'propertyLatitudeSnapshot', 'propertyStateSnapshot', 'propertyDistrictSnapshot',
      'propertyCitySnapshot', 'propertyAddressSnapshot', 'pickupTime', 'pickupDate',
      'preferredPickupTime', 'pickupLongitude', 'pickupLatitude', 'pickupState',
      'pickupDistrict', 'pickupCity', 'pickupLocation', 'visitorCount', 'visitMode',
    ];
    for (const name of columns) await queryInterface.removeColumn('SiteVisits', name);
  },
};
