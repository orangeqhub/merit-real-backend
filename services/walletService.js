'use strict';

const { Op } = require('sequelize');
const {
  AgentWallet,
  AgentBankDetail,
  AgentBankDetailHistory,
  WalletTransaction,
  WalletRedemptionRequest,
  WalletSettlement,
  ClosedDeal,
  User,
  Property,
  ActivityLog,
  sequelize,
} = require('../models');
const { ROLES } = require('../constants/roles');
const notificationService = require('./notificationService');
const { emitWalletUpdate } = require('../utils/realtime');
const { resolveMediaUrl } = require('../utils/mediaUrl');

const DEFAULT_COMMISSION_PERCENT = Number(process.env.DEFAULT_COMMISSION_PERCENT) || 2;
const MIN_REDEMPTION_AMOUNT = Number(process.env.MIN_WALLET_REDEMPTION) || 1000;

const TX = {
  COMMISSION_CREDIT: 'COMMISSION_CREDIT',
  INCENTIVE_CREDIT: 'INCENTIVE_CREDIT',
  REDEMPTION_REQUEST: 'REDEMPTION_REQUEST',
  REDEMPTION_APPROVED: 'REDEMPTION_APPROVED',
  REDEMPTION_REJECTED: 'REDEMPTION_REJECTED',
  WALLET_ADJUSTMENT: 'WALLET_ADJUSTMENT',
  REVERSAL: 'REVERSAL',
  SETTLEMENT_COMPLETED: 'SETTLEMENT_COMPLETED',
};

function fail(message, status = 400, code = 'WALLET_ERROR') {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}

function money(n) {
  return Number(n || 0);
}

function maskAccount(accountNumber) {
  const s = String(accountNumber || '');
  if (s.length <= 4) return '****';
  return `${'*'.repeat(Math.max(4, s.length - 4))}${s.slice(-4)}`;
}

function nextCode(prefix) {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.floor(Math.random() * 9000 + 1000);
  return `${prefix}-${stamp}-${rand}`;
}

function displayType(type) {
  if ([TX.COMMISSION_CREDIT, TX.INCENTIVE_CREDIT].includes(type)) return 'Credit';
  if ([TX.REDEMPTION_REQUEST, TX.REDEMPTION_APPROVED, TX.REDEMPTION_REJECTED, TX.SETTLEMENT_COMPLETED].includes(type)) {
    return 'Redemption';
  }
  if (type === TX.REVERSAL) return 'Reversal';
  return 'Adjustment';
}

class WalletService {
  getConfig() {
    return {
      defaultCommissionPercent: DEFAULT_COMMISSION_PERCENT,
      minRedemptionAmount: MIN_REDEMPTION_AMOUNT,
    };
  }

  async ensureWallet(agentId, { transaction, actorId } = {}) {
    const id = Number(agentId);
    if (!Number.isFinite(id) || id <= 0) {
      const err = new Error('Valid agentId is required.');
      err.status = 400;
      err.code = 'INVALID_AGENT';
      throw err;
    }

    try {
      const [wallet] = await AgentWallet.findOrCreate({
        where: { agentId: id },
        defaults: {
          agentId: id,
          balance: 0,
          pendingRedemption: 0,
          totalEarned: 0,
          totalRedeemed: 0,
          createdBy: actorId || null,
          modifiedBy: actorId || null,
        },
        transaction,
      });
      return wallet;
    } catch (err) {
      // Concurrent create can still hit the unique index; reuse the existing row.
      const isUnique = err?.name === 'SequelizeUniqueConstraintError'
        || err?.original?.code === '23505'
        || /AgentWallets_agentId_key/i.test(String(err?.message || ''));
      if (!isUnique) throw err;

      const existing = await AgentWallet.findOne({ where: { agentId: id }, transaction });
      if (existing) return existing;
      throw err;
    }
  }

  formatWallet(wallet, extras = {}) {
    const balance = money(wallet.balance);
    const pendingRedemption = money(wallet.pendingRedemption);
    return {
      id: wallet.id,
      agentId: wallet.agentId,
      balance,
      pendingRedemption,
      availableBalance: Math.max(0, balance - pendingRedemption),
      totalEarned: money(wallet.totalEarned),
      totalRedeemed: money(wallet.totalRedeemed),
      lastCreditAt: wallet.lastCreditAt,
      lastRedemptionAt: wallet.lastRedemptionAt,
      updatedAt: wallet.updatedAt,
      ...extras,
    };
  }

