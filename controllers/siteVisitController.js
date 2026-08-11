'use strict';

const siteVisitService = require('../services/siteVisitService');

class SiteVisitController {
  async validateAgent(req, res, next) {
    try {
      const data = await siteVisitService.validateAgent(req.query.code || req.params.code || req.body.code);
      return res.json({ success: true, message: 'Agent validated.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async submit(req, res, next) {
    try {
      const data = await siteVisitService.submit(req.body, req.user);
      return res.status(201).json({ success: true, message: 'Site visit request submitted.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async listMine(req, res, next) {
    try {
      const data = await siteVisitService.list(req.query, { actor: req.user });
      return res.json({ success: true, message: 'Site visits fetched.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async listAdmin(req, res, next) {
    try {
      const data = await siteVisitService.list(req.query, { actor: req.user });
      return res.json({ success: true, message: 'Site visits fetched.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async listAgent(req, res, next) {
    try {
      const data = await siteVisitService.list(req.query, { actor: req.user });
      return res.json({ success: true, message: 'Site visits fetched.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async listEmployee(req, res, next) {
    try {
      const data = await siteVisitService.list(req.query, { actor: req.user });
      return res.json({ success: true, message: 'Employee site visits fetched.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const data = await siteVisitService.getById(req.params.id, { actor: req.user });
      return res.json({ success: true, message: 'Site visit details fetched.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async approve(req, res, next) {
    try {
      const data = await siteVisitService.approve(req.params.id, req.user, req.body);
      return res.json({ success: true, message: 'Site visit approved.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async reject(req, res, next) {
    try {
      const data = await siteVisitService.reject(req.params.id, req.user, req.body);
      return res.json({ success: true, message: 'Site visit rejected.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async assign(req, res, next) {
    try {
      const data = await siteVisitService.assignAgent(req.params.id, req.user, req.body);
      return res.json({ success: true, message: 'Agent assigned.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async assignEmployee(req, res, next) {
    try {
      const data = await siteVisitService.assignEmployee(req.params.id, req.user, req.body);
      return res.json({ success: true, message: 'Employee assigned.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async updateEmployeeVisit(req, res, next) {
    try {
      const data = await siteVisitService.updateEmployeeVisit(req.params.id, req.user, req.body);
      return res.json({ success: true, message: 'Employee visit updated.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async internalRemarks(req, res, next) {
    try {
      const data = await siteVisitService.addInternalRemarks(
        req.params.id,
        req.user,
        req.body.remarks || req.body.internalRemarks
      );
      return res.json({ success: true, message: 'Internal remarks saved.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async markCompleted(req, res, next) {
    try {
      const data = await siteVisitService.markCompleted(req.params.id, req.user, req.body);
      return res.json({ success: true, message: 'Site visit marked completed.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async purchaseInterest(req, res, next) {
    try {
      const data = await siteVisitService.submitPurchaseInterest(req.params.id, req.user, req.body);
      return res.json({ success: true, message: 'Purchase interest submitted.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async drop(req, res, next) {
    try {
      const data = await siteVisitService.submitDrop(req.params.id, req.user, req.body);
      return res.json({ success: true, message: 'Drop decision recorded.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async close(req, res, next) {
    try {
      const data = await siteVisitService.close(req.params.id, req.user, req.body);
      return res.json({ success: true, message: 'Site visit closed.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = new SiteVisitController();
