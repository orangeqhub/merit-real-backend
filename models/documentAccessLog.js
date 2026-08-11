'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class DocumentAccessLog extends Model {
    static associate() {}
  }

  DocumentAccessLog.init({
    documentType: { type: DataTypes.STRING(40), allowNull: false },
    documentId: { type: DataTypes.INTEGER, allowNull: false },
    action: { type: DataTypes.STRING(40), allowNull: false },
    userId: DataTypes.INTEGER,
    metaJson: { type: DataTypes.JSONB, allowNull: true, defaultValue: {} },
    createdBy: DataTypes.INTEGER,
    modifiedBy: DataTypes.INTEGER,
  }, {
    sequelize,
    modelName: 'DocumentAccessLog',
    tableName: 'DocumentAccessLogs',
  });

  return DocumentAccessLog;
};
