'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class AgentCategory extends Model {
    static associate(models) {
      AgentCategory.hasMany(models.User, {
        foreignKey: 'agentCategoryId',
        as: 'agents',
      });
    }
  }

  AgentCategory.init({
    code: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  }, {
    sequelize,
    modelName: 'AgentCategory',
    tableName: 'AgentCategories',
  });

  return AgentCategory;
};
