'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Property status: BOOKED + SOLD (OPEN maps to ACTIVE in app logic)
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        ALTER TYPE "enum_Properties_status" ADD VALUE IF NOT EXISTS 'BOOKED';
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        ALTER TYPE "enum_Properties_status" ADD VALUE IF NOT EXISTS 'SOLD';
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);

    // Expand BookingRequests status enum with new values
    const bookingStatuses = [
      'BOOKING_APPROVED',
      'PARTIALLY_PAID',
      'FULLY_PAID',
      'BOOKING_EXPIRED',
      'CONVERTED_TO_PURCHASE',
      'CANCELLED',
    ];
    for (const value of bookingStatuses) {
      await queryInterface.sequelize.query(`
        DO $$ BEGIN
          ALTER TYPE "enum_BookingRequests_status" ADD VALUE IF NOT EXISTS '${value}';
        EXCEPTION WHEN duplicate_object THEN null; END $$;
      `);
    }

    await queryInterface.addColumn('BookingRequests', 'bookingDate', {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn('BookingRequests', 'expiryDate', {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn('BookingRequests', 'totalAmount', {
      type: Sequelize.DECIMAL(14, 2),
      allowNull: true,
    });
    await queryInterface.addColumn('BookingRequests', 'amountPaid', {
      type: Sequelize.DECIMAL(14, 2),
      allowNull: false,
      defaultValue: 0,
    });
    await queryInterface.addColumn('BookingRequests', 'paymentStatus', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'PENDING',
    });
    await queryInterface.addColumn('BookingRequests', 'followUpStatus', {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: 'PENDING_CUSTOMER_RESPONSE',
    });
    await queryInterface.addColumn('BookingRequests', 'nextFollowUpAt', {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn('BookingRequests', 'reminderFlags', {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: {},
    });

    await queryInterface.addIndex('BookingRequests', ['expiryDate']);
    await queryInterface.addIndex('BookingRequests', ['paymentStatus']);
    await queryInterface.addIndex('BookingRequests', ['propertyId', 'status']);

    await queryInterface.createTable('BookingPayments', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      bookingRequestId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'BookingRequests', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      amount: { type: Sequelize.DECIMAL(14, 2), allowNull: false },
      paymentDate: { type: Sequelize.DATE, allowNull: false },
      remarks: { type: Sequelize.TEXT, allowNull: true },
      proofPath: { type: Sequelize.STRING, allowNull: true },
      recordedBy: { type: Sequelize.INTEGER, allowNull: true },
      createdBy: { type: Sequelize.INTEGER, allowNull: true },
      modifiedBy: { type: Sequelize.INTEGER, allowNull: true },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });
    await queryInterface.addIndex('BookingPayments', ['bookingRequestId']);

    await queryInterface.createTable('BookingFollowUps', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      bookingRequestId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'BookingRequests', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      status: { type: Sequelize.STRING, allowNull: false, defaultValue: 'PENDING_CUSTOMER_RESPONSE' },
      remarks: { type: Sequelize.TEXT, allowNull: true },
      nextFollowUpAt: { type: Sequelize.DATE, allowNull: true },
      createdBy: { type: Sequelize.INTEGER, allowNull: true },
      modifiedBy: { type: Sequelize.INTEGER, allowNull: true },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });
    await queryInterface.addIndex('BookingFollowUps', ['bookingRequestId']);

    // Backfill existing bookings with 15-day window from createdAt
    await queryInterface.sequelize.query(`
      UPDATE "BookingRequests"
      SET
        "bookingDate" = COALESCE("bookingDate", "createdAt"),
        "expiryDate" = COALESCE("expiryDate", "createdAt" + INTERVAL '15 days'),
        "paymentStatus" = COALESCE("paymentStatus", 'PENDING'),
        "amountPaid" = COALESCE("amountPaid", 0)
      WHERE "bookingDate" IS NULL OR "expiryDate" IS NULL;
    `);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('BookingFollowUps');
    await queryInterface.dropTable('BookingPayments');
    await queryInterface.removeColumn('BookingRequests', 'reminderFlags');
    await queryInterface.removeColumn('BookingRequests', 'nextFollowUpAt');
    await queryInterface.removeColumn('BookingRequests', 'followUpStatus');
    await queryInterface.removeColumn('BookingRequests', 'paymentStatus');
    await queryInterface.removeColumn('BookingRequests', 'amountPaid');
    await queryInterface.removeColumn('BookingRequests', 'totalAmount');
    await queryInterface.removeColumn('BookingRequests', 'expiryDate');
    await queryInterface.removeColumn('BookingRequests', 'bookingDate');
  },
};
