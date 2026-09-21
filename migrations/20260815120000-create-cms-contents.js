'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('CmsContents', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      aboutEn: {
        type: Sequelize.TEXT,
        allowNull: false,
        defaultValue: '',
      },
      aboutTe: {
        type: Sequelize.TEXT,
        allowNull: false,
        defaultValue: '',
      },
      disclaimerEn: {
        type: Sequelize.TEXT,
        allowNull: false,
        defaultValue: '',
      },
      disclaimerTe: {
        type: Sequelize.TEXT,
        allowNull: false,
        defaultValue: '',
      },
      contactPhone: {
        type: Sequelize.STRING(64),
        allowNull: false,
        defaultValue: '',
      },
      contactWhatsapp: {
        type: Sequelize.STRING(64),
        allowNull: false,
        defaultValue: '',
      },
      contactEmail: {
        type: Sequelize.STRING(120),
        allowNull: false,
        defaultValue: '',
      },
      contactAddressEn: {
        type: Sequelize.TEXT,
        allowNull: false,
        defaultValue: '',
      },
      contactAddressTe: {
        type: Sequelize.TEXT,
        allowNull: false,
        defaultValue: '',
      },
      contactLandmarkEn: {
        type: Sequelize.STRING(255),
        allowNull: false,
        defaultValue: '',
      },
      contactLandmarkTe: {
        type: Sequelize.STRING(255),
        allowNull: false,
        defaultValue: '',
      },
      contactMapUrl: {
        type: Sequelize.STRING(500),
        allowNull: false,
        defaultValue: '',
      },
      businessHoursWeekdayEn: {
        type: Sequelize.TEXT,
        allowNull: false,
        defaultValue: '',
      },
      businessHoursWeekdayTe: {
        type: Sequelize.TEXT,
        allowNull: false,
        defaultValue: '',
      },
      businessHoursSundayEn: {
        type: Sequelize.TEXT,
        allowNull: false,
        defaultValue: '',
      },
      businessHoursSundayTe: {
        type: Sequelize.TEXT,
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
    await queryInterface.bulkInsert('CmsContents', [{
      aboutEn: '',
      aboutTe: '',
      disclaimerEn: '',
      disclaimerTe: '',
      contactPhone: '',
      contactWhatsapp: '',
      contactEmail: '',
      contactAddressEn: '',
      contactAddressTe: '',
      contactLandmarkEn: '',
      contactLandmarkTe: '',
      contactMapUrl: '',
      businessHoursWeekdayEn: '',
      businessHoursWeekdayTe: '',
      businessHoursSundayEn: '',
      businessHoursSundayTe: '',
      updatedBy: null,
      createdAt: now,
      updatedAt: now,
    }]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('CmsContents');
  },
};
