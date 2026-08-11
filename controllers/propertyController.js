'use strict';

const propertyService = require('../services/propertyService');

class PropertyController {
  async list(req, res, next) {
    try {
      const data = await propertyService.list(req.query, req);
      return res.json({
        success: true,
        message: 'Properties fetched.',
        data,
        errors: [],
      });
    } catch (error) {
      return next(error);
    }
  }

  async listAdmin(req, res, next) {
    try {
      const data = await propertyService.list({ ...req.query, admin: true, includeAllStatuses: true }, req);
      return res.json({
        success: true,
        message: 'Properties fetched.',
        data,
        errors: [],
      });
    } catch (error) {
      return next(error);
    }
  }

  async getFeatured(req, res, next) {
    try {
      const limit = Number(req.query.limit) || 8;
      const data = await propertyService.getFeatured(limit, req.query.location, req);
      return res.json({
        success: true,
        message: 'Featured properties fetched.',
        data,
        errors: [],
      });
    } catch (error) {
      return next(error);
    }
  }

  async getLatest(req, res, next) {
    try {
      const limit = Number(req.query.limit) || 8;
      const data = await propertyService.getLatest(limit, req.query.location, req);
      return res.json({
        success: true,
        message: 'Latest properties fetched.',
        data,
        errors: [],
      });
    } catch (error) {
      return next(error);
    }
  }

  async getTrending(req, res, next) {
    try {
      const limit = Number(req.query.limit) || 8;
      const data = await propertyService.getTrending(limit, req.query.location, req);
      return res.json({
        success: true,
        message: 'Trending properties fetched.',
        data,
        errors: [],
      });
    } catch (error) {
      return next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const allowInactive = req.user?.role === 'ADMIN';
      const data = await propertyService.getById(req.params.id, req, { allowInactive });
      return res.json({
        success: true,
        message: 'Property fetched.',
        data,
        errors: [],
      });
    } catch (error) {
      return next(error);
    }
  }

  async getByIdPublic(req, res, next) {
    try {
      const data = await propertyService.getById(req.params.id, req, { allowInactive: false });
      return res.json({
        success: true,
        message: 'Property fetched.',
        data,
        errors: [],
      });
    } catch (error) {
      return next(error);
    }
  }

  async create(req, res, next) {
    try {
      const files = req.files || [];
      const data = await propertyService.create(req.body, files, req.user?.id, req);
      return res.status(201).json({
        success: true,
        message: 'Property created.',
        data,
        errors: [],
      });
    } catch (error) {
      return next(error);
    }
  }

  async update(req, res, next) {
    try {
      const files = req.files || [];
      const data = await propertyService.update(req.params.id, req.body, files, req);
      return res.json({
        success: true,
        message: 'Property updated.',
        data,
        errors: [],
      });
    } catch (error) {
      return next(error);
    }
  }

  async remove(req, res, next) {
    try {
      await propertyService.remove(req.params.id);
      return res.json({
        success: true,
        message: 'Property deleted.',
        data: null,
        errors: [],
      });
    } catch (error) {
      return next(error);
    }
  }

  async recordView(req, res, next) {
    try {
      await propertyService.recordView(req.params.id);
      return res.json({
        success: true,
        message: 'View recorded.',
        data: true,
        errors: [],
      });
    } catch (error) {
      return next(error);
    }
  }

  async getRelated(req, res, next) {
    try {
      const property = await propertyService.getById(req.params.id, req, { allowInactive: true });
      const data = await propertyService.getRelated(property, Number(req.query.limit) || 4, req);
      return res.json({
        success: true,
        message: 'Related properties fetched.',
        data,
        errors: [],
      });
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = new PropertyController();
