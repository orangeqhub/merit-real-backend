'use strict';

const { Model } = require('sequelize');
const bcrypt = require('bcryptjs');
const {
  ROLE_LIST,
  USER_STATUS_LIST,
  ROLES,
  AGENT_GRADE_LIST,
} = require('../constants/roles');

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      User.belongsTo(models.AgentCategory, {
        foreignKey: 'agentCategoryId',
        as: 'agentCategory',
      });
      User.belongsTo(models.User, {
        foreignKey: 'referralAgentId',
        as: 'referralAgent',
      });
    }

    async checkPassword(password) {
      return bcrypt.compare(password, this.password);
    }

    toSafeJSON() {
      const values = { ...this.get() };
      delete values.password;
      return values;
    }
  }

  User.init({
    memberId: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    mobile: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM(...ROLE_LIST),
      allowNull: false,
      defaultValue: ROLES.CUSTOMER,
    },
    agentCategoryId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    agentGrade: {
      type: DataTypes.ENUM(...AGENT_GRADE_LIST),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM(...USER_STATUS_LIST),
      allowNull: false,
      defaultValue: 'PENDING',
    },
    district: DataTypes.STRING,
    city: DataTypes.STRING,
    address: DataTypes.TEXT,
    preferredPropertyType: DataTypes.STRING,
    occupation: DataTypes.STRING,
    profilePhoto: DataTypes.STRING,
    identityProof: DataTypes.STRING,
    addressProof: DataTypes.STRING,
    aadhaarNumber: DataTypes.STRING(12),
    panNumber: DataTypes.STRING(10),
    aadhaarProofPath: DataTypes.STRING,
    panProofPath: DataTypes.STRING,
    referralAgentId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    score: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    permissions: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    rejectionReason: DataTypes.TEXT,
    approvedById: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    approvedAt: DataTypes.DATE,
    passwordChangedAt: DataTypes.DATE,
    lastLoginAt: DataTypes.DATE,
    failedLoginAttempts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    accountLockedUntil: DataTypes.DATE,
  }, {
    sequelize,
    modelName: 'User',
    tableName: 'Users',
    hooks: {
      beforeSave: async (user) => {
        if (user.changed('password')) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
          user.passwordChangedAt = new Date();
        }
      },
    },
  });

  return User;
};
