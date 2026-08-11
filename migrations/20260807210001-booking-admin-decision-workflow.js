'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    for (const value of ['AWAITING_ADMIN_DECISION', 'UNDER_REVIEW']) {
      await queryInterface.sequelize.query(`
        DO $$ BEGIN
          ALTER TYPE "enum_BookingRequests_status" ADD VALUE IF NOT EXISTS '${value}';
        EXCEPTION WHEN duplicate_object THEN null; END $$;
      `);
    }

    await queryInterface.addColumn('BookingRequests', 'originalExpiryDate', {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn('BookingRequests', 'extensionCount', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });
    await queryInterface.addColumn('BookingRequests', 'extensionHistory', {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: [],
    });
    await queryInterface.addColumn('BookingRequests', 'adminDecision', {
      type: Sequelize.STRING(40),
      allowNull: true,
    });
    await queryInterface.addColumn('BookingRequests', 'decisionDate', {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn('BookingRequests', 'decisionRemarks', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    await queryInterface.addColumn('BookingRequests', 'decisionBy', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    await queryInterface.addColumn('BookingRequests', 'reviewDate', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await queryInterface.addIndex('BookingRequests', ['adminDecision']);
    await queryInterface.addIndex('BookingRequests', ['reviewDate']);

    // Backfill originalExpiryDate from current expiryDate where missing
    await queryInterface.sequelize.query(`
      UPDATE "BookingRequests"
      SET "originalExpiryDate" = "expiryDate"
      WHERE "originalExpiryDate" IS NULL AND "expiryDate" IS NOT NULL;
    `);
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('BookingRequests', ['reviewDate']).catch(() => null);
    await queryInterface.removeIndex('BookingRequests', ['adminDecision']).catch(() => null);
    await queryInterface.removeColumn('BookingRequests', 'reviewDate');
    await queryInterface.removeColumn('BookingRequests', 'decisionBy');
    await queryInterface.removeColumn('BookingRequests', 'decisionRemarks');
    await queryInterface.removeColumn('BookingRequests', 'decisionDate');
    await queryInterface.removeColumn('BookingRequests', 'adminDecision');
    await queryInterface.removeColumn('BookingRequests', 'extensionHistory');
    await queryInterface.removeColumn('BookingRequests', 'extensionCount');
    await queryInterface.removeColumn('BookingRequests', 'originalExpiryDate');
  },
};
