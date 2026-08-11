'use strict';

const adminUserService = require('../services/adminUserService');
const { ROLES, ROLE_LABELS } = require('../constants/roles');

function makeController(role) {
  const label = ROLE_LABELS[role] || role;

  return {
    async list(req, res, next) {
      try {
        const data = await adminUserService.list(role, req.query, req);
        return res.json({
          success: true,
          message: `${label}s fetched.`,
          data,
          errors: [],
        });
      } catch (error) {
        return next(error);
      }
    },

    async getById(req, res, next) {
      try {
        const data = await adminUserService.getById(role, req.params.id, req);
        return res.json({
          success: true,
          message: `${label} details fetched.`,
          data,
          errors: [],
        });
      } catch (error) {
        return next(error);
      }
    },

    async create(req, res, next) {
      try {
        const data = await adminUserService.create(role, req.body, req);
        return res.status(201).json({
          success: true,
          message: `${label} created.`,
          data,
          errors: [],
        });
      } catch (error) {
        return next(error);
      }
    },

    async update(req, res, next) {
      try {
        const data = await adminUserService.update(role, req.params.id, req.body, req);
        return res.json({
          success: true,
          message: `${label} updated.`,
          data,
          errors: [],
        });
      } catch (error) {
        return next(error);
      }
    },

    async remove(req, res, next) {
      try {
        const data = await adminUserService.remove(role, req.params.id);
        return res.json({
          success: true,
          message: `${label} deleted.`,
          data,
          errors: [],
        });
      } catch (error) {
        return next(error);
      }
    },
  };
}

module.exports = {
  customerController: makeController(ROLES.CUSTOMER),
  agentController: makeController(ROLES.AGENT),
  salesMemberController: makeController(ROLES.SALES_MEMBER),
  employeeController: makeController(ROLES.EMPLOYEE),
};
