'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ContactEnquiry extends Model {
    static associate(_models) {
      // standalone public contact form submissions
    }
  }

  ContactEnquiry.init({
    source: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: 'home',
    },
    fullName: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
    mobile: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },
    enquiryType: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    preferredLocation: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },
    propertyCategory: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },
    budgetRange: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    contactMethod: {
      type: DataTypes.STRING(32),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('NEW', 'READ', 'CLOSED'),
      allowNull: false,
      defaultValue: 'NEW',
    },
  }, {
    sequelize,
    modelName: 'ContactEnquiry',
    tableName: 'ContactEnquiries',
  });

  return ContactEnquiry;
};
