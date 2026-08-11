'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('ClosedDeals', 'commissionPercent', {
      type: Sequelize.DECIMAL(8, 2),
      allowNull: true,
    });
    await queryInterface.addColumn('ClosedDeals', 'commissionAmount', {
      type: Sequelize.DECIMAL(14, 2),
      allowNull: true,
    });
    await queryInterface.addColumn('ClosedDeals', 'commissionCreditedAt', {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn('ClosedDeals', 'commissionCreditedBy', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });

    await queryInterface.createTable('AgentWallets', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      agentId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      balance: { type: Sequelize.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
      pendingRedemption: { type: Sequelize.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
      totalEarned: { type: Sequelize.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
      totalRedeemed: { type: Sequelize.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
      lastCreditAt: { type: Sequelize.DATE, allowNull: true },
      lastRedemptionAt: { type: Sequelize.DATE, allowNull: true },
      createdBy: { type: Sequelize.INTEGER, allowNull: true },
      modifiedBy: { type: Sequelize.INTEGER, allowNull: true },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });
    await queryInterface.addIndex('AgentWallets', ['agentId'], { unique: true });

    await queryInterface.createTable('AgentBankDetails', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      agentId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      accountHolderName: { type: Sequelize.STRING(150), allowNull: false },
      bankName: { type: Sequelize.STRING(150), allowNull: false },
      branchName: { type: Sequelize.STRING(150), allowNull: true },
      accountNumber: { type: Sequelize.STRING(40), allowNull: false },
      ifscCode: { type: Sequelize.STRING(20), allowNull: false },
      accountType: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'SAVINGS' },
      upiId: { type: Sequelize.STRING(120), allowNull: true },
      panNumber: { type: Sequelize.STRING(20), allowNull: true },
      cancelledChequePath: { type: Sequelize.STRING, allowNull: true },
      passbookCopyPath: { type: Sequelize.STRING, allowNull: true },
      createdBy: { type: Sequelize.INTEGER, allowNull: true },
      modifiedBy: { type: Sequelize.INTEGER, allowNull: true },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });

    await queryInterface.createTable('AgentBankDetailHistories', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      agentId: { type: Sequelize.INTEGER, allowNull: false },
      bankDetailId: { type: Sequelize.INTEGER, allowNull: false },
      snapshotJson: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
      note: { type: Sequelize.TEXT, allowNull: true },
      createdBy: { type: Sequelize.INTEGER, allowNull: true },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });
    await queryInterface.addIndex('AgentBankDetailHistories', ['agentId']);

    await queryInterface.createTable('WalletTransactions', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      transactionCode: { type: Sequelize.STRING(60), allowNull: false, unique: true },
      walletId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'AgentWallets', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      agentId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      type: { type: Sequelize.STRING(40), allowNull: false },
      amount: { type: Sequelize.DECIMAL(14, 2), allowNull: false },
      status: { type: Sequelize.STRING(40), allowNull: false, defaultValue: 'COMPLETED' },
      closedDealId: { type: Sequelize.INTEGER, allowNull: true },
      redemptionRequestId: { type: Sequelize.INTEGER, allowNull: true },
      remarks: { type: Sequelize.TEXT, allowNull: true },
      metaJson: { type: Sequelize.JSONB, allowNull: true, defaultValue: {} },
      createdBy: { type: Sequelize.INTEGER, allowNull: true },
      modifiedBy: { type: Sequelize.INTEGER, allowNull: true },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });
    await queryInterface.addIndex('WalletTransactions', ['walletId']);
    await queryInterface.addIndex('WalletTransactions', ['agentId']);
    await queryInterface.addIndex('WalletTransactions', ['type']);
    await queryInterface.addIndex('WalletTransactions', ['closedDealId']);

    await queryInterface.createTable('WalletRedemptionRequests', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      requestCode: { type: Sequelize.STRING(60), allowNull: false, unique: true },
      agentId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      walletId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'AgentWallets', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      amount: { type: Sequelize.DECIMAL(14, 2), allowNull: false },
      status: { type: Sequelize.STRING(40), allowNull: false, defaultValue: 'PENDING' },
      remarks: { type: Sequelize.TEXT, allowNull: true },
      adminRemarks: { type: Sequelize.TEXT, allowNull: true },
      bankSnapshotJson: { type: Sequelize.JSONB, allowNull: true, defaultValue: {} },
      reviewedBy: { type: Sequelize.INTEGER, allowNull: true },
      reviewedAt: { type: Sequelize.DATE, allowNull: true },
      settlementDate: { type: Sequelize.DATE, allowNull: true },
      settledBy: { type: Sequelize.INTEGER, allowNull: true },
      createdBy: { type: Sequelize.INTEGER, allowNull: true },
      modifiedBy: { type: Sequelize.INTEGER, allowNull: true },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });
    await queryInterface.addIndex('WalletRedemptionRequests', ['agentId']);
    await queryInterface.addIndex('WalletRedemptionRequests', ['status']);

    await queryInterface.createTable('WalletSettlements', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      redemptionRequestId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: { model: 'WalletRedemptionRequests', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      agentId: { type: Sequelize.INTEGER, allowNull: false },
      amount: { type: Sequelize.DECIMAL(14, 2), allowNull: false },
      settledBy: { type: Sequelize.INTEGER, allowNull: true },
      settledAt: { type: Sequelize.DATE, allowNull: false },
      remarks: { type: Sequelize.TEXT, allowNull: true },
      createdBy: { type: Sequelize.INTEGER, allowNull: true },
      modifiedBy: { type: Sequelize.INTEGER, allowNull: true },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('WalletSettlements');
    await queryInterface.dropTable('WalletRedemptionRequests');
    await queryInterface.dropTable('WalletTransactions');
    await queryInterface.dropTable('AgentBankDetailHistories');
    await queryInterface.dropTable('AgentBankDetails');
    await queryInterface.dropTable('AgentWallets');
    await queryInterface.removeColumn('ClosedDeals', 'commissionCreditedBy');
    await queryInterface.removeColumn('ClosedDeals', 'commissionCreditedAt');
    await queryInterface.removeColumn('ClosedDeals', 'commissionAmount');
    await queryInterface.removeColumn('ClosedDeals', 'commissionPercent');
  },
};
