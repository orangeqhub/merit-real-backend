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

  async submitFromInterest(req, res, next) {
    try {
      const data = await siteVisitService.submit({
        ...req.body,
        expressInterestId: req.params.interestId,
      }, req.user);
      return res.status(201).json({
        success: true,
        message: 'Site visit request submitted from express interest.',
        data,
        errors: [],
      });
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

  async reschedule(req, res, next) {
    try {
      const data = await siteVisitService.reschedule(req.params.id, req.user, req.body);
      return res.json({ success: true, message: 'Site visit rescheduled.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async requestReschedule(req, res, next) {
    try {
      const data = await siteVisitService.requestReschedule(req.params.id, req.user, req.body);
      return res.json({ success: true, message: 'Reschedule request submitted.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async confirm(req, res, next) {
    try {
      const data = await siteVisitService.confirm(req.params.id, req.user, req.body);
      return res.json({ success: true, message: 'Site visit confirmed.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async approveVehicle(req, res, next) {
    try {
      const data = await siteVisitService.approveVehicle(req.params.id, req.user, req.body);
      return res.json({ success: true, message: 'Company vehicle approved.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async assignVehicleCompatible(req, res, next) {
    try {
      const data = await siteVisitService.assignVehicle(req.params.id, req.user, req.body);
      return res.json({ success: true, message: 'Company vehicle assigned.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async rejectVehicle(req, res, next) {
    try {
      const data = await siteVisitService.rejectVehicle(req.params.id, req.user, req.body);
      return res.json({ success: true, message: 'Company vehicle rejected.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async acceptVehicle(req, res, next) {
    try {
      const data = await siteVisitService.acceptVehicle(req.params.id, req.user, req.body);
      return res.json({ success: true, message: 'Company vehicle accepted.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async requestVehicleChange(req, res, next) {
    try {
      const data = await siteVisitService.requestVehicleChange(req.params.id, req.user, req.body);
      return res.json({ success: true, message: 'Vehicle change requested.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async remarks(req, res, next) {
    try {
      const data = await siteVisitService.addRemarks(req.params.id, req.user, req.body);
      return res.json({ success: true, message: 'Site visit remarks saved.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async cancel(req, res, next) {
    try {
      const data = await siteVisitService.cancel(req.params.id, req.user, req.body);
      return res.json({ success: true, message: 'Site visit cancelled.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async noShow(req, res, next) {
    try {
      const data = await siteVisitService.markNoShow(req.params.id, req.user, req.body);
      return res.json({ success: true, message: 'Site visit marked no-show.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async start(req, res, next) {
    try {
      const data = await siteVisitService.start(req.params.id, req.user, req.body);
      return res.json({ success: true, message: 'Site visit started.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async requestVehicle(req, res, next) {
    try {
      const data = await siteVisitService.updateVehicle(
        req.params.id,
        req.user,
        { ...req.body, vehicleRequired: true, vehicleStatus: 'REQUESTED' }
      );
      return res.json({ success: true, message: 'Vehicle requested.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async assignVehicle(req, res, next) {
    try {
      const data = await siteVisitService.assignVehicle(req.params.id, req.user, req.body);
      return res.json({ success: true, message: 'Vehicle assigned.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async updateVehicle(req, res, next) {
    try {
      const data = await siteVisitService.updateVehicle(req.params.id, req.user, req.body);
      return res.json({ success: true, message: 'Vehicle workflow updated.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async addFollowUp(req, res, next) {
    try {
      const data = await siteVisitService.addFollowUp(req.params.id, req.user, req.body);
      return res.status(201).json({ success: true, message: 'Site visit follow-up added.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async listFollowUps(req, res, next) {
    try {
      const visit = await siteVisitService.getById(req.params.id, { actor: req.user });
      return res.json({
        success: true,
        message: 'Site visit follow-ups fetched.',
        data: visit.followUps || [],
        errors: [],
      });
    } catch (error) {
      return next(error);
    }
  }

  async listHistory(req, res, next) {
    try {
      const visit = await siteVisitService.getById(req.params.id, { actor: req.user });
      return res.json({
        success: true,
        message: 'Site visit history fetched.',
        data: visit.history || [],
        errors: [],
      });
    } catch (error) {
      return next(error);
    }
  }

  async postVisitPurchase(req, res, next) {
    try {
      const data = await siteVisitService.submitPostVisitPurchase(req.params.id, req.user, req.body);
      return res.status(201).json({ success: true, message: 'Post-visit purchase request submitted.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async runReminderJob(req, res, next) {
    try {
      const data = await siteVisitService.processReminders();
      return res.json({ success: true, message: 'Site visit reminders processed.', data, errors: [] });
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
