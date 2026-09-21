'use strict';

const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const authorizeRoles = require('../middleware/authorize');
const { ROLES } = require('../constants/roles');
const controller = require('../controllers/walletController');
const { bankDocsUpload } = require('../utils/upload');

router.get('/config', authenticate, (req, res, next) => controller.getConfig(req, res, next));

router.get('/mine', authenticate, authorizeRoles(ROLES.AGENT), (req, res, next) =>
  controller.getMine(req, res, next)
);
router.get('/mine/transactions', authenticate, authorizeRoles(ROLES.AGENT), (req, res, next) =>
  controller.listMyTransactions(req, res, next)
);
router.get('/mine/bank', authenticate, authorizeRoles(ROLES.AGENT), (req, res, next) =>
  controller.getMyBank(req, res, next)
);
router.post(
  '/mine/bank',
  authenticate,
  authorizeRoles(ROLES.AGENT),
  bankDocsUpload.fields([
    { name: 'cancelledCheque', maxCount: 1 },
    { name: 'passbookCopy', maxCount: 1 },
  ]),
  (req, res, next) => controller.saveBank(req, res, next)
);
router.put(
  '/mine/bank',
  authenticate,
  authorizeRoles(ROLES.AGENT),
  bankDocsUpload.fields([
    { name: 'cancelledCheque', maxCount: 1 },
    { name: 'passbookCopy', maxCount: 1 },
  ]),
  (req, res, next) => controller.saveBank(req, res, next)
);
router.post('/mine/redeem', authenticate, authorizeRoles(ROLES.AGENT), (req, res, next) =>
  controller.redeem(req, res, next)
);
router.get('/mine/redemptions', authenticate, authorizeRoles(ROLES.AGENT), (req, res, next) =>
  controller.listRedemptions(req, res, next)
);
router.get('/mine/reports', authenticate, authorizeRoles(ROLES.AGENT), (req, res, next) =>
  controller.agentReports(req, res, next)
);

router.get('/agents/:agentId', authenticate, authorizeRoles(ROLES.ADMIN), (req, res, next) =>
  controller.getAgentWallet(req, res, next)
);
router.get('/agents/:agentId/transactions', authenticate, authorizeRoles(ROLES.ADMIN), (req, res, next) =>
  controller.listAgentTransactions(req, res, next)
);
router.get('/agents/:agentId/bank', authenticate, authorizeRoles(ROLES.ADMIN), (req, res, next) =>
  controller.getAgentBank(req, res, next)
);

router.post(
  '/credit-commission/:closedDealId',
  authenticate,
  authorizeRoles(ROLES.ADMIN),
  (req, res, next) => controller.creditCommission(req, res, next)
);
router.post('/manual-credit', authenticate, authorizeRoles(ROLES.ADMIN), (req, res, next) =>
  controller.manualCredit(req, res, next)
);
router.post('/adjust', authenticate, authorizeRoles(ROLES.ADMIN), (req, res, next) =>
  controller.adjust(req, res, next)
);

router.get('/redemptions', authenticate, authorizeRoles(ROLES.ADMIN, ROLES.AGENT), (req, res, next) =>
  controller.listRedemptions(req, res, next)
);
router.post('/redemptions/:id/approve', authenticate, authorizeRoles(ROLES.ADMIN), (req, res, next) =>
  controller.approveRedemption(req, res, next)
);
router.post('/redemptions/:id/reject', authenticate, authorizeRoles(ROLES.ADMIN), (req, res, next) =>
  controller.rejectRedemption(req, res, next)
);
router.post('/redemptions/:id/settle', authenticate, authorizeRoles(ROLES.ADMIN), (req, res, next) =>
  controller.settleRedemption(req, res, next)
);

router.get('/reports/admin', authenticate, authorizeRoles(ROLES.ADMIN), (req, res, next) =>
  controller.adminReports(req, res, next)
);
router.get('/reports/agent', authenticate, authorizeRoles(ROLES.ADMIN, ROLES.AGENT), (req, res, next) =>
  controller.agentReports(req, res, next)
);

module.exports = router;
