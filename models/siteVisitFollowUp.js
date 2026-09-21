'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class SiteVisitFollowUp extends Model {
    static associate(models) {
      SiteVisitFollowUp.belongsTo(models.SiteVisit, {
        foreignKey: 'siteVisitId',
        as: 'siteVisit',
      });
      SiteVisitFollowUp.belongsTo(models.User, {
        foreignKey: 'createdBy',
        as: 'actor',
      });
    }
  }

  SiteVisitFollowUp.init({
    siteVisitId: { type: DataTypes.INTEGER, allowNull: false },
    status: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'PENDING' },
    remarks: { type: DataTypes.TEXT, allowNull: false },
    nextFollowUpAt: DataTypes.DATE,
    createdBy: DataTypes.INTEGER,
    modifiedBy: DataTypes.INTEGER,
  }, {
    sequelize,
    modelName: 'SiteVisitFollowUp',
    tableName: 'SiteVisitFollowUps',
  });

  return SiteVisitFollowUp;
};
