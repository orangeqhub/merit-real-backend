'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        ALTER TYPE "enum_Users_role" ADD VALUE IF NOT EXISTS 'SALES_MEMBER';
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
  },

  async down() {
    // PostgreSQL cannot remove enum values safely; leave SALES_MEMBER in place.
  },
};
