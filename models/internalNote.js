'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class InternalNote extends Model {
    static associate(models) {
      InternalNote.belongsTo(models.ExpressInterest, { foreignKey: 'interestId', as: 'interest' });
      InternalNote.belongsTo(models.User, { foreignKey: 'employeeId', as: 'employee' });
    }
  }

  InternalNote.init({
    recordType: { type: DataTypes.STRING, allowNull: false, defaultValue: 'enquiry' },
    recordId: { type: DataTypes.STRING, allowNull: false },
    interestId: { type: DataTypes.INTEGER, allowNull: true },
    employeeId: { type: DataTypes.INTEGER, allowNull: false },
    text: { type: DataTypes.TEXT, allowNull: false },
    createdBy: DataTypes.INTEGER,
    modifiedBy: DataTypes.INTEGER,
  }, {
    sequelize,
    modelName: 'InternalNote',
    tableName: 'InternalNotes',
  });

  return InternalNote;
};
