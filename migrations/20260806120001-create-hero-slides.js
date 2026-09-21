'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('HeroSlides', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      imagePath: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      headingEn: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: '',
      },
      headingTe: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: '',
      },
      subtitleEn: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      subtitleTe: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM('active', 'inactive'),
        allowNull: false,
        defaultValue: 'active',
      },
      sortOrder: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      startsAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      endsAt: {
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
    await queryInterface.dropTable('HeroSlides');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_HeroSlides_status";');
  },
};
