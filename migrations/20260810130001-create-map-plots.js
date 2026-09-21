'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('MapPlots', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      externalId: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true,
      },
      plotNo: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      propertyId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Properties', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      customerName: {
        type: Sequelize.STRING(150),
        allowNull: true,
      },
      customerId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      plotArea: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: true,
      },
      facing: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM('available', 'booked', 'registered', 'sold'),
        allowNull: false,
        defaultValue: 'available',
      },
      remarks: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      plotCost: {
        type: Sequelize.DECIMAL(14, 2),
        allowNull: true,
      },
      sizeEast: { type: Sequelize.DECIMAL(12, 2), allowNull: true },
      sizeWest: { type: Sequelize.DECIMAL(12, 2), allowNull: true },
      sizeNorth: { type: Sequelize.DECIMAL(12, 2), allowNull: true },
      sizeSouth: { type: Sequelize.DECIMAL(12, 2), allowNull: true },
      bookingRequestId: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      bookedAt: { type: Sequelize.DATE, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('MapPlots');
  },
};
