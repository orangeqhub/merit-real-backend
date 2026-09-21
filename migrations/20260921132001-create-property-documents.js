'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('PropertyDocuments', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      propertyId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Properties', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      fileName: {
        type: Sequelize.STRING(300),
        allowNull: false,
      },
      storedFileName: {
        type: Sequelize.STRING(300),
        allowNull: false,
      },
      mimeType: {
        type: Sequelize.STRING(120),
        allowNull: false,
        defaultValue: 'application/pdf',
      },
      fileSize: {
        type: Sequelize.BIGINT,
        allowNull: false,
        defaultValue: 0,
      },
      uploadedByUserId: {
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

    await queryInterface.addIndex('PropertyDocuments', ['propertyId']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('PropertyDocuments');
  },
};
