'use strict';

const walletService = require('../services/walletService');

class WalletController {
  async getConfig(req, res, next) {
    try {
      return res.json({ success: true, message: 'Wallet config.', data: walletService.getConfig(), errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async getMine(req, res, next) {
    try {
      const data = await walletService.getAgentDashboard(req.user.id);
      return res.json({ success: true, message: 'Wallet fetched.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async getAgentWallet(req, res, next) {
    try {
      const data = await walletService.getAgentDashboard(Number(req.params.agentId));
      return res.json({ success: true, message: 'Agent wallet fetched.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async listMyTransactions(req, res, next) {
    try {
      const data = await walletService.listTransactions(req.user.id, req.query);
      return res.json({ success: true, message: 'Transactions fetched.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async listAgentTransactions(req, res, next) {
    try {
      const data = await walletService.listTransactions(Number(req.params.agentId), req.query);
      return res.json({ success: true, message: 'Transactions fetched.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async getMyBank(req, res, next) {
    try {
      const data = await walletService.getBankDetails(req.user.id);
      return res.json({ success: true, message: 'Bank details fetched.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async getAgentBank(req, res, next) {
    try {
      const data = await walletService.getBankDetails(Number(req.params.agentId), { mask: false });
      return res.json({ success: true, message: 'Bank details fetched.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async saveBank(req, res, next) {
    try {
      const payload = { ...req.body };
      if (req.files?.cancelledCheque?.[0]) {
        payload.cancelledChequePath = `/uploads/bank-docs/${req.files.cancelledCheque[0].filename}`;
      }
      if (req.files?.passbookCopy?.[0]) {
        payload.passbookCopyPath = `/uploads/bank-docs/${req.files.passbookCopy[0].filename}`;
      }
      const data = await walletService.saveBankDetails(req.user.id, payload, req.user);
      return res.json({ success: true, message: 'Bank details saved.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async creditCommission(req, res, next) {
    try {
      const data = await walletService.creditCommission({
        closedDealId: Number(req.params.closedDealId || req.body.closedDealId),
        commissionPercent: req.body.commissionPercent,
        commissionAmount: req.body.commissionAmount,
        remarks: req.body.remarks,
      }, req.user);
      return res.json({ success: true, message: 'Commission credited.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async manualCredit(req, res, next) {
    try {
      const data = await walletService.manualCredit(req.body, req.user);
      return res.json({ success: true, message: 'Manual credit completed.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async adjust(req, res, next) {
    try {
      const data = await walletService.adjustWallet(req.body, req.user);
      return res.json({ success: true, message: 'Wallet adjusted.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async redeem(req, res, next) {
    try {
      const data = await walletService.redeem(req.body, req.user);
      return res.json({ success: true, message: 'Redemption request submitted.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async listRedemptions(req, res, next) {
    try {
      const filters = { ...req.query };
      if (req.user.role === 'AGENT') filters.agentId = req.user.id;
      const data = await walletService.listRedemptions(filters);
      return res.json({ success: true, message: 'Redemption requests fetched.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async approveRedemption(req, res, next) {
    try {
      const data = await walletService.approveRedemption(Number(req.params.id), req.body, req.user);
      return res.json({ success: true, message: 'Redemption approved.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async rejectRedemption(req, res, next) {
    try {
      const data = await walletService.rejectRedemption(Number(req.params.id), req.body, req.user);
      return res.json({ success: true, message: 'Redemption rejected.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async settleRedemption(req, res, next) {
    try {
      const data = await walletService.completeSettlement(Number(req.params.id), req.body, req.user);
      return res.json({ success: true, message: 'Settlement completed.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async adminReports(req, res, next) {
    try {
      const data = await walletService.getAdminReports();
      return res.json({ success: true, message: 'Wallet reports fetched.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async agentReports(req, res, next) {
    try {
      const agentId = req.user.role === 'ADMIN' && req.query.agentId
        ? Number(req.query.agentId)
        : req.user.id;
      const data = await walletService.getAgentReports(agentId);
      return res.json({ success: true, message: 'Agent wallet reports fetched.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = new WalletController();
