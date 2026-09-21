'use strict';

const registrationService = require('../services/registrationService');

class RegistrationController {
  async list(req, res, next) {
    try {
      const data = await registrationService.list({
        status: req.query.status,
        role: req.query.role,
      }, req);
      return res.json({
        success: true,
        message: 'Registrations fetched.',
        data,
        errors: [],
      });
    } catch (error) {
      return next(error);
    }
  }

  async listPending(req, res, next) {
    try {
      const data = await registrationService.listPending(req);
      return res.json({
        success: true,
        message: 'Pending registrations fetched.',
        data,
        errors: [],
      });
    } catch (error) {
      return next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const data = await registrationService.getById(req.params.id, req);
      return res.json({
        success: true,
        message: 'Registration details fetched.',
        data,
        errors: [],
      });
    } catch (error) {
      return next(error);
    }
  }

  async approve(req, res, next) {
    try {
      const data = await registrationService.approve(
        req.params.id,
        req.user,
        { grade: req.body.grade || req.body.agentGrade },
        req
      );
      return res.json({
        success: true,
        message: 'Registration approved.',
        data,
        errors: [],
      });
    } catch (error) {
      return next(error);
    }
  }

  async reject(req, res, next) {
    try {
      const data = await registrationService.reject(
        req.params.id,
        req.body.reason || req.body.rejectionReason,
        req.user,
        req
      );
      return res.json({
        success: true,
        message: 'Registration rejected.',
        data,
        errors: [],
      });
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = new RegistrationController();
