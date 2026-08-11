'use strict';

const { Model } = require('sequelize');

const SITE_VISIT_STATUSES = [
  'PENDING_APPROVAL',
  'APPROVED',
  'ASSIGNED',
  'REJECTED',
  'COMPLETED',
  'PURCHASE_INTEREST',
  'DROPPED',
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
      SiteVisit.belongsTo(models.Property, { foreignKey: 'propertyId', as: 'property' });
      SiteVisit.hasMany(models.SiteVisitHistory, { foreignKey: 'siteVisitId', as: 'history' });
    }
  }

  SiteVisit.SITE_VISIT_STATUSES = SITE_VISIT_STATUSES;

  SiteVisit.init({
    customerId: { type: DataTypes.INTEGER, allowNull: false },
    propertyId: { type: DataTypes.INTEGER, allowNull: false },
    referralAgentId: DataTypes.INTEGER,
    assignedAgentId: DataTypes.INTEGER,
    assignedEmployeeId: DataTypes.INTEGER,
    visitDate: { type: DataTypes.DATEONLY, allowNull: false },
    visitTime: { type: DataTypes.STRING(16), allowNull: false },
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
