'use strict';

const { Model } = require('sequelize');

const INTEREST_STATUSES = [
  'PENDING_APPROVAL',
  'APPROVED',
  'REJECTED',
  'ASSIGNED',
  'PURCHASE_REQUESTED',
  'BOOKING_REQUESTED',
  'CLOSED',
];

module.exports = (sequelize, DataTypes) => {
  class ExpressInterest extends Model {
    static associate(models) {
      ExpressInterest.belongsTo(models.User, { foreignKey: 'customerId', as: 'customer' });
      ExpressInterest.belongsTo(models.User, { foreignKey: 'referralAgentId', as: 'referralAgent' });
      ExpressInterest.belongsTo(models.User, { foreignKey: 'assignedAgentId', as: 'assignedAgent' });
      ExpressInterest.belongsTo(models.User, { foreignKey: 'assignedEmployeeId', as: 'assignedEmployee' });
      ExpressInterest.belongsTo(models.User, { foreignKey: 'approvedById', as: 'approvedBy' });
      ExpressInterest.belongsTo(models.Property, { foreignKey: 'propertyId', as: 'property' });
      ExpressInterest.belongsTo(models.MapPlot, { foreignKey: 'mapPlotId', as: 'mapPlot' });
      ExpressInterest.hasMany(models.ExpressInterestHistory, { foreignKey: 'interestId', as: 'history' });
      ExpressInterest.hasMany(models.FollowUpRemark, { foreignKey: 'interestId', as: 'followUps' });
      ExpressInterest.hasMany(models.CallNote, { foreignKey: 'interestId', as: 'callNotes' });
      ExpressInterest.hasMany(models.InternalNote, { foreignKey: 'interestId', as: 'internalNotes' });
      ExpressInterest.hasOne(models.PurchaseRequest, { foreignKey: 'expressInterestId', as: 'purchaseRequest' });
      ExpressInterest.hasOne(models.BookingRequest, { foreignKey: 'expressInterestId', as: 'bookingRequest' });
    }
  }

  ExpressInterest.INTEREST_STATUSES = INTEREST_STATUSES;

  ExpressInterest.init({
    customerId: { type: DataTypes.INTEGER, allowNull: false },
    propertyId: { type: DataTypes.INTEGER, allowNull: false },
    mapPlotId: DataTypes.INTEGER,
    mapPlotExternalId: DataTypes.STRING(100),
    mapPlotNo: DataTypes.STRING(50),
    mapPhase: DataTypes.SMALLINT,
    referralAgentId: DataTypes.INTEGER,
    assignedAgentId: DataTypes.INTEGER,
    assignedEmployeeId: DataTypes.INTEGER,
    status: {
      type: DataTypes.ENUM(...INTEREST_STATUSES),
      allowNull: false,
      defaultValue: 'PENDING_APPROVAL',
    },
    remarks: DataTypes.TEXT,
    adminRemarks: DataTypes.TEXT,
    internalRemarks: DataTypes.TEXT,
    followUpStatus: { type: DataTypes.STRING, defaultValue: 'NEW' },
    priority: { type: DataTypes.STRING, defaultValue: 'medium' },
    nextFollowUpAt: DataTypes.DATE,
    employeeWorkflowStatus: { type: DataTypes.STRING, defaultValue: 'new' },
    referralAgentCode: DataTypes.STRING,
    referralAgentNameSnapshot: DataTypes.STRING,
    rejectionReason: DataTypes.TEXT,
    customerDecision: DataTypes.STRING,
    decisionAt: DataTypes.DATE,
    approvedById: DataTypes.INTEGER,
    approvedAt: DataTypes.DATE,
    createdBy: DataTypes.INTEGER,
    modifiedBy: DataTypes.INTEGER,
  }, {
    sequelize,
    modelName: 'ExpressInterest',
    tableName: 'ExpressInterests',
  });

  return ExpressInterest;
};
