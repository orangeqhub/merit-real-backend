'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class BookingRequestHistory extends Model {
    static associate(models) {
      BookingRequestHistory.belongsTo(models.BookingRequest, { foreignKey: 'bookingRequestId', as: 'bookingRequest' });
      BookingRequestHistory.belongsTo(models.User, { foreignKey: 'createdBy', as: 'actor' });
    }
  }

  BookingRequestHistory.init({
    bookingRequestId: { type: DataTypes.INTEGER, allowNull: false },
    fromStatus: DataTypes.STRING,
    toStatus: { type: DataTypes.STRING, allowNull: false },
    note: DataTypes.TEXT,
    createdBy: DataTypes.INTEGER,
  }, {
    sequelize,
    modelName: 'BookingRequestHistory',
    tableName: 'BookingRequestHistories',
  });

  return BookingRequestHistory;
};
