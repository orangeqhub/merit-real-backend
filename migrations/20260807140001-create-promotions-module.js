'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Promotions', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      primaryPropertyId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Properties', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      promotionType: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      bannerImage: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      ctaButtonText: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'View Property',
      },
      ctaAction: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'PROPERTY_DETAILS',
      },
      priority: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      offerPrice: {
        type: Sequelize.DECIMAL(14, 2),
        allowNull: true,
      },
      startDate: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      endDate: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM('ACTIVE', 'INACTIVE'),
        allowNull: false,
        defaultValue: 'ACTIVE',
      },
      createdBy: { type: Sequelize.INTEGER, allowNull: true },
      modifiedBy: { type: Sequelize.INTEGER, allowNull: true },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });

    await queryInterface.addIndex('Promotions', ['status']);
    await queryInterface.addIndex('Promotions', ['promotionType']);
    await queryInterface.addIndex('Promotions', ['priority']);
    await queryInterface.addIndex('Promotions', ['primaryPropertyId']);

    await queryInterface.createTable('PromotionProperties', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      promotionId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Promotions', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      propertyId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Properties', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });

    await queryInterface.addIndex('PromotionProperties', ['promotionId', 'propertyId'], { unique: true });

    await queryInterface.createTable('PromotionDismissals', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      promotionId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Promotions', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      customerId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });

    await queryInterface.addIndex('PromotionDismissals', ['promotionId', 'customerId'], { unique: true });
    await queryInterface.addIndex('PromotionDismissals', ['customerId']);

    await queryInterface.addColumn('Notifications', 'imageUrl', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('Notifications', 'imageUrl');
    await queryInterface.dropTable('PromotionDismissals');
    await queryInterface.dropTable('PromotionProperties');
    await queryInterface.dropTable('Promotions');
  },
};
