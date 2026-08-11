'use strict';

const notificationService = require('../services/notificationService');

class NotificationController {
  async list(req, res, next) {
    try {
      const data = await notificationService.listForUser(req.user.id, {
        page: req.query.page,
        pageSize: req.query.pageSize,
        unreadOnly: req.query.unreadOnly === 'true',
      });
      return res.json({ success: true, message: 'Notifications fetched.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async unreadCount(req, res, next) {
    try {
      const count = await notificationService.getUnreadCount(req.user.id);
      return res.json({ success: true, message: 'Unread count fetched.', data: { count }, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async markRead(req, res, next) {
    try {
      const data = await notificationService.markRead(req.params.id, req.user.id);
      return res.json({ success: true, message: 'Notification marked as read.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async markAllRead(req, res, next) {
    try {
      const data = await notificationService.markAllRead(req.user.id);
      return res.json({ success: true, message: 'All notifications marked as read.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async remove(req, res, next) {
    try {
      const data = await notificationService.remove(req.params.id, req.user.id);
      return res.json({ success: true, message: 'Notification deleted.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = new NotificationController();
