'use strict';

const mapBookingService = require('../services/mapBookingService');

class MapBookingController {
  async list(req, res, next) {
    try {
      const data = await mapBookingService.list(req.query);
      return res.json({ success: true, message: 'Plots fetched.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const data = await mapBookingService.getById(req.params.id, {
        layout: req.query.layout,
        plotNo: req.query.plotNo,
        phase: req.query.phase,
      });
      return res.json({ success: true, message: 'Plot fetched.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async upsert(req, res, next) {
    try {
      const body = { ...req.body };
      if (!body.layoutKey && req.query.layout) body.layoutKey = req.query.layout;
      const data = await mapBookingService.upsert(body, { layout: body.layoutKey });
      return res.status(201).json({ success: true, message: 'Plot saved.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async book(req, res, next) {
    try {
      const data = await mapBookingService.book(req.params.id, req.body, req.user, { layout: req.query.layout });
      return res.json({ success: true, message: 'Plot booked.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async updateStatus(req, res, next) {
    try {
      const data = await mapBookingService.updateStatus(req.params.id, req.body, { layout: req.query.layout });
      return res.json({ success: true, message: 'Plot status updated.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async seed(req, res, next) {
    try {
      const items = Array.isArray(req.body?.items) ? req.body.items : [];
      const data = await mapBookingService.seedPlots(items, { layout: req.body.layout || req.query.layout });
      return res.status(201).json({ success: true, message: 'Plots seeded.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async updatePricing(req, res, next) {
    try {
      const data = await mapBookingService.updatePricing({
        ...req.body,
        id: req.params.id || req.body.id,
      }, { layout: req.body.layout || req.query.layout });
      return res.json({ success: true, message: 'Plot pricing updated.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async bulkPricing(req, res, next) {
    try {
      const body = { ...(req.body || {}) };
      if (!body.layout && req.query.layout) body.layout = req.query.layout;
      const data = await mapBookingService.bulkPricing(body);
      return res.json({ success: true, message: 'Plot pricing bulk updated.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async importSheet(req, res, next) {
    try {
      const body = req.body || {};
      const layout = body.layout || req.query.layout;
      let data;
      if (Array.isArray(body.phase1) && Array.isArray(body.phase2)) {
        data = await mapBookingService.importWorkbook({
          phase1: body.phase1,
          phase2: body.phase2,
          layout,
        });
      } else if (body.phase1?.rows && body.phase2?.rows) {
        data = await mapBookingService.importWorkbook({
          phase1: body.phase1.rows,
          phase2: body.phase2.rows,
          layout,
        });
      } else {
        data = await mapBookingService.importSheet({ ...body, layout });
      }
      console.log(
        `[map-import] layout=${layout} user=${req.user?.id ?? '-'} inserted=${data.inserted || 0} ` +
          `updated=${data.updated || 0} unchanged=${data.unchanged || 0} skipped=${data.skipped || 0}`
      );
      return res.json({ success: true, message: 'Sheet imported.', data, errors: data.errors || [] });
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = new MapBookingController();
