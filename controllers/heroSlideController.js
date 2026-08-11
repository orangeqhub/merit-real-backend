'use strict';

const heroSlideService = require('../services/heroSlideService');

class HeroSlideController {
  async listActive(req, res, next) {
    try {
      const data = await heroSlideService.listActive(req);
      return res.json({
        success: true,
        message: 'Active hero slides fetched.',
        data,
        errors: [],
      });
    } catch (error) {
      return next(error);
    }
  }

  async listAll(req, res, next) {
    try {
      const data = await heroSlideService.listAll(req);
      return res.json({
        success: true,
        message: 'Hero slides fetched.',
        data,
        errors: [],
      });
    } catch (error) {
      return next(error);
    }
  }

  async create(req, res, next) {
    try {
      const data = await heroSlideService.create(req.body, req.file, req);
      return res.status(201).json({
        success: true,
        message: 'Hero slide created.',
        data,
        errors: [],
      });
    } catch (error) {
      return next(error);
    }
  }

  async update(req, res, next) {
    try {
      const data = await heroSlideService.update(req.params.id, req.body, req.file, req);
      return res.json({
        success: true,
        message: 'Hero slide updated.',
        data,
        errors: [],
      });
    } catch (error) {
      return next(error);
    }
  }

  async remove(req, res, next) {
    try {
      await heroSlideService.remove(req.params.id);
      return res.json({
        success: true,
        message: 'Hero slide deleted.',
        data: null,
        errors: [],
      });
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = new HeroSlideController();
