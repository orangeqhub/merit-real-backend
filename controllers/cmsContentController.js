'use strict';

const cmsContentService = require('../services/cmsContentService');

class CmsContentController {
  async getPublic(req, res, next) {
    try {
      const data = await cmsContentService.getPublic();
      return res.json({ success: true, message: 'CMS content fetched.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async update(req, res, next) {
    try {
      const data = await cmsContentService.update(req.body, req.user);
      return res.json({ success: true, message: 'CMS content updated.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = new CmsContentController();
