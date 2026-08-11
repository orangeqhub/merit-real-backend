'use strict';

const siteSettingService = require('../services/siteSettingService');

class SiteSettingController {
  async getPublic(req, res, next) {
    try {
      const data = await siteSettingService.getPublic();
      return res.json({ success: true, message: 'Site settings fetched.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async update(req, res, next) {
    try {
      const data = await siteSettingService.update(req.body, req.user);
      return res.json({ success: true, message: 'Contact details updated.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = new SiteSettingController();
