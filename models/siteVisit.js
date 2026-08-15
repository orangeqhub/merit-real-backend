'use strict';

const { Model } = require('sequelize');

const SITE_VISIT_STATUSES = [
  'PENDING_APPROVAL',
  'APPROVED',
  'ASSIGNED',
  'SCHEDULED',
  'RESCHEDULE_REQUESTED',
  'IN_PROGRESS',
  'VEHICLE_REQUIRED',
  'VEHICLE_APPROVED',
  'VEHICLE_ASSIGNED',
  'VEHICLE_CHANGE_REQUESTED',
  'CONFIRMED',
  'STARTED',
  'REJECTED',
  'COMPLETED',
  'PURCHASE_INTEREST',
  'DROPPED',
  'NO_SHOW',
  'CANCELLED',
  'CLOSED',
];

module.exports = (sequelize, DataTypes) => {
  class SiteVisit extends Model {
    static associate(models) {
      SiteVisit.belongsTo(models.User, { foreignKey: 'customerId', as: 'customer' });
      SiteVisit.belongsTo(models.User, { foreignKey: 'referralAgentId', as: 'referralAgent' });
      SiteVisit.belongsTo(models.User, { foreignKey: 'assignedAgentId', as: 'assignedAgent' });
      SiteVisit.belongsTo(models.User, { foreignKey: 'assignedEmployeeId', as: 'assignedEmployee' });
      SiteVisit.belongsTo(models.User, { foreignKey: 'approvedById', as: 'approvedBy' });
      SiteVisit.belongsTo(models.User, { foreignKey: 'completedById', as: 'completedBy' });
      SiteVisit.belongsTo(models.User, { foreignKey: 'cancelledById', as: 'cancelledBy' });
      SiteVisit.belongsTo(models.User, { foreignKey: 'noShowById', as: 'noShowBy' });
      SiteVisit.belongsTo(models.User, { foreignKey: 'startedById', as: 'startedBy' });
      SiteVisit.belongsTo(models.User, { foreignKey: 'vehicleAssignedById', as: 'vehicleAssignedBy' });
      SiteVisit.belongsTo(models.User, { foreignKey: 'driverId', as: 'driver' });
      SiteVisit.belongsTo(models.Property, { foreignKey: 'propertyId', as: 'property' });
      SiteVisit.belongsTo(models.ExpressInterest, { foreignKey: 'expressInterestId', as: 'expressInterest' });
      SiteVisit.belongsTo(models.PurchaseRequest, { foreignKey: 'purchaseRequestId', as: 'purchaseRequest' });
      SiteVisit.hasMany(models.SiteVisitHistory, { foreignKey: 'siteVisitId', as: 'history' });
      SiteVisit.hasMany(models.SiteVisitFollowUp, { foreignKey: 'siteVisitId', as: 'followUps' });
      SiteVisit.hasMany(models.SiteVisitVehicleAssignment, { foreignKey: 'siteVisitId', as: 'vehicleAssignments' });
      SiteVisit.hasMany(models.SiteVisitRescheduleHistory, { foreignKey: 'siteVisitId', as: 'rescheduleHistory' });
    }
  }

  SiteVisit.SITE_VISIT_STATUSES = SITE_VISIT_STATUSES;

  SiteVisit.init({
    customerId: { type: DataTypes.INTEGER, allowNull: false },
    propertyId: { type: DataTypes.INTEGER, allowNull: false },
    referralAgentId: DataTypes.INTEGER,
    assignedAgentId: DataTypes.INTEGER,
    assignedEmployeeId: DataTypes.INTEGER,
    expressInterestId: DataTypes.INTEGER,
    purchaseRequestId: DataTypes.INTEGER,
    visitDate: { type: DataTypes.DATEONLY, allowNull: false },
    visitTime: { type: DataTypes.STRING(16), allowNull: false },
    scheduledAt: DataTypes.DATE,
    visitMode: { type: DataTypes.STRING(32), allowNull: false, defaultValue: 'own_vehicle' },
    visitorCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    status: {
      type: DataTypes.ENUM(...SITE_VISIT_STATUSES),
      allowNull: false,
      defaultValue: 'PENDING_APPROVAL',
    },
    remarks: DataTypes.TEXT,
    adminRemarks: DataTypes.TEXT,
    internalRemarks: DataTypes.TEXT,
    employeeOutcome: DataTypes.STRING,
    employeeNotes: DataTypes.TEXT,
    employeeVisitStatus: DataTypes.STRING,
    meetingLocation: DataTypes.TEXT,
    attendeeCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    pickupLocation: DataTypes.TEXT,
    pickupCity: DataTypes.STRING(120),
    pickupDistrict: DataTypes.STRING(120),
    pickupState: DataTypes.STRING(120),
    pickupLatitude: DataTypes.DECIMAL(10, 7),
    pickupLongitude: DataTypes.DECIMAL(10, 7),
    preferredPickupTime: DataTypes.STRING(16),
    pickupDate: DataTypes.DATEONLY,
    pickupTime: DataTypes.STRING(16),
    propertyAddressSnapshot: DataTypes.TEXT,
    propertyCitySnapshot: DataTypes.STRING(120),
    propertyDistrictSnapshot: DataTypes.STRING(120),
    propertyStateSnapshot: DataTypes.STRING(120),
    propertyLatitudeSnapshot: DataTypes.DECIMAL(10, 7),
    propertyLongitudeSnapshot: DataTypes.DECIMAL(10, 7),
    rescheduleReason: DataTypes.TEXT,
    previousSchedule: { type: DataTypes.JSONB, allowNull: true, defaultValue: [] },
    cancellationReason: DataTypes.TEXT,
    cancelledAt: DataTypes.DATE,
    cancelledById: DataTypes.INTEGER,
    noShowAt: DataTypes.DATE,
    noShowById: DataTypes.INTEGER,
    startedAt: DataTypes.DATE,
    startedById: DataTypes.INTEGER,
    vehicleRequired: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    vehicleStatus: { type: DataTypes.STRING(32), allowNull: false, defaultValue: 'NOT_REQUIRED' },
    vehicleType: DataTypes.STRING(80),
    vehicleModel: DataTypes.STRING(120),
    vehicleColor: DataTypes.STRING(60),
    vehicleCapacity: DataTypes.INTEGER,
    vehicleReference: DataTypes.STRING(120),
    vehicleNumber: DataTypes.STRING(40),
    driverName: DataTypes.STRING(120),
    driverMobile: DataTypes.STRING(24),
    driverId: DataTypes.INTEGER,
    driverReference: DataTypes.STRING(120),
    driverLicenseNumber: DataTypes.STRING(80),
    pickupAddress: DataTypes.TEXT,
    pickupAt: DataTypes.DATE,
    vehicleAssignedAt: DataTypes.DATE,
    vehicleAssignedById: DataTypes.INTEGER,
    dropLocation: DataTypes.TEXT,
    driverRemarks: DataTypes.TEXT,
    vehicleRemarks: DataTypes.TEXT,
    customerAcceptedAt: DataTypes.DATE,
    confirmedAt: DataTypes.DATE,
    adminReviewedAt: DataTypes.DATE,
    rescheduledAt: DataTypes.DATE,
    agentRemarks: DataTypes.TEXT,
    customerVehicleChangeRequest: DataTypes.TEXT,
    rescheduleRequest: DataTypes.JSONB,
    reminderFlags: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
    nextFollowUpAt: DataTypes.DATE,
    referralAgentCode: DataTypes.STRING,
    referralAgentNameSnapshot: DataTypes.STRING,
    rejectionReason: DataTypes.TEXT,
    dropReason: DataTypes.STRING,
    dropRemarks: DataTypes.TEXT,
    customerDecision: DataTypes.STRING,
    customerDecisionAt: DataTypes.DATE,
    completedAt: DataTypes.DATE,
    completedById: DataTypes.INTEGER,
    approvedById: DataTypes.INTEGER,
    approvedAt: DataTypes.DATE,
    createdBy: DataTypes.INTEGER,
    modifiedBy: DataTypes.INTEGER,
  }, {
    sequelize,
    modelName: 'SiteVisit',
    tableName: 'SiteVisits',
  });

  return SiteVisit;
};
