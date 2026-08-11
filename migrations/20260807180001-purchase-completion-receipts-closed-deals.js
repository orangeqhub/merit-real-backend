'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('PurchaseRequests', 'bookingRequestId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'BookingRequests', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
    await queryInterface.addColumn('PurchaseRequests', 'source', {
      type: Sequelize.STRING(40),
      allowNull: false,
      defaultValue: 'DIRECT',
    });
    await queryInterface.addColumn('PurchaseRequests', 'totalAmount', {
      type: Sequelize.DECIMAL(14, 2),
      allowNull: true,
    });
    await queryInterface.addColumn('PurchaseRequests', 'amountPaid', {
      type: Sequelize.DECIMAL(14, 2),
      allowNull: false,
      defaultValue: 0,
    });
    await queryInterface.addColumn('PurchaseRequests', 'taxAmount', {
      type: Sequelize.DECIMAL(14, 2),
      allowNull: false,
      defaultValue: 0,
    });
    await queryInterface.addColumn('PurchaseRequests', 'discountAmount', {
      type: Sequelize.DECIMAL(14, 2),
      allowNull: false,
      defaultValue: 0,
    });
    await queryInterface.addColumn('PurchaseRequests', 'finalSaleAmount', {
      type: Sequelize.DECIMAL(14, 2),
      allowNull: true,
    });
    await queryInterface.addColumn('PurchaseRequests', 'paymentStatus', {
      type: Sequelize.STRING(40),
      allowNull: false,
      defaultValue: 'PENDING',
    });
    await queryInterface.addColumn('PurchaseRequests', 'paymentMethod', {
      type: Sequelize.STRING(80),
      allowNull: true,
    });
    await queryInterface.addColumn('PurchaseRequests', 'saleDate', {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn('PurchaseRequests', 'paymentCompletedAt', {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn('PurchaseRequests', 'completedAt', {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn('PurchaseRequests', 'completedBy', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    await queryInterface.addColumn('PurchaseRequests', 'isLocked', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
    await queryInterface.addColumn('PurchaseRequests', 'dealStatus', {
      type: Sequelize.STRING(40),
      allowNull: false,
      defaultValue: 'OPEN',
    });

    await queryInterface.addIndex('PurchaseRequests', ['bookingRequestId']);
    await queryInterface.addIndex('PurchaseRequests', ['paymentStatus']);
    await queryInterface.addIndex('PurchaseRequests', ['dealStatus']);
    await queryInterface.addIndex('PurchaseRequests', ['saleDate']);

    await queryInterface.createTable('PurchasePayments', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      purchaseRequestId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'PurchaseRequests', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      amount: { type: Sequelize.DECIMAL(14, 2), allowNull: false },
      paymentDate: { type: Sequelize.DATE, allowNull: false },
      paymentMethod: { type: Sequelize.STRING(80), allowNull: true },
      remarks: { type: Sequelize.TEXT, allowNull: true },
      proofPath: { type: Sequelize.STRING, allowNull: true },
      recordedBy: { type: Sequelize.INTEGER, allowNull: true },
      createdBy: { type: Sequelize.INTEGER, allowNull: true },
      modifiedBy: { type: Sequelize.INTEGER, allowNull: true },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });
    await queryInterface.addIndex('PurchasePayments', ['purchaseRequestId']);

    await queryInterface.createTable('PurchaseReceipts', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      purchaseRequestId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'PurchaseRequests', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      receiptNumber: { type: Sequelize.STRING(60), allowNull: false, unique: true },
      receiptType: { type: Sequelize.STRING(40), allowNull: false, defaultValue: 'SALE' },
      receiptDate: { type: Sequelize.DATE, allowNull: false },
      snapshotJson: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
      generatedBy: { type: Sequelize.INTEGER, allowNull: true },
      createdBy: { type: Sequelize.INTEGER, allowNull: true },
      modifiedBy: { type: Sequelize.INTEGER, allowNull: true },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });
    await queryInterface.addIndex('PurchaseReceipts', ['purchaseRequestId']);
    await queryInterface.addIndex('PurchaseReceipts', ['receiptNumber'], { unique: true });

    await queryInterface.createTable('ClosedDeals', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      dealCode: { type: Sequelize.STRING(60), allowNull: false, unique: true },
      purchaseRequestId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'PurchaseRequests', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      bookingRequestId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'BookingRequests', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      customerId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      agentId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      propertyId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Properties', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      saleAmount: { type: Sequelize.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
      bookingDate: { type: Sequelize.DATE, allowNull: true },
      purchaseDate: { type: Sequelize.DATE, allowNull: false },
      commissionStatus: { type: Sequelize.STRING(40), allowNull: false, defaultValue: 'PENDING' },
      dealStatus: { type: Sequelize.STRING(40), allowNull: false, defaultValue: 'CLOSED' },
      createdBy: { type: Sequelize.INTEGER, allowNull: true },
      modifiedBy: { type: Sequelize.INTEGER, allowNull: true },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });
    await queryInterface.addIndex('ClosedDeals', ['purchaseRequestId'], { unique: true });
    await queryInterface.addIndex('ClosedDeals', ['agentId']);
    await queryInterface.addIndex('ClosedDeals', ['customerId']);
    await queryInterface.addIndex('ClosedDeals', ['propertyId']);

    await queryInterface.createTable('SalesHistories', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      purchaseRequestId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'PurchaseRequests', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      propertyId: { type: Sequelize.INTEGER, allowNull: false },
      customerId: { type: Sequelize.INTEGER, allowNull: false },
      agentId: { type: Sequelize.INTEGER, allowNull: true },
      eventType: { type: Sequelize.STRING(60), allowNull: false },
      fromStatus: { type: Sequelize.STRING(60), allowNull: true },
      toStatus: { type: Sequelize.STRING(60), allowNull: true },
      amount: { type: Sequelize.DECIMAL(14, 2), allowNull: true },
      note: { type: Sequelize.TEXT, allowNull: true },
      metaJson: { type: Sequelize.JSONB, allowNull: true, defaultValue: {} },
      createdBy: { type: Sequelize.INTEGER, allowNull: true },
      modifiedBy: { type: Sequelize.INTEGER, allowNull: true },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });
    await queryInterface.addIndex('SalesHistories', ['purchaseRequestId']);
    await queryInterface.addIndex('SalesHistories', ['propertyId']);
    await queryInterface.addIndex('SalesHistories', ['eventType']);

    // Backfill totals from linked property price for existing purchases
    await queryInterface.sequelize.query(`
      UPDATE "PurchaseRequests" pr
      SET "totalAmount" = COALESCE(pr."totalAmount", p.price),
          "finalSaleAmount" = COALESCE(pr."finalSaleAmount", p.price)
      FROM "Properties" p
      WHERE p.id = pr."propertyId"
        AND pr."totalAmount" IS NULL
    `);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('SalesHistories');
    await queryInterface.dropTable('ClosedDeals');
    await queryInterface.dropTable('PurchaseReceipts');
    await queryInterface.dropTable('PurchasePayments');

    const cols = [
      'bookingRequestId', 'source', 'totalAmount', 'amountPaid', 'taxAmount', 'discountAmount',
      'finalSaleAmount', 'paymentStatus', 'paymentMethod', 'saleDate', 'paymentCompletedAt',
      'completedAt', 'completedBy', 'isLocked', 'dealStatus',
    ];
    for (const col of cols) {
      // eslint-disable-next-line no-await-in-loop
      await queryInterface.removeColumn('PurchaseRequests', col);
    }
  },
};
