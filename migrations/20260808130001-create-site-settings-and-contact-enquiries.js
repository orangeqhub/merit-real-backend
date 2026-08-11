'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('SiteSettings', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      address: {
        type: Sequelize.TEXT,
        allowNull: false,
        defaultValue: '',
      },
      phone: {
        type: Sequelize.STRING(64),
        allowNull: false,
        defaultValue: '',
      },
      email: {
        type: Sequelize.STRING(120),
        allowNull: false,
        defaultValue: '',
      },
      updatedBy: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });

    const now = new Date();
    await queryInterface.bulkInsert('SiteSettings', [{
      address: '',
      phone: '',
      email: '',
      updatedBy: null,
      createdAt: now,
      updatedAt: now,
    }]);

    await queryInterface.createTable('ContactEnquiries', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      source: {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: 'home',
      },
      fullName: {
        type: Sequelize.STRING(120),
        allowNull: false,
      },
      mobile: {
        type: Sequelize.STRING(20),
        allowNull: false,
      },
      email: {
        type: Sequelize.STRING(120),
        allowNull: true,
      },
      enquiryType: {
        type: Sequelize.STRING(64),
        allowNull: true,
      },
      preferredLocation: {
        type: Sequelize.STRING(120),
        allowNull: true,
      },
      propertyCategory: {
        type: Sequelize.STRING(120),
        allowNull: true,
      },
      budgetRange: {
        type: Sequelize.STRING(64),
        allowNull: true,
      },
      message: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      contactMethod: {
        type: Sequelize.STRING(32),
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM('NEW', 'READ', 'CLOSED'),
        allowNull: false,
        defaultValue: 'NEW',
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });

    await queryInterface.addIndex('ContactEnquiries', ['status']);
    await queryInterface.addIndex('ContactEnquiries', ['createdAt']);
    await queryInterface.addIndex('ContactEnquiries', ['source']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('ContactEnquiries');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_ContactEnquiries_status";');
    await queryInterface.dropTable('SiteSettings');
  },
};
