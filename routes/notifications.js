'use strict';

const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const validateRequest = require('../utils/validateRequest');
const { param } = require('express-validator');
const controller = require('../controllers/notificationController');

router.use(authenticate);

router.get('/', (req, res, next) => controller.list(req, res, next));
router.get('/unread-count', (req, res, next) => controller.unreadCount(req, res, next));
router.patch(
  '/:id/read',
  [param('id').isInt({ min: 1 })],
  validateRequest,
  (req, res, next) => controller.markRead(req, res, next)
);
router.post('/read-all', (req, res, next) => controller.markAllRead(req, res, next));
router.delete(
  '/:id',
  [param('id').isInt({ min: 1 })],
  validateRequest,
  (req, res, next) => controller.remove(req, res, next)
);

module.exports = router;
