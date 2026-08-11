'use strict';

const agentCategoryService = require('../services/agentCategoryService');

class AgentCategoryController {
  async listActive(req, res, next) {
    try {
      const data = await agentCategoryService.listActive();
      return res.json({
        success: true,
        message: 'Active agent categories fetched.',
        data,
        errors: [],
      });
    } catch (error) {
      return next(error);
    }
  }

  async listAll(req, res, next) {
    try {
      const data = await agentCategoryService.listAll();
      return res.json({
        success: true,
        message: 'Agent categories fetched.',
        data,
        errors: [],
      });
    } catch (error) {
      return next(error);
    }
  }

  async create(req, res, next) {
    try {
      const data = await agentCategoryService.create(req.body);
      return res.status(201).json({
        success: true,
        message: 'Agent category created.',
        data,
        errors: [],
      });
    } catch (error) {
      return next(error);
    }
  }

  async update(req, res, next) {
    try {
      const data = await agentCategoryService.update(req.params.id, req.body);
      return res.json({
        success: true,
        message: 'Agent category updated.',
        data,
        errors: [],
      });
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = new AgentCategoryController();
