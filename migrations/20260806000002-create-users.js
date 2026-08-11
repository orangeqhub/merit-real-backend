'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Users', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      memberId: {
        type: Sequelize.STRING,
        allowNull: true,
        unique: true,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      mobile: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      password: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      role: {
        type: Sequelize.ENUM('ADMIN', 'CUSTOMER', 'AGENT'),
        allowNull: false,
        defaultValue: 'CUSTOMER',
      },
      agentCategoryId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'AgentCategories',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      status: {
        type: Sequelize.ENUM('PENDING', 'ACTIVE', 'INACTIVE', 'SUSPENDED', 'REJECTED'),
        allowNull: false,
        defaultValue: 'PENDING',
      },
      district: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      city: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      address: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      preferredPropertyType: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      profilePhoto: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      identityProof: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      passwordChangedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      lastLoginAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      failedLoginAttempts: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      accountLockedUntil: {
        type: Sequelize.DATE,
        allowNull: true,
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
  },

  async down(queryInterface) {
    await queryInterface.dropTable('Users');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Users_role";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Users_status";');
  },
};
