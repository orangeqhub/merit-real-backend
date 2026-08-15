'use strict';



const { Model } = require('sequelize');



const PURCHASE_STATUSES = [

  'PURCHASE_REQUESTED',

  'UNDER_VERIFICATION',

  'APPROVED',

  'REJECTED',

  'COMPLETED',

];



module.exports = (sequelize, DataTypes) => {

  class PurchaseRequest extends Model {

    static associate(models) {

      PurchaseRequest.belongsTo(models.ExpressInterest, { foreignKey: 'expressInterestId', as: 'expressInterest' });

      PurchaseRequest.belongsTo(models.User, { foreignKey: 'customerId', as: 'customer' });

      PurchaseRequest.belongsTo(models.User, { foreignKey: 'assignedAgentId', as: 'assignedAgent' });

      PurchaseRequest.belongsTo(models.Property, { foreignKey: 'propertyId', as: 'property' });

      PurchaseRequest.belongsTo(models.BookingRequest, { foreignKey: 'bookingRequestId', as: 'bookingRequest' });

      PurchaseRequest.hasMany(models.PurchaseRequestHistory, { foreignKey: 'purchaseRequestId', as: 'history' });

      PurchaseRequest.hasMany(models.PurchasePayment, { foreignKey: 'purchaseRequestId', as: 'payments' });

      PurchaseRequest.hasMany(models.PurchaseReceipt, { foreignKey: 'purchaseRequestId', as: 'receipts' });

      PurchaseRequest.hasMany(models.PaymentReceipt, { foreignKey: 'purchaseRequestId', as: 'paymentReceipts' });

      PurchaseRequest.hasOne(models.SaleCertificate, { foreignKey: 'purchaseRequestId', as: 'saleCertificate' });

      PurchaseRequest.hasOne(models.ClosedDeal, { foreignKey: 'purchaseRequestId', as: 'closedDeal' });

      PurchaseRequest.hasMany(models.SalesHistory, { foreignKey: 'purchaseRequestId', as: 'salesHistory' });

      PurchaseRequest.hasMany(models.SiteVisit, { foreignKey: 'purchaseRequestId', as: 'siteVisits' });

    }

  }



  PurchaseRequest.PURCHASE_STATUSES = PURCHASE_STATUSES;



  PurchaseRequest.init({

    expressInterestId: { type: DataTypes.INTEGER, allowNull: false },

    customerId: { type: DataTypes.INTEGER, allowNull: false },

    propertyId: { type: DataTypes.INTEGER, allowNull: false },

    assignedAgentId: DataTypes.INTEGER,

    bookingRequestId: DataTypes.INTEGER,

    source: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'DIRECT' },

    status: {

      type: DataTypes.ENUM(...PURCHASE_STATUSES),

      allowNull: false,

      defaultValue: 'PURCHASE_REQUESTED',

    },

    totalAmount: DataTypes.DECIMAL(14, 2),

    amountPaid: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },

    taxAmount: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },

    discountAmount: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },

    finalSaleAmount: DataTypes.DECIMAL(14, 2),

    paymentStatus: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'PENDING' },

    paymentMethod: DataTypes.STRING(80),

    saleDate: DataTypes.DATE,

    paymentCompletedAt: DataTypes.DATE,

    completedAt: DataTypes.DATE,

    completedBy: DataTypes.INTEGER,

    isLocked: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },

    dealStatus: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'OPEN' },

    remarks: DataTypes.TEXT,

    adminRemarks: DataTypes.TEXT,

    internalRemarks: DataTypes.TEXT,

    rejectionReason: DataTypes.TEXT,

    createdBy: DataTypes.INTEGER,

    modifiedBy: DataTypes.INTEGER,

  }, {

    sequelize,

    modelName: 'PurchaseRequest',

    tableName: 'PurchaseRequests',

  });



  return PurchaseRequest;

};


