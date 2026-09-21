'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class CallNote extends Model {
    static associate(models) {
      CallNote.belongsTo(models.ExpressInterest, { foreignKey: 'interestId', as: 'interest' });
      CallNote.belongsTo(models.User, { foreignKey: 'employeeId', as: 'employee' });
    }
  }

  CallNote.init({
    interestId: { type: DataTypes.INTEGER, allowNull: false },
    employeeId: { type: DataTypes.INTEGER, allowNull: false },
    direction: { type: DataTypes.STRING, allowNull: false, defaultValue: 'outgoing' },
    result: { type: DataTypes.STRING, allowNull: false, defaultValue: 'connected' },
    summary: { type: DataTypes.TEXT, allowNull: false },
    interestLevel: { type: DataTypes.STRING, allowNull: true, defaultValue: 'medium' },
    nextAction: { type: DataTypes.STRING, allowNull: true },
    nextFollowUpAt: { type: DataTypes.DATE, allowNull: true },
    callDateTime: { type: DataTypes.DATE, allowNull: false },
    createdBy: DataTypes.INTEGER,
    modifiedBy: DataTypes.INTEGER,
  }, {
    sequelize,
    modelName: 'CallNote',
    tableName: 'CallNotes',
  });

  return CallNote;
};
