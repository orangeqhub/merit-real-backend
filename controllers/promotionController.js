'use strict';

const promotionService = require('../services/promotionService');

class PromotionController {
  async listActive(req, res, next) {
    try {
      // Always return currently scheduled ACTIVE promotions for website/dashboard banners.
      // Dismiss / "Save for later" must not permanently remove promotional banners.
      const data = await promotionService.listActive(req, {
        excludeDismissed: false,
        customerId: null,
      });
      return res.json({
        success: true,
        message: 'Active promotions fetched.',
        data,
        errors: [],
      });
    } catch (error) {
      return next(error);
    }
  }

  async listAll(req, res, next) {
    try {
      const data = await promotionService.listAll(req);
      return res.json({
        success: true,
        message: 'Promotions fetched.',
        data,
        errors: [],
      });
    } catch (error) {
      return next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const data = await promotionService.getById(req.params.id, req);
      return res.json({
        success: true,
        message: 'Promotion details fetched.',
        data,
        errors: [],
      });
    } catch (error) {
      return next(error);
    }
  }

  async create(req, res, next) {
    try {
      const data = await promotionService.create(req.body, req.file, req, req.user?.id);
      return res.status(201).json({
        success: true,
        message: 'Promotion created.',
        data,
        errors: [],
      });
    } catch (error) {
      return next(error);
    }
  }

  async update(req, res, next) {
    try {
      const data = await promotionService.update(req.params.id, req.body, req.file, req, req.user?.id);
      return res.json({
        success: true,
        message: 'Promotion updated.',
        data,
        errors: [],
      });
    } catch (error) {
      return next(error);
    }
  }

  async activate(req, res, next) {
    try {
      const data = await promotionService.setStatus(req.params.id, 'ACTIVE', req, req.user?.id);
      return res.json({
        success: true,
        message: 'Promotion activated.',
        data,
        errors: [],
      });
    } catch (error) {
      return next(error);
    }
  }

  async deactivate(req, res, next) {
    try {
      const data = await promotionService.setStatus(req.params.id, 'INACTIVE', req, req.user?.id);
      return res.json({
        success: true,
        message: 'Promotion deactivated.',
        data,
        errors: [],
      });
    } catch (error) {
      return next(error);
    }
  }

  async remove(req, res, next) {
    try {
      await promotionService.remove(req.params.id);
      return res.json({
        success: true,
        message: 'Promotion deleted.',
        data: null,
        errors: [],
      });
    } catch (error) {
      return next(error);
    }
  }

  async myPromotions(req, res, next) {
    try {
      const data = await promotionService.listMine(req.user.id, req, {
        status: req.query.status,
        search: req.query.search,
        type: req.query.type,
        sort: req.query.sort,
      });
      return res.json({
        success: true,
        message: 'My promotions fetched.',
        data,
        errors: [],
      });
    } catch (error) {
      return next(error);
    }
  }

  async dismissed(req, res, next) {
    try {
      const data = await promotionService.listMine(req.user.id, req, {
        status: 'dismissed',
        search: req.query.search,
        type: req.query.type,
        sort: req.query.sort,
      });
      return res.json({
        success: true,
        message: 'Dismissed promotions fetched.',
        data,
        errors: [],
      });
    } catch (error) {
      return next(error);
    }
  }

  async dismiss(req, res, next) {
    try {
      const data = await promotionService.dismiss(req.params.id, req.user.id);
      return res.json({
        success: true,
        message: 'Promotion dismissed.',
        data,
        errors: [],
      });
    } catch (error) {
      return next(error);
    }
  }

  async restore(req, res, next) {
    try {
      const data = await promotionService.restore(req.params.id, req.user.id);
      return res.json({
        success: true,
        message: 'Promotion restored.',
        data,
        errors: [],
      });
    } catch (error) {
      return next(error);
    }
  }

  async markNotificationRead(req, res, next) {
    try {
      const notificationService = require('../services/notificationService');
      const data = await notificationService.markRead(req.params.notificationId, req.user.id);
      return res.json({
        success: true,
        message: 'Notification marked as read.',
        data,
        errors: [],
      });
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = new PromotionController();
