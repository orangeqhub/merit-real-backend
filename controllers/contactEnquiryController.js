'use strict';

const contactEnquiryService = require('../services/contactEnquiryService');

class ContactEnquiryController {
  async submit(req, res, next) {
    try {
      const data = await contactEnquiryService.submit(req.body);
      return res.status(201).json({
        success: true,
        message: 'Contact enquiry submitted.',
        data,
        errors: [],
      });
    } catch (error) {
      return next(error);
    }
  }

  async list(req, res, next) {
    try {
      const data = await contactEnquiryService.list(req.query);
      return res.json({ success: true, message: 'Contact enquiries fetched.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const data = await contactEnquiryService.getById(req.params.id);
      return res.json({ success: true, message: 'Contact enquiry fetched.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async updateStatus(req, res, next) {
    try {
      const data = await contactEnquiryService.updateStatus(req.params.id, req.body.status);
      return res.json({ success: true, message: 'Status updated.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = new ContactEnquiryController();