  formatBank(bank, { mask = false, includePaths = true } = {}) {
    if (!bank) return null;
    const j = bank.toJSON ? bank.toJSON() : bank;
    return {
      id: j.id,
      agentId: j.agentId,
      accountHolderName: j.accountHolderName,
      bankName: j.bankName,
      branchName: j.branchName,
      accountNumber: mask ? maskAccount(j.accountNumber) : j.accountNumber,
      accountNumberMasked: maskAccount(j.accountNumber),
      ifscCode: j.ifscCode,
      accountType: j.accountType,
      upiId: j.upiId,
      panNumber: j.panNumber,
      cancelledChequePath: includePaths && j.cancelledChequePath
        ? resolveMediaUrl(null, j.cancelledChequePath)
        : j.cancelledChequePath || null,
      passbookCopyPath: includePaths && j.passbookCopyPath
        ? resolveMediaUrl(null, j.passbookCopyPath)
        : j.passbookCopyPath || null,
      updatedAt: j.updatedAt,
      createdAt: j.createdAt,
    };
  }

  formatTransaction(row) {
    const j = row.toJSON ? row.toJSON() : row;
    const deal = j.closedDeal;
    return {
      id: j.id,
      transactionId: j.transactionCode,
      transactionCode: j.transactionCode,
      type: j.type,
      displayType: displayType(j.type),
      amount: money(j.amount),
      status: j.status,
      remarks: j.remarks,
      closedDealId: j.closedDealId,
      closedDealReference: deal?.dealCode || null,
      property: deal?.property?.titleEn || j.metaJson?.propertyTitle || null,
      customer: deal?.customer?.name || j.metaJson?.customerName || null,
      redemptionRequestId: j.redemptionRequestId,
      metaJson: j.metaJson || {},
      createdBy: j.createdBy,
      date: j.createdAt,
      createdAt: j.createdAt,
    };
  }

  async getAgentDashboard(agentId) {
    const wallet = await this.ensureWallet(agentId);
    const closedDeals = await ClosedDeal.count({ where: { agentId } });
    const pendingRequests = await WalletRedemptionRequest.count({
      where: { agentId, status: { [Op.in]: ['PENDING', 'APPROVED'] } },
    });
    return this.formatWallet(wallet, {
      totalClosedDeals: closedDeals,
      pendingRedemptionRequests: pendingRequests,
    });
  }

