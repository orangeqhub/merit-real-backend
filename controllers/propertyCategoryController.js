'use strict';

const propertyCategoryService = require('../services/propertyCategoryService');

class PropertyCategoryController {
  async listPublic(req, res, next) {
    try {
      const data = await propertyCategoryService.list({
        visibleOnly: true,
        activeOnly: true,
        includeAttributes: false,
        includeCounts: true,
      }, req);
      return res.json({
        success: true,
        message: 'Property categories fetched.',
        data,
        errors: [],
      });
    } catch (error) {
      return next(error);
    }
  }

  async listAll(req, res, next) {
    try {
      const includeAttributes = req.query.includeAttributes === 'true';
      const data = await propertyCategoryService.list({
        includeAttributes,
        includeCounts: true,
        includeInactivePropertyCounts: true,
      }, req);
      return res.json({
        success: true,
        message: 'Property categories fetched.',
        data,
        errors: [],
      });
    } catch (error) {
      return next(error);
    }
  }

  async getBySlug(req, res, next) {
    try {
      const data = await propertyCategoryService.getBySlug(req.params.slug, req);
      return res.json({
        success: true,
        message: 'Property category fetched.',
        data,
        errors: [],
      });
    } catch (error) {
      return next(error);
    }
  }

  async create(req, res, next) {
    try {
      const data = await propertyCategoryService.create(req.body, req);
      return res.status(201).json({
        success: true,
        message: 'Property category created.',
        data,
        errors: [],
      });
    } catch (error) {
      return next(error);
    }
  }

  async update(req, res, next) {
    try {
      const data = await propertyCategoryService.update(req.params.slug, req.body, req);
      return res.json({
        success: true,
        message: 'Property category updated.',
        data,
        errors: [],
      });
    } catch (error) {
      return next(error);
    }
  }

  async remove(req, res, next) {
    try {
      await propertyCategoryService.remove(req.params.slug);
      return res.json({
        success: true,
        message: 'Property category deleted.',
        data: null,
        errors: [],
      });
    } catch (error) {
      return next(error);
    }
  }

  async reorder(req, res, next) {
    try {
      const data = await propertyCategoryService.reorder(req.params.slug, req.body.direction);
      return res.json({
        success: true,
        message: 'Categories reordered.',
        data,
        errors: [],
      });
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = new PropertyCategoryController();
