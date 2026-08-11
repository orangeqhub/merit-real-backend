'use strict';

const { Op } = require('sequelize');
const { ContactEnquiry } = require('../models');
const notificationService = require('./notificationService');

class ContactEnquiryService {
  format(row) {
    if (!row) return null;
    const r = row.toJSON ? row.toJSON() : row;
    return {
      id: r.id,
      source: r.source,
      fullName: r.fullName,
      mobile: r.mobile,
      email: r.email || null,
      enquiryType: r.enquiryType || null,
      preferredLocation: r.preferredLocation || null,
      propertyCategory: r.propertyCategory || null,
      budgetRange: r.budgetRange || null,
      message: r.message,
      contactMethod: r.contactMethod || null,
      status: r.status,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  }

  async submit(body) {
    const fullName = String(body.fullName || body.name || '').trim();
    const mobile = String(body.mobile || body.phone || '').trim();
    const message = String(body.message || '').trim();
    const source = String(body.source || 'home').trim().toLowerCase() || 'home';

    if (!fullName || !mobile || !message) {
      const err = new Error('Name, phone, and message are required.');
      err.status = 400;
      err.code = 'CONTACT_VALIDATION';
      throw err;
    }

    const digits = mobile.replace(/\D/g, '');
    if (digits.length !== 10) {
      const err = new Error('Please enter a valid 10-digit mobile number.');
      err.status = 400;
      err.code = 'INVALID_MOBILE';
      throw err;
    }

    const row = await ContactEnquiry.create({
      source: ['home', 'about'].includes(source) ? source : 'home',
      fullName,
      mobile: digits,
      email: String(body.email || '').trim() || null,
      enquiryType: String(body.enquiryType || '').trim() || null,
      preferredLocation: String(body.preferredLocation || '').trim() || null,
      propertyCategory: String(body.propertyCategory || '').trim() || null,
      budgetRange: String(body.budgetRange || '').trim() || null,
      message,
      contactMethod: String(body.contactMethod || '').trim() || null,
      status: 'NEW',
    });

    const formatted = this.format(row);

    await notificationService.notifyAdmins({
      titleEn: 'New Contact Enquiry',
      messageEn: `${fullName} submitted a contact form (${formatted.source}).`,
      notificationType: 'contact_enquiry_new',
      referenceType: 'contact_enquiry',
      referenceId: row.id,
      linkPath: '/admin/contact-messages',
    }, { includeSalesMembers: true });

    return formatted;
  }

  async list(query = {}) {
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
    const where = {};

    if (query.status) where.status = String(query.status).toUpperCase();
    if (query.source) where.source = String(query.source).toLowerCase();
    if (query.search) {
      const q = `%${String(query.search).trim()}%`;
      where[Op.or] = [
        { fullName: { [Op.iLike]: q } },
        { mobile: { [Op.iLike]: q } },
        { email: { [Op.iLike]: q } },
        { message: { [Op.iLike]: q } },
      ];
    }

    const { rows, count } = await ContactEnquiry.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });

    return {
      items: rows.map((r) => this.format(r)),
      total: count,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(count / pageSize)),
    };
  }

  async getById(id) {
    const row = await ContactEnquiry.findByPk(Number(id));
    if (!row) {
      const err = new Error('Contact enquiry not found.');
      err.status = 404;
      throw err;
    }
    return this.format(row);
  }

  async updateStatus(id, status) {
    const row = await ContactEnquiry.findByPk(Number(id));
    if (!row) {
      const err = new Error('Contact enquiry not found.');
      err.status = 404;
      throw err;
    }
    const next = String(status || '').toUpperCase();
    if (!['NEW', 'READ', 'CLOSED'].includes(next)) {
      const err = new Error('Invalid status.');
      err.status = 400;
      throw err;
    }
    row.status = next;
    await row.save();
    return this.format(row);
  }
}

module.exports = new ContactEnquiryService();
