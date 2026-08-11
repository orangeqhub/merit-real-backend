'use strict';

const { Op } = require('sequelize');
const { Notification, User } = require('../models');
const { ROLES } = require('../constants/roles');

class NotificationService {
  format(row) {
    if (!row) return null;
    const n = row.toJSON ? row.toJSON() : row;
    return {
      id: n.id,
      userId: n.userId,
      userRole: n.userRole,
      titleEn: n.titleEn,
      titleTe: n.titleTe || n.titleEn,
      messageEn: n.messageEn,
      messageTe: n.messageTe || n.messageEn,
      type: n.notificationType,
      notificationType: n.notificationType,
      relatedType: n.referenceType,
      relatedId: n.referenceId,
      referenceType: n.referenceType,
      referenceId: n.referenceId,
      linkPath: n.linkPath,
      imageUrl: n.imageUrl || null,
      thumbnail: n.imageUrl || null,
      read: Boolean(n.isRead),
      isRead: Boolean(n.isRead),
      createdAt: n.createdAt,
      updatedAt: n.updatedAt,
    };
  }

  async create({
    userId,
    userRole,
    titleEn,
    titleTe,
    messageEn,
    messageTe,
    notificationType,
    referenceType = null,
    referenceId = null,
    linkPath = null,
    imageUrl = null,
    createdBy = null,
  }) {
    if (!userId) return null;
    const row = await Notification.create({
      userId,
      userRole: userRole || 'CUSTOMER',
      titleEn,
      titleTe: titleTe || titleEn,
      messageEn,
      messageTe: messageTe || messageEn,
      notificationType,
      referenceType,
      referenceId,
      linkPath,
      imageUrl,
      isRead: false,
      createdBy,
    });
    const formatted = this.format(row);
    try {
      const { emitNotification } = require('../utils/realtime');
      emitNotification(userId, formatted);
    } catch {
      // realtime optional during bootstrap
    }
    return formatted;
  }

  async notifyByRole(role, payload) {
    const users = await User.findAll({
      where: { role, status: 'ACTIVE' },
      attributes: ['id', 'role'],
    });
    const results = [];
    for (const user of users) {
      results.push(await this.create({
        ...payload,
        userId: user.id,
        userRole: role,
      }));
    }
    return results;
  }

  async notifyAdmins(payload, options = {}) {
    const { includeSalesMembers = true } = options;
    const results = await this.notifyByRole(ROLES.ADMIN, payload);
    if (includeSalesMembers) {
      const salesResults = await this.notifySalesMembers(payload);
      return results.concat(salesResults);
    }
    return results;
  }

  async notifySalesMembers(payload) {
    let linkPath = payload.linkPath || '/sales/dashboard';
    const adminToSales = {
      '/admin/registrations': '/sales/dashboard',
      '/admin/express-interests': '/sales/leads',
      '/admin/bookings': '/sales/bookings',
      '/admin/purchases': '/sales/purchases',
      '/admin/closed-deals': '/sales/closed-deals',
      '/admin/properties': '/sales/properties',
      '/admin/follow-ups': '/sales/follow-ups',
      '/admin/wallet-redemptions': '/sales/dashboard',
      '/admin/contact-messages': '/sales/contact-messages',
    };
    if (adminToSales[linkPath]) {
      linkPath = adminToSales[linkPath];
    } else if (String(linkPath).startsWith('/admin/')) {
      linkPath = String(linkPath).replace(/^\/admin/, '/sales');
    }

    return this.notifyByRole(ROLES.SALES_MEMBER, {
      ...payload,
      linkPath,
    });
  }

  async notifyCustomers(payload) {
    const customers = await User.findAll({
      where: { role: ROLES.CUSTOMER, status: 'ACTIVE' },
      attributes: ['id', 'role'],
    });
    const results = [];
    for (const customer of customers) {
      results.push(await this.create({
        ...payload,
        userId: customer.id,
        userRole: ROLES.CUSTOMER,
      }));
    }
    return results;
  }

  async listForUser(userId, { page = 1, pageSize = 50, unreadOnly = false } = {}) {
    const where = { userId: Number(userId) };
    if (unreadOnly) where.isRead = false;

    const limit = Math.min(100, Math.max(1, Number(pageSize) || 50));
    const offset = (Math.max(1, Number(page) || 1) - 1) * limit;

    const { rows, count } = await Notification.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    return {
      items: rows.map((r) => this.format(r)),
      total: count,
      unreadCount: await Notification.count({ where: { userId: Number(userId), isRead: false } }),
      page: Math.max(1, Number(page) || 1),
      pageSize: limit,
    };
  }

  async getUnreadCount(userId) {
    return Notification.count({ where: { userId: Number(userId), isRead: false } });
  }

  async markRead(id, userId) {
    const row = await Notification.findOne({ where: { id: Number(id), userId: Number(userId) } });
    if (!row) {
      const err = new Error('Notification not found.');
      err.status = 404;
      err.code = 'NOTIFICATION_NOT_FOUND';
      throw err;
    }
    await row.update({ isRead: true });
    return this.format(row);
  }

  async markAllRead(userId) {
    await Notification.update(
      { isRead: true },
      { where: { userId: Number(userId), isRead: false } }
    );
    return { success: true };
  }

  async remove(id, userId) {
    const deleted = await Notification.destroy({
      where: { id: Number(id), userId: Number(userId) },
    });
    if (!deleted) {
      const err = new Error('Notification not found.');
      err.status = 404;
      err.code = 'NOTIFICATION_NOT_FOUND';
      throw err;
    }
    return { success: true };
  }
}

module.exports = new NotificationService();