  async listTransactions(agentId, { page = 1, pageSize = 20, type } = {}) {
    const wallet = await this.ensureWallet(agentId);
    const where = { walletId: wallet.id, agentId };
    if (type) where.type = type;

    const limit = Math.min(200, Math.max(1, Number(pageSize) || 20));
    const offset = (Math.max(1, Number(page) || 1) - 1) * limit;

    const { rows, count } = await WalletTransaction.findAndCountAll({
      where,
      include: [{
        model: ClosedDeal,
        as: 'closedDeal',
        required: false,
        include: [
          { model: Property, as: 'property', attributes: ['id', 'titleEn'] },
          { model: User, as: 'customer', attributes: ['id', 'name'] },
        ],
      }],
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    return {
      items: rows.map((r) => this.formatTransaction(r)),
      total: count,
      page: Math.max(1, Number(page) || 1),
      pageSize: limit,
      totalPages: Math.max(1, Math.ceil(count / limit)),
    };
  }

  async emitWallet(agentId, eventType, extra = {}) {
    const summary = await this.getAgentDashboard(agentId);
    emitWalletUpdate(agentId, { eventType, wallet: summary, ...extra });
    return summary;
  }

  async getBankDetails(agentId, { mask = false } = {}) {
    const bank = await AgentBankDetail.findOne({ where: { agentId } });
    return this.formatBank(bank, { mask });
  }

  async saveBankDetails(agentId, payload, actor) {
    const accountNumber = String(payload.accountNumber || '').trim();
    const confirmAccountNumber = String(payload.confirmAccountNumber || '').trim();
    if (!accountNumber) throw fail('Account number is required.', 400, 'ACCOUNT_REQUIRED');
    if (confirmAccountNumber && confirmAccountNumber !== accountNumber) {
      throw fail('Account number confirmation does not match.', 400, 'ACCOUNT_MISMATCH');
    }
    if (!payload.accountHolderName || !payload.bankName || !payload.ifscCode) {
      throw fail('Account holder name, bank name, and IFSC are required.', 400, 'BANK_REQUIRED');
    }

    const existing = await AgentBankDetail.findOne({ where: { agentId } });
    const data = {
      accountHolderName: String(payload.accountHolderName).trim(),
      bankName: String(payload.bankName).trim(),
      branchName: payload.branchName ? String(payload.branchName).trim() : null,
      accountNumber,
      ifscCode: String(payload.ifscCode).trim().toUpperCase(),
      accountType: String(payload.accountType || 'SAVINGS').toUpperCase() === 'CURRENT' ? 'CURRENT' : 'SAVINGS',
      upiId: payload.upiId ? String(payload.upiId).trim() : null,
      panNumber: payload.panNumber ? String(payload.panNumber).trim().toUpperCase() : null,
      modifiedBy: actor.id,
    };
    if (payload.cancelledChequePath) data.cancelledChequePath = payload.cancelledChequePath;
    if (payload.passbookCopyPath) data.passbookCopyPath = payload.passbookCopyPath;

    let bank;
    if (existing) {
      await existing.update(data);
      bank = existing;
    } else {
      bank = await AgentBankDetail.create({ ...data, agentId, createdBy: actor.id });
    }

    await AgentBankDetailHistory.create({
      agentId,
      bankDetailId: bank.id,
      snapshotJson: this.formatBank(bank, { mask: false }),
      note: existing ? 'Bank details updated' : 'Bank details created',
      createdBy: actor.id,
    });

    await ActivityLog.create({
      entityType: 'agent_bank_detail',
      entityId: bank.id,
      action: existing ? 'BANK_DETAILS_UPDATED' : 'BANK_DETAILS_CREATED',
      details: JSON.stringify({ agentId }),
      createdBy: actor.id,
    }).catch(() => null);

    await notificationService.notifyAdmins({
      titleEn: 'Bank Details Updated',
      messageEn: `Agent #${agentId} updated bank account details.`,
      notificationType: 'bank_details_updated',
      referenceType: 'agent_bank_detail',
      referenceId: bank.id,
      linkPath: '/admin/wallet-redemptions',
      createdBy: actor.id,
    }, { includeSalesMembers: false });

    return this.formatBank(bank);
  }

  async creditCommission({ closedDealId, commissionPercent, commissionAmount, remarks }, adminUser) {
    const outcome = await sequelize.transaction(async (transaction) => {
      const deal = await ClosedDeal.findByPk(closedDealId, {
        include: [
          { model: User, as: 'customer', attributes: ['id', 'name'] },
          { model: User, as: 'agent', attributes: ['id', 'name'] },
          { model: Property, as: 'property', attributes: ['id', 'titleEn'] },
        ],
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!deal) throw fail('Closed deal not found.', 404, 'DEAL_NOT_FOUND');
      if (!deal.agentId) throw fail('No agent associated with this closed deal.', 400, 'NO_AGENT');
      if (deal.commissionStatus === 'CREDITED') {
        throw fail('Commission already credited for this deal.', 409, 'ALREADY_CREDITED');
      }

      const percent = commissionPercent != null
        ? Number(commissionPercent)
        : (deal.commissionPercent != null ? Number(deal.commissionPercent) : DEFAULT_COMMISSION_PERCENT);
      const saleAmount = money(deal.saleAmount);
      const amount = commissionAmount != null
        ? money(commissionAmount)
        : Math.round((saleAmount * percent) / 100 * 100) / 100;
      if (!(amount > 0)) throw fail('Commission amount must be greater than zero.', 400, 'INVALID_AMOUNT');

      const wallet = await this.ensureWallet(deal.agentId, { transaction, actorId: adminUser.id });
      await wallet.reload({ transaction, lock: transaction.LOCK.UPDATE });

      const tx = await WalletTransaction.create({
        transactionCode: nextCode('WTX'),
        walletId: wallet.id,
        agentId: deal.agentId,
        type: TX.COMMISSION_CREDIT,
        amount,
        status: 'COMPLETED',
        closedDealId: deal.id,
        remarks: remarks || `Commission credit for deal ${deal.dealCode}`,
        metaJson: {
          propertyTitle: deal.property?.titleEn || null,
          customerName: deal.customer?.name || null,
          commissionPercent: percent,
          saleAmount,
        },
        createdBy: adminUser.id,
        modifiedBy: adminUser.id,
      }, { transaction });

      await wallet.update({
        balance: money(wallet.balance) + amount,
        totalEarned: money(wallet.totalEarned) + amount,
        lastCreditAt: new Date(),
        modifiedBy: adminUser.id,
      }, { transaction });

      await deal.update({
        commissionPercent: percent,
        commissionAmount: amount,
        commissionStatus: 'CREDITED',
        commissionCreditedAt: new Date(),
        commissionCreditedBy: adminUser.id,
        modifiedBy: adminUser.id,
      }, { transaction });

      await ActivityLog.create({
        entityType: 'closed_deal',
        entityId: deal.id,
        action: 'COMMISSION_CREDITED',
        details: JSON.stringify({ amount, agentId: deal.agentId, transactionId: tx.id }),
        createdBy: adminUser.id,
      }, { transaction }).catch(() => null);

      return { deal, amount };
    });

    await notificationService.create({
      userId: outcome.deal.agentId,
      userRole: ROLES.AGENT,
      titleEn: 'Commission Credited',
      messageEn: `₹${outcome.amount.toLocaleString('en-IN')} commission credited to your wallet for deal ${outcome.deal.dealCode}.`,
      notificationType: 'wallet_commission_credited',
      referenceType: 'closed_deal',
      referenceId: outcome.deal.id,
      linkPath: '/mediator/wallet',
      createdBy: adminUser.id,
    });

    const wallet = await this.emitWallet(outcome.deal.agentId, 'commission_credited', {
      sound: 'commission_credited',
      amount: outcome.amount,
    });
    return { wallet, amount: outcome.amount, closedDealId: outcome.deal.id, commissionStatus: 'CREDITED' };
  }

  async manualCredit({ agentId, amount, remarks, incentiveType }, adminUser) {
    const creditAmount = money(amount);
    if (!(creditAmount > 0)) throw fail('Credit amount must be greater than zero.', 400, 'INVALID_AMOUNT');
    const agent = await User.findByPk(agentId);
    if (!agent || agent.role !== ROLES.AGENT) throw fail('Agent not found.', 404, 'AGENT_NOT_FOUND');

    const result = await sequelize.transaction(async (transaction) => {
      const wallet = await this.ensureWallet(agentId, { transaction, actorId: adminUser.id });
      await wallet.reload({ transaction, lock: transaction.LOCK.UPDATE });
      const tx = await WalletTransaction.create({
        transactionCode: nextCode('WTX'),
        walletId: wallet.id,
        agentId,
        type: TX.INCENTIVE_CREDIT,
        amount: creditAmount,
        status: 'COMPLETED',
        remarks: remarks || incentiveType || 'Manual incentive credit',
        metaJson: { incentiveType: incentiveType || 'SPECIAL_INCENTIVE' },
        createdBy: adminUser.id,
        modifiedBy: adminUser.id,
      }, { transaction });
      await wallet.update({
        balance: money(wallet.balance) + creditAmount,
        totalEarned: money(wallet.totalEarned) + creditAmount,
        lastCreditAt: new Date(),
        modifiedBy: adminUser.id,
      }, { transaction });
      return { tx };
    });

    await notificationService.create({
      userId: agentId,
      userRole: ROLES.AGENT,
      titleEn: 'Bonus Credited',
      messageEn: `₹${creditAmount.toLocaleString('en-IN')} bonus credited to your wallet${remarks ? `: ${remarks}` : '.'}`,
      notificationType: 'wallet_bonus_credited',
      referenceType: 'wallet_transaction',
      referenceId: result.tx.id,
      linkPath: '/mediator/wallet',
      createdBy: adminUser.id,
    });

    const wallet = await this.emitWallet(agentId, 'bonus_credited', {
      sound: 'commission_credited',
      amount: creditAmount,
    });
    return { wallet, transaction: this.formatTransaction(result.tx) };
  }

  async adjustWallet({ agentId, amount, remarks }, adminUser) {
    const adj = money(amount);
    if (!adj) throw fail('Adjustment amount is required.', 400, 'INVALID_AMOUNT');
    const result = await sequelize.transaction(async (transaction) => {
      const wallet = await this.ensureWallet(agentId, { transaction, actorId: adminUser.id });
      await wallet.reload({ transaction, lock: transaction.LOCK.UPDATE });
      const nextBalance = money(wallet.balance) + adj;
      if (nextBalance < money(wallet.pendingRedemption)) {
        throw fail('Adjustment would make available balance negative.', 400, 'INSUFFICIENT_BALANCE');
      }
      const tx = await WalletTransaction.create({
        transactionCode: nextCode('WTX'),
        walletId: wallet.id,
        agentId,
        type: adj < 0 ? TX.REVERSAL : TX.WALLET_ADJUSTMENT,
        amount: Math.abs(adj),
        status: 'COMPLETED',
        remarks: remarks || 'Wallet adjustment',
        metaJson: { signedAmount: adj },
        createdBy: adminUser.id,
        modifiedBy: adminUser.id,
      }, { transaction });
      await wallet.update({
        balance: nextBalance,
        totalEarned: money(wallet.totalEarned) + (adj > 0 ? adj : 0),
        lastCreditAt: adj > 0 ? new Date() : wallet.lastCreditAt,
        modifiedBy: adminUser.id,
      }, { transaction });
      return { tx };
    });
    const wallet = await this.emitWallet(agentId, 'wallet_adjusted', { amount: adj });
    return { wallet, transaction: this.formatTransaction(result.tx) };
  }

  async redeem({ amount, remarks }, agentUser) {
    const redeemAmount = money(amount);
    if (!(redeemAmount > 0)) throw fail('Redeem amount must be greater than zero.', 400, 'INVALID_AMOUNT');
    if (redeemAmount < MIN_REDEMPTION_AMOUNT) {
      throw fail(`Minimum redemption amount is ₹${MIN_REDEMPTION_AMOUNT.toLocaleString('en-IN')}.`, 400, 'MIN_REDEMPTION');
    }
    const bank = await AgentBankDetail.findOne({ where: { agentId: agentUser.id } });
    if (!bank) throw fail('Please add bank details before redeeming.', 400, 'BANK_REQUIRED');

    const result = await sequelize.transaction(async (transaction) => {
      const wallet = await this.ensureWallet(agentUser.id, { transaction, actorId: agentUser.id });
      await wallet.reload({ transaction, lock: transaction.LOCK.UPDATE });
      const available = money(wallet.balance) - money(wallet.pendingRedemption);
      if (redeemAmount > available) {
        throw fail('Redeem amount cannot exceed available wallet balance.', 400, 'INSUFFICIENT_BALANCE');
      }
      const request = await WalletRedemptionRequest.create({
        requestCode: nextCode('WRR'),
        agentId: agentUser.id,
        walletId: wallet.id,
        amount: redeemAmount,
        status: 'PENDING',
        remarks: remarks || null,
        bankSnapshotJson: this.formatBank(bank, { mask: false }),
        createdBy: agentUser.id,
        modifiedBy: agentUser.id,
      }, { transaction });
      await WalletTransaction.create({
        transactionCode: nextCode('WTX'),
        walletId: wallet.id,
        agentId: agentUser.id,
        type: TX.REDEMPTION_REQUEST,
        amount: redeemAmount,
        status: 'PENDING',
        redemptionRequestId: request.id,
        remarks: remarks || 'Redemption request submitted',
        createdBy: agentUser.id,
        modifiedBy: agentUser.id,
      }, { transaction });
      await wallet.update({
        pendingRedemption: money(wallet.pendingRedemption) + redeemAmount,
        modifiedBy: agentUser.id,
      }, { transaction });
      return { request };
    });

    await notificationService.create({
      userId: agentUser.id,
      userRole: ROLES.AGENT,
      titleEn: 'Redemption Submitted',
      messageEn: `Redemption request of ₹${redeemAmount.toLocaleString('en-IN')} submitted for approval.`,
      notificationType: 'wallet_redemption_submitted',
      referenceType: 'wallet_redemption',
      referenceId: result.request.id,
      linkPath: '/mediator/wallet',
      createdBy: agentUser.id,
    });
    await notificationService.notifyAdmins({
      titleEn: 'New Redemption Request',
      messageEn: `Agent ${agentUser.name || agentUser.id} requested ₹${redeemAmount.toLocaleString('en-IN')} redemption.`,
      notificationType: 'wallet_redemption_pending',
      referenceType: 'wallet_redemption',
      referenceId: result.request.id,
      linkPath: '/admin/wallet-redemptions',
      createdBy: agentUser.id,
    }, { includeSalesMembers: false });

    const wallet = await this.emitWallet(agentUser.id, 'redemption_submitted', {
      requestId: result.request.id,
      amount: redeemAmount,
    });
    return {
      wallet,
      request: {
        id: result.request.id,
        requestId: result.request.requestCode,
        amount: redeemAmount,
        status: 'PENDING',
      },
    };
  }

  formatRedemption(row) {
    const j = row.toJSON ? row.toJSON() : row;
    const bank = j.bankSnapshotJson || {};
    const wallet = j.wallet;
    return {
      id: j.id,
      requestId: j.requestCode,
      requestCode: j.requestCode,
      agentId: j.agentId,
      agent: j.agent ? { id: j.agent.id, name: j.agent.name, mobile: j.agent.mobile, memberId: j.agent.memberId } : null,
      walletBalance: wallet ? money(wallet.balance) : null,
      availableBalance: wallet ? Math.max(0, money(wallet.balance) - money(wallet.pendingRedemption)) : null,
      requestedAmount: money(j.amount),
      amount: money(j.amount),
      bankName: bank.bankName || null,
      accountNumber: maskAccount(bank.accountNumber),
      accountHolderName: bank.accountHolderName || null,
      ifscCode: bank.ifscCode || null,
      bankDetails: this.formatBank(bank, { mask: false }),
      remarks: j.remarks,
      adminRemarks: j.adminRemarks,
      status: j.status,
      requestDate: j.createdAt,
      reviewedAt: j.reviewedAt,
      settlementDate: j.settlementDate,
      createdAt: j.createdAt,
    };
  }

  async listRedemptions({ status, agentId, page = 1, pageSize = 50 } = {}) {
    const where = {};
    if (status) where.status = status;
    if (agentId) where.agentId = Number(agentId);
    const limit = Math.min(100, Math.max(1, Number(pageSize) || 50));
    const offset = (Math.max(1, Number(page) || 1) - 1) * limit;
    const { rows, count } = await WalletRedemptionRequest.findAndCountAll({
      where,
      include: [
        { model: User, as: 'agent', attributes: ['id', 'name', 'mobile', 'email', 'memberId'] },
        { model: AgentWallet, as: 'wallet' },
      ],
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });
    return {
      items: rows.map((r) => this.formatRedemption(r)),
      total: count,
      page: Math.max(1, Number(page) || 1),
      pageSize: limit,
      totalPages: Math.max(1, Math.ceil(count / limit)),
    };
  }

  async approveRedemption(requestId, { remarks }, adminUser) {
    const request = await WalletRedemptionRequest.findByPk(requestId);
    if (!request) throw fail('Redemption request not found.', 404, 'NOT_FOUND');
    if (request.status !== 'PENDING') throw fail('Only pending requests can be approved.', 400, 'INVALID_STATUS');
    await request.update({
      status: 'APPROVED',
      adminRemarks: remarks || request.adminRemarks,
      reviewedBy: adminUser.id,
      reviewedAt: new Date(),
      modifiedBy: adminUser.id,
    });
    await WalletTransaction.create({
      transactionCode: nextCode('WTX'),
      walletId: request.walletId,
      agentId: request.agentId,
      type: TX.REDEMPTION_APPROVED,
      amount: money(request.amount),
      status: 'APPROVED',
      redemptionRequestId: request.id,
      remarks: remarks || 'Redemption approved',
      createdBy: adminUser.id,
      modifiedBy: adminUser.id,
    });
    await notificationService.create({
      userId: request.agentId,
      userRole: ROLES.AGENT,
      titleEn: 'Withdrawal Approved',
      messageEn: 'Your payment will be received in 30 days.',
      titleTe: 'Withdrawal Approved',
      messageTe: 'Your payment will be received in 30 days.',
      notificationType: 'wallet_redemption_approved',
      referenceType: 'wallet_redemption',
      referenceId: request.id,
      linkPath: '/mediator/wallet',
      createdBy: adminUser.id,
    });
    await this.emitWallet(request.agentId, 'redemption_approved', {
      sound: 'redemption_approved',
      requestId: request.id,
    });
    return this.formatRedemption(await WalletRedemptionRequest.findByPk(request.id, {
      include: [
        { model: User, as: 'agent', attributes: ['id', 'name', 'mobile', 'memberId'] },
        { model: AgentWallet, as: 'wallet' },
      ],
    }));
  }

  async rejectRedemption(requestId, { remarks }, adminUser) {
    const result = await sequelize.transaction(async (transaction) => {
      const request = await WalletRedemptionRequest.findByPk(requestId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!request) throw fail('Redemption request not found.', 404, 'NOT_FOUND');
      if (!['PENDING', 'APPROVED'].includes(request.status)) {
        throw fail('Request cannot be rejected in current status.', 400, 'INVALID_STATUS');
      }
      const wallet = await AgentWallet.findByPk(request.walletId, { transaction, lock: transaction.LOCK.UPDATE });
      const amount = money(request.amount);
      await wallet.update({
        pendingRedemption: Math.max(0, money(wallet.pendingRedemption) - amount),
        modifiedBy: adminUser.id,
      }, { transaction });
      await request.update({
        status: 'REJECTED',
        adminRemarks: remarks || request.adminRemarks,
        reviewedBy: adminUser.id,
        reviewedAt: new Date(),
        modifiedBy: adminUser.id,
      }, { transaction });
      await WalletTransaction.create({
        transactionCode: nextCode('WTX'),
        walletId: request.walletId,
        agentId: request.agentId,
        type: TX.REDEMPTION_REJECTED,
        amount,
        status: 'REJECTED',
        redemptionRequestId: request.id,
        remarks: remarks || 'Redemption rejected',
        createdBy: adminUser.id,
        modifiedBy: adminUser.id,
      }, { transaction });
      return request;
    });

    await notificationService.create({
      userId: result.agentId,
      userRole: ROLES.AGENT,
      titleEn: 'Redemption Rejected',
      messageEn: `Your redemption of ₹${money(result.amount).toLocaleString('en-IN')} was rejected.${remarks ? ` ${remarks}` : ''}`,
      notificationType: 'wallet_redemption_rejected',
      referenceType: 'wallet_redemption',
      referenceId: result.id,
      linkPath: '/mediator/wallet',
      createdBy: adminUser.id,
    });
    await this.emitWallet(result.agentId, 'redemption_rejected', {
      sound: 'redemption_rejected',
      requestId: result.id,
    });
    return this.formatRedemption(await WalletRedemptionRequest.findByPk(result.id, {
      include: [
        { model: User, as: 'agent', attributes: ['id', 'name', 'mobile', 'memberId'] },
        { model: AgentWallet, as: 'wallet' },
      ],
    }));
  }

  async completeSettlement(requestId, { remarks }, adminUser) {
    const outcome = await sequelize.transaction(async (transaction) => {
      const request = await WalletRedemptionRequest.findByPk(requestId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!request) throw fail('Redemption request not found.', 404, 'NOT_FOUND');
      if (request.status !== 'APPROVED') {
        throw fail('Only approved redemptions can be settled.', 400, 'INVALID_STATUS');
      }
      const wallet = await AgentWallet.findByPk(request.walletId, { transaction, lock: transaction.LOCK.UPDATE });
      const amount = money(request.amount);
      if (money(wallet.balance) < amount) {
        throw fail('Wallet balance is insufficient for settlement.', 400, 'INSUFFICIENT_BALANCE');
      }
      await wallet.update({
        balance: money(wallet.balance) - amount,
        pendingRedemption: Math.max(0, money(wallet.pendingRedemption) - amount),
        totalRedeemed: money(wallet.totalRedeemed) + amount,
        lastRedemptionAt: new Date(),
        modifiedBy: adminUser.id,
      }, { transaction });
      await request.update({
        status: 'COMPLETED',
        adminRemarks: remarks || request.adminRemarks,
        settlementDate: new Date(),
        settledBy: adminUser.id,
        modifiedBy: adminUser.id,
      }, { transaction });
      await WalletSettlement.create({
        redemptionRequestId: request.id,
        agentId: request.agentId,
        amount,
        settledBy: adminUser.id,
        settledAt: new Date(),
        remarks: remarks || null,
        createdBy: adminUser.id,
        modifiedBy: adminUser.id,
      }, { transaction });
      await WalletTransaction.create({
        transactionCode: nextCode('WTX'),
        walletId: request.walletId,
        agentId: request.agentId,
        type: TX.SETTLEMENT_COMPLETED,
        amount,
        status: 'COMPLETED',
        redemptionRequestId: request.id,
        remarks: remarks || 'Settlement completed',
        createdBy: adminUser.id,
        modifiedBy: adminUser.id,
      }, { transaction });
      return { request, amount };
    });

    await notificationService.create({
      userId: outcome.request.agentId,
      userRole: ROLES.AGENT,
      titleEn: 'Settlement Completed',
      messageEn: `₹${outcome.amount.toLocaleString('en-IN')} has been settled to your bank account.`,
      notificationType: 'wallet_settlement_completed',
      referenceType: 'wallet_redemption',
      referenceId: outcome.request.id,
      linkPath: '/mediator/wallet',
      createdBy: adminUser.id,
    });
    await this.emitWallet(outcome.request.agentId, 'settlement_completed', {
      sound: 'settlement_completed',
      requestId: outcome.request.id,
      amount: outcome.amount,
    });
    return this.formatRedemption(await WalletRedemptionRequest.findByPk(outcome.request.id, {
      include: [
        { model: User, as: 'agent', attributes: ['id', 'name', 'mobile', 'memberId'] },
        { model: AgentWallet, as: 'wallet' },
      ],
    }));
  }

  async getAdminReports() {
    const wallets = await AgentWallet.findAll({
      include: [{ model: User, as: 'agent', attributes: ['id', 'name', 'mobile', 'memberId'] }],
    });
    const pendingDeals = await ClosedDeal.findAll({
      where: { commissionStatus: 'PENDING', agentId: { [Op.ne]: null } },
      include: [
        { model: User, as: 'agent', attributes: ['id', 'name'] },
        { model: Property, as: 'property', attributes: ['id', 'titleEn'] },
        { model: User, as: 'customer', attributes: ['id', 'name'] },
      ],
    });
    const redemptions = await WalletRedemptionRequest.findAll({
      where: { status: { [Op.in]: ['PENDING', 'APPROVED'] } },
    });
    const settlements = await WalletSettlement.findAll({
      include: [{
        model: WalletRedemptionRequest,
        as: 'redemption',
        include: [{ model: User, as: 'agent', attributes: ['id', 'name'] }],
      }],
      order: [['settledAt', 'DESC']],
      limit: 200,
    });

    const totalCommissionPaid = wallets.reduce((s, w) => s + money(w.totalEarned), 0);
    const totalWalletBalance = wallets.reduce((s, w) => s + money(w.balance), 0);
    const totalRedeemed = wallets.reduce((s, w) => s + money(w.totalRedeemed), 0);
    const pendingRedemption = redemptions.reduce((s, r) => s + money(r.amount), 0);
    const pendingCommission = pendingDeals.reduce((s, d) => {
      const pct = d.commissionPercent != null ? Number(d.commissionPercent) : DEFAULT_COMMISSION_PERCENT;
      const amt = d.commissionAmount != null
        ? money(d.commissionAmount)
        : Math.round((money(d.saleAmount) * pct) / 100 * 100) / 100;
      return s + amt;
    }, 0);

    const agentWise = wallets.map((w) => ({
      agentId: w.agentId,
      agentName: w.agent?.name || `Agent #${w.agentId}`,
      balance: money(w.balance),
      pendingRedemption: money(w.pendingRedemption),
      totalEarned: money(w.totalEarned),
      totalRedeemed: money(w.totalRedeemed),
    }));

    const monthlyMap = {};
    const credits = await WalletTransaction.findAll({
      where: { type: { [Op.in]: [TX.COMMISSION_CREDIT, TX.INCENTIVE_CREDIT] }, status: 'COMPLETED' },
      attributes: ['amount', 'createdAt', 'type'],
    });
    for (const c of credits) {
      const d = new Date(c.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyMap[key] = (monthlyMap[key] || 0) + money(c.amount);
    }

    return {
      summary: {
        totalCommissionPaid,
        pendingCommission,
        totalWalletBalance,
        pendingRedemption,
        totalRedeemed,
      },
      agentWiseCommission: agentWise,
      agentWiseSettlement: agentWise.map((a) => ({
        agentId: a.agentId,
        agentName: a.agentName,
        totalRedeemed: a.totalRedeemed,
      })),
      monthlyCommission: Object.entries(monthlyMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, amount]) => ({ month, amount })),
      pendingCommissionDeals: pendingDeals.map((d) => {
        const j = d.toJSON();
        const pct = j.commissionPercent != null ? Number(j.commissionPercent) : DEFAULT_COMMISSION_PERCENT;
        return {
          id: j.id,
          dealCode: j.dealCode,
          agent: j.agent,
          customer: j.customer,
          property: j.property?.titleEn,
          saleAmount: money(j.saleAmount),
          commissionPercent: pct,
          suggestedCommission: Math.round((money(j.saleAmount) * pct) / 100 * 100) / 100,
          commissionStatus: j.commissionStatus,
        };
      }),
      recentSettlements: settlements.map((s) => ({
        id: s.id,
        amount: money(s.amount),
        settledAt: s.settledAt,
        agent: s.redemption?.agent || null,
        remarks: s.remarks,
      })),
      config: this.getConfig(),
    };
  }

  async getAgentReports(agentId) {
    const wallet = await this.getAgentDashboard(agentId);
    const transactions = await this.listTransactions(agentId, { pageSize: 200 });
    const redemptions = await this.listRedemptions({ agentId, pageSize: 100 });
    const settlements = await WalletSettlement.findAll({
      where: { agentId },
      order: [['settledAt', 'DESC']],
      limit: 100,
    });
    return {
      wallet,
      statement: transactions.items,
      commissionHistory: transactions.items.filter(
        (t) => t.type === TX.COMMISSION_CREDIT || t.type === TX.INCENTIVE_CREDIT
      ),
      redemptionHistory: redemptions.items,
      settlementHistory: settlements.map((s) => ({
        id: s.id,
        amount: money(s.amount),
        settledAt: s.settledAt,
        remarks: s.remarks,
      })),
      config: this.getConfig(),
    };
  }
}

module.exports = new WalletService();
module.exports.TX = TX;
module.exports.DEFAULT_COMMISSION_PERCENT = DEFAULT_COMMISSION_PERCENT;
module.exports.MIN_REDEMPTION_AMOUNT = MIN_REDEMPTION_AMOUNT;
