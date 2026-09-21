'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class HeroSlide extends Model {
    static associate(_models) {
      // no associations yet
    }
  }

  HeroSlide.init({
    imagePath: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    headingEn: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: '',
    },
    headingTe: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: '',
    },
    subtitleEn: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    subtitleTe: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive'),
      allowNull: false,
      defaultValue: 'active',
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    startsAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    endsAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  }, {
    sequelize,
    modelName: 'HeroSlide',
    tableName: 'HeroSlides',
  });

  return HeroSlide;
};
