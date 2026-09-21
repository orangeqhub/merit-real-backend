'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('PurchasePayments', 'paymentReference', {
      type: Sequelize.STRING(80),
      allowNull: true,
    });
    await queryInterface.addColumn('BookingPayments', 'paymentReference', {
      type: Sequelize.STRING(80),
      allowNull: true,
    });
    await queryInterface.addColumn('BookingPayments', 'paymentMethod', {
      type: Sequelize.STRING(80),
      allowNull: true,
    });

    await queryInterface.createTable('PaymentReceipts', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      receiptNumber: { type: Sequelize.STRING(60), allowNull: false, unique: true },
      customerId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      propertyId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Properties', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      bookingRequestId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'BookingRequests', key: 'id' },
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
      purchasePaymentId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'PurchasePayments', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      bookingPaymentId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'BookingPayments', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      amount: { type: Sequelize.DECIMAL(14, 2), allowNull: false },
      totalPropertyAmount: { type: Sequelize.DECIMAL(14, 2), allowNull: true },
      totalAmountPaid: { type: Sequelize.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
      balanceAmount: { type: Sequelize.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
      paymentMethod: { type: Sequelize.STRING(80), allowNull: true },
      paymentReference: { type: Sequelize.STRING(80), allowNull: true },
      paymentDate: { type: Sequelize.DATE, allowNull: false },
      receiptDate: { type: Sequelize.DATE, allowNull: false },
      status: { type: Sequelize.STRING(40), allowNull: false, defaultValue: 'PARTIAL' },
      remarks: { type: Sequelize.TEXT, allowNull: true },
      snapshotJson: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
      verificationCode: { type: Sequelize.STRING(80), allowNull: true },
      createdBy: { type: Sequelize.INTEGER, allowNull: true },
      modifiedBy: { type: Sequelize.INTEGER, allowNull: true },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });
    await queryInterface.addIndex('PaymentReceipts', ['receiptNumber'], { unique: true });
    await queryInterface.addIndex('PaymentReceipts', ['customerId']);
    await queryInterface.addIndex('PaymentReceipts', ['purchaseRequestId']);
    await queryInterface.addIndex('PaymentReceipts', ['bookingRequestId']);
    await queryInterface.addIndex('PaymentReceipts', ['purchasePaymentId']);
    await queryInterface.addIndex('PaymentReceipts', ['bookingPaymentId']);

    await queryInterface.createTable('SaleCertificates', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      saleConfirmationNumber: { type: Sequelize.STRING(60), allowNull: false, unique: true },
      customerId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      propertyId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Properties', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      purchaseRequestId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: { model: 'PurchaseRequests', key: 'id' },
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
      saleDate: { type: Sequelize.DATE, allowNull: false },
      generatedDate: { type: Sequelize.DATE, allowNull: false },
      status: { type: Sequelize.STRING(40), allowNull: false, defaultValue: 'ACTIVE' },
      snapshotJson: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
      verificationCode: { type: Sequelize.STRING(80), allowNull: true },
      createdBy: { type: Sequelize.INTEGER, allowNull: true },
      modifiedBy: { type: Sequelize.INTEGER, allowNull: true },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });
    await queryInterface.addIndex('SaleCertificates', ['saleConfirmationNumber'], { unique: true });
    await queryInterface.addIndex('SaleCertificates', ['customerId']);
    await queryInterface.addIndex('SaleCertificates', ['agentId']);
    await queryInterface.addIndex('SaleCertificates', ['propertyId']);

    await queryInterface.createTable('DocumentAccessLogs', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      documentType: { type: Sequelize.STRING(40), allowNull: false },
      documentId: { type: Sequelize.INTEGER, allowNull: false },
      action: { type: Sequelize.STRING(40), allowNull: false },
      userId: { type: Sequelize.INTEGER, allowNull: true },
      metaJson: { type: Sequelize.JSONB, allowNull: true, defaultValue: {} },
      createdBy: { type: Sequelize.INTEGER, allowNull: true },
      modifiedBy: { type: Sequelize.INTEGER, allowNull: true },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });
    await queryInterface.addIndex('DocumentAccessLogs', ['documentType', 'documentId']);
    await queryInterface.addIndex('DocumentAccessLogs', ['userId']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('DocumentAccessLogs');
    await queryInterface.dropTable('SaleCertificates');
    await queryInterface.dropTable('PaymentReceipts');
    await queryInterface.removeColumn('BookingPayments', 'paymentMethod');
    await queryInterface.removeColumn('BookingPayments', 'paymentReference');
    await queryInterface.removeColumn('PurchasePayments', 'paymentReference');
  },
};
