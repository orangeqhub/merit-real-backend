'use strict';

const { Op } = require('sequelize');
const {
  PaymentReceipt,
  SaleCertificate,
  DocumentAccessLog,
  PurchaseRequest,
  PurchasePayment,
  BookingRequest,
  BookingPayment,
  Property,
  PropertyCategory,
  User,
  ActivityLog,
  sequelize,
} = require('../models');
const { ROLES } = require('../constants/roles');

const COMPANY = {
  name: 'Merit Real Solutions',
  address: 'Andhra Pradesh & Telangana, India',
  email: 'support@meritrealsolutions.com',
  phone: '+91 00000 00000',
  logoUrl: '/logo.png',
};

function pad(n, size = 5) {
  return String(n).padStart(size, '0');
}

function money(n) {
  return Number(n || 0);
}

class DocumentGenerationService {
  async nextPaymentReceiptNumber(transaction) {
    const year = new Date().getFullYear();
    const count = await PaymentReceipt.count({ transaction });
    return `MRS-PAY-${year}-${pad(count + 1)}`;
  }

  async nextSaleConfirmationNumber(transaction) {
    const year = new Date().getFullYear();
    const count = await SaleCertificate.count({ transaction });
    return `MRS-SC-${year}-${pad(count + 1)}`;
  }

  verificationCode(prefix) {
    return `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  }

  async logAccess({ documentType, documentId, action, userId, metaJson }) {
    await DocumentAccessLog.create({
      documentType,
      documentId,
      action,
      userId: userId || null,
      metaJson: metaJson || {},
      createdBy: userId || null,
      modifiedBy: userId || null,
    });
    await ActivityLog.create({
      entityType: documentType,
      entityId: documentId,
      action,
      details: metaJson ? JSON.stringify(metaJson) : null,
      createdBy: userId || null,
    });
  }

  async loadPropertyContext(propertyId, transaction) {
    return Property.findByPk(propertyId, {
      include: [{ model: PropertyCategory, as: 'category' }],
      transaction,
    });
  }

  async loadUser(userId, transaction) {
    if (!userId) return null;
    return User.findByPk(userId, { attributes: { exclude: ['password'] }, transaction });
  }

  formatPropertyBrief(property) {
    if (!property) return null;
    const details = property.detailsJson || {};
    return {
      id: property.id,
      name: property.titleEn,
      project: property.ventureName || null,
      type: property.category?.nameEn || property.transactionType || null,
      location: [property.locality, property.city, property.district, property.state]
        .filter(Boolean)
        .join(', ') || property.locationEn || null,
      surveyNumber: details.surveyNumber || details.surveyNo || null,
      unitNumber: details.plotNumber || details.flatNumber || details.villaNumber || details.unitNumber || null,
      area: property.area != null ? `${property.area} ${property.areaUnit || ''}`.trim() : null,
    };
  }

  formatCustomerBrief(customer) {
    if (!customer) return null;
    return {
      id: customer.id,
      name: customer.name,
      memberId: customer.memberId,
      mobile: customer.mobile,
      email: customer.email,
      address: [customer.address, customer.city, customer.district].filter(Boolean).join(', ') || null,
    };
  }

  formatAgentBrief(agent) {
    if (!agent) return null;
    return {
      id: agent.id,
      name: agent.name,
      memberId: agent.memberId,
      mobile: agent.mobile,
      email: agent.email,
      grade: agent.agentGrade || agent.agentGradeLabel || null,
    };
  }

  /**
   * Create a Payment Receipt for a single payment transaction (purchase or booking).
   */
  async createPaymentReceipt({
    customerId,
    propertyId,
    amount,
    totalPropertyAmount,
    totalAmountPaid,
    balanceAmount,
    paymentMethod,
    paymentReference,
    paymentDate,
    remarks,
    status,
    bookingRequestId = null,
    purchaseRequestId = null,
    purchasePaymentId = null,
    bookingPaymentId = null,
    agentId = null,
    createdBy = null,
    transaction = null,
  }) {
    const run = async (t) => {
      const receiptNumber = await this.nextPaymentReceiptNumber(t);
      const verificationCode = this.verificationCode('PAY');
      const receiptDate = new Date();
      const property = await this.loadPropertyContext(propertyId, t);
      const customer = await this.loadUser(customerId, t);
      const agent = await this.loadUser(agentId, t);

      const snapshot = {
        documentType: 'PAYMENT_RECEIPT',
        title: 'Payment Receipt',
        company: COMPANY,
        receiptNumber,
        receiptDate: receiptDate.toISOString(),
        verificationCode,
        customer: this.formatCustomerBrief(customer),
        property: this.formatPropertyBrief(property),
        agent: this.formatAgentBrief(agent),
        payment: {
          amount: money(amount),
          totalPropertyAmount: money(totalPropertyAmount),
          totalAmountPaid: money(totalAmountPaid),
          remainingBalance: money(balanceAmount),
          paymentMethod: paymentMethod || '—',
          paymentReference: paymentReference || null,
          paymentDate: (paymentDate || receiptDate).toISOString?.() || paymentDate,
        },
        bookingReference: bookingRequestId ? `BK-${bookingRequestId}` : null,
        purchaseReference: purchaseRequestId ? `PR-${purchaseRequestId}` : null,
        status: status === 'FULL' || status === 'FULLY_PAID' ? 'Full Payment' : 'Partial Payment',
        statusCode: status === 'FULL' || status === 'FULLY_PAID' ? 'FULL' : 'PARTIAL',
        remarks: remarks || null,
        authorizedSignatureArea: true,
        companySealArea: true,
        qrCodeData: verificationCode,
      };

      const receipt = await PaymentReceipt.create({
        receiptNumber,
        customerId,
        propertyId,
        bookingRequestId,
        purchaseRequestId,
        purchasePaymentId,
        bookingPaymentId,
        amount: money(amount),
        totalPropertyAmount: money(totalPropertyAmount),
        totalAmountPaid: money(totalAmountPaid),
        balanceAmount: money(balanceAmount),
        paymentMethod: paymentMethod || null,
        paymentReference: paymentReference || null,
        paymentDate: paymentDate || receiptDate,
        receiptDate,
        status: status === 'FULL' || status === 'FULLY_PAID' ? 'FULL' : 'PARTIAL',
        remarks: remarks || null,
        snapshotJson: snapshot,
        verificationCode,
        createdBy,
        modifiedBy: createdBy,
      }, { transaction: t });

      return receipt;
    };

    if (transaction) return run(transaction);
    return sequelize.transaction(run);
  }

  /**
   * Create Sale Certificate — only once per completed purchase.
   */
  async createSaleCertificate({
    purchase,
    property,
    customer,
    agent,
    saleDate,
    createdBy,
    transaction,
  }) {
    const existing = await SaleCertificate.findOne({
      where: { purchaseRequestId: purchase.id },
      transaction,
    });
    if (existing) return existing;

    const saleConfirmationNumber = await this.nextSaleConfirmationNumber(transaction);
    const verificationCode = this.verificationCode('SC');
    const generatedDate = new Date();
    const totalPaid = money(purchase.amountPaid);
    const totalAmount = money(purchase.finalSaleAmount || purchase.totalAmount);

    const snapshot = {
      documentType: 'SALE_CERTIFICATE',
      title: 'Property Sale Certificate',
      company: COMPANY,
      saleConfirmationNumber,
      certificateDate: generatedDate.toISOString(),
      verificationCode,
      customer: this.formatCustomerBrief(customer),
      property: this.formatPropertyBrief(property),
      agent: this.formatAgentBrief(agent),
      purchase: {
        bookingReference: purchase.bookingRequestId ? `BK-${purchase.bookingRequestId}` : null,
        purchaseReference: `PR-${purchase.id}`,
        purchaseDate: purchase.createdAt,
        saleDate: (saleDate || generatedDate).toISOString?.() || saleDate,
      },
      paymentSummary: {
        totalPropertyAmount: totalAmount,
        totalAmountPaid: totalPaid,
        paymentCompletionDate: purchase.paymentCompletedAt || saleDate || generatedDate,
        outstandingBalance: 0,
      },
      status: {
        propertyStatus: 'SOLD',
        purchaseStatus: 'COMPLETED',
      },
      declaration:
        'This is to certify that the above-mentioned property has been successfully sold to the customer named herein after completion of all required payments and verification of purchase documentation by Merit Real Solutions.',
      authorizedSignatureArea: true,
      companySealArea: true,
      qrCodeData: verificationCode,
      digitalVerificationNumber: verificationCode,
    };

    return SaleCertificate.create({
      saleConfirmationNumber,
      customerId: purchase.customerId,
      propertyId: purchase.propertyId,
      purchaseRequestId: purchase.id,
      agentId: purchase.assignedAgentId || null,
      saleDate: saleDate || generatedDate,
      generatedDate,
      status: 'ACTIVE',
      snapshotJson: snapshot,
      verificationCode,
      createdBy,
      modifiedBy: createdBy,
    }, { transaction });
  }

  formatPaymentReceipt(row) {
    if (!row) return null;
    const j = row.toJSON ? row.toJSON() : row;
    return {
      id: j.id,
      documentType: 'PAYMENT_RECEIPT',
      receiptId: j.id,
      receiptNumber: j.receiptNumber,
      receiptDate: j.receiptDate,
      amount: money(j.amount),
      status: j.status,
      purchaseRequestId: j.purchaseRequestId,
      bookingRequestId: j.bookingRequestId,
      propertyId: j.propertyId,
      customerId: j.customerId,
      verificationCode: j.verificationCode,
      createdAt: j.createdAt,
      ...(j.snapshotJson || {}),
    };
  }

  formatSaleCertificate(row) {
    if (!row) return null;
    const j = row.toJSON ? row.toJSON() : row;
    return {
      id: j.id,
      documentType: 'SALE_CERTIFICATE',
      certificateId: j.id,
      saleConfirmationNumber: j.saleConfirmationNumber,
      saleDate: j.saleDate,
      generatedDate: j.generatedDate,
      status: j.status,
      purchaseRequestId: j.purchaseRequestId,
      propertyId: j.propertyId,
      customerId: j.customerId,
      agentId: j.agentId,
      verificationCode: j.verificationCode,
      createdAt: j.createdAt,
      ...(j.snapshotJson || {}),
    };
  }

  async assertDocumentAccess(doc, actor) {
    if (!actor || actor.role === ROLES.ADMIN) return;
    if (actor.role === ROLES.CUSTOMER && doc.customerId !== actor.id) {
      const err = new Error('Access denied.');
      err.status = 403;
      throw err;
    }
    if (actor.role === ROLES.AGENT) {
      const purchase = doc.purchaseRequestId
        ? await PurchaseRequest.findByPk(doc.purchaseRequestId)
        : null;
      const booking = doc.bookingRequestId
        ? await BookingRequest.findByPk(doc.bookingRequestId)
        : null;
      const agentOk = (purchase && purchase.assignedAgentId === actor.id)
        || (booking && booking.assignedAgentId === actor.id)
        || (doc.agentId && doc.agentId === actor.id);
      if (!agentOk) {
        const err = new Error('Access denied.');
        err.status = 403;
        throw err;
      }
    }
  }

  async getPaymentReceipt(id, { actor = null, action = 'VIEW' } = {}) {
    const row = await PaymentReceipt.findByPk(Number(id));
    if (!row) {
      const err = new Error('Payment receipt not found.');
      err.status = 404;
      throw err;
    }
    await this.assertDocumentAccess(row, actor);
    if (actor && action) {
      await this.logAccess({
        documentType: 'PAYMENT_RECEIPT',
        documentId: row.id,
        action,
        userId: actor.id,
      });
    }
    return this.formatPaymentReceipt(row);
  }

  async getSaleCertificate(id, { actor = null, action = 'VIEW' } = {}) {
    const row = await SaleCertificate.findByPk(Number(id));
    if (!row) {
      const err = new Error('Sale certificate not found.');
      err.status = 404;
      throw err;
    }
    await this.assertDocumentAccess(row, actor);
    if (actor && action) {
      await this.logAccess({
        documentType: 'SALE_CERTIFICATE',
        documentId: row.id,
        action,
        userId: actor.id,
      });
    }
    return this.formatSaleCertificate(row);
  }

  async getSaleCertificateByPurchase(purchaseId, { actor = null } = {}) {
    const row = await SaleCertificate.findOne({ where: { purchaseRequestId: Number(purchaseId) } });
    if (!row) {
      const err = new Error('Sale certificate not found. Complete the purchase to generate it.');
      err.status = 404;
      throw err;
    }
    await this.assertDocumentAccess(row, actor);
    return this.formatSaleCertificate(row);
  }

  async listDocuments({ actor = null, purchaseRequestId = null, bookingRequestId = null } = {}) {
    const receiptWhere = {};
    const certWhere = {};

    if (actor?.role === ROLES.CUSTOMER) {
      receiptWhere.customerId = actor.id;
      certWhere.customerId = actor.id;
    } else if (actor?.role === ROLES.AGENT) {
      const purchases = await PurchaseRequest.findAll({
        where: { assignedAgentId: actor.id },
        attributes: ['id'],
      });
      const bookings = await BookingRequest.findAll({
        where: { assignedAgentId: actor.id },
        attributes: ['id'],
      });
      const pIds = purchases.map((p) => p.id);
      const bIds = bookings.map((b) => b.id);
      receiptWhere[Op.or] = [
        ...(pIds.length ? [{ purchaseRequestId: { [Op.in]: pIds } }] : []),
        ...(bIds.length ? [{ bookingRequestId: { [Op.in]: bIds } }] : []),
        { customerId: -1 }, // ensure empty OR doesn't match all
      ].filter(Boolean);
      if (!pIds.length && !bIds.length) {
        receiptWhere.id = -1;
      }
      certWhere.agentId = actor.id;
    }

    if (purchaseRequestId) {
      receiptWhere.purchaseRequestId = Number(purchaseRequestId);
      certWhere.purchaseRequestId = Number(purchaseRequestId);
    }
    if (bookingRequestId) {
      receiptWhere.bookingRequestId = Number(bookingRequestId);
    }

    const [receipts, certificates] = await Promise.all([
      PaymentReceipt.findAll({ where: receiptWhere, order: [['receiptDate', 'DESC']] }),
      SaleCertificate.findAll({ where: certWhere, order: [['generatedDate', 'DESC']] }),
    ]);

    return {
      paymentReceipts: receipts.map((r) => ({
        id: r.id,
        documentType: 'PAYMENT_RECEIPT',
        number: r.receiptNumber,
        date: r.receiptDate,
        amount: money(r.amount),
        status: r.status,
        purchaseRequestId: r.purchaseRequestId,
        bookingRequestId: r.bookingRequestId,
        propertyId: r.propertyId,
      })),
      saleCertificates: certificates.map((c) => ({
        id: c.id,
        documentType: 'SALE_CERTIFICATE',
        number: c.saleConfirmationNumber,
        date: c.generatedDate,
        saleDate: c.saleDate,
        status: c.status,
        purchaseRequestId: c.purchaseRequestId,
        propertyId: c.propertyId,
        agentId: c.agentId,
      })),
    };
  }

  async getDocumentStats() {
    const totalPaymentReceipts = await PaymentReceipt.count();
    const totalSaleCertificates = await SaleCertificate.count();
    const receipts = await PaymentReceipt.findAll({
      attributes: ['amount', 'receiptDate', 'propertyId', 'purchaseRequestId'],
    });

    const byMonth = {};
    for (const r of receipts) {
      const d = new Date(r.receiptDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      byMonth[key] = (byMonth[key] || 0) + money(r.amount);
    }

    const certificates = await SaleCertificate.findAll({
      include: [
        { model: Property, as: 'property', attributes: ['id', 'titleEn', 'ventureName'] },
        { model: User, as: 'agent', attributes: ['id', 'name'] },
        { model: PurchaseRequest, as: 'purchase', attributes: ['id', 'finalSaleAmount', 'amountPaid'] },
      ],
    });

    const byProject = {};
    const byAgent = {};
    for (const c of certificates) {
      const project = c.property?.ventureName || 'Unassigned Project';
      const amount = money(c.purchase?.finalSaleAmount || c.purchase?.amountPaid);
      byProject[project] = (byProject[project] || 0) + amount;
      const agentName = c.agent?.name || 'Unassigned';
      byAgent[agentName] = (byAgent[agentName] || 0) + amount;
    }

    return {
      totalPaymentReceipts,
      totalSaleCertificates,
      revenueByMonth: Object.entries(byMonth).sort().map(([name, value]) => ({ name, value })),
      revenueByProject: Object.entries(byProject).map(([name, value]) => ({ name, value })),
      revenueByAgent: Object.entries(byAgent).map(([name, value]) => ({ name, value })),
      completedSales: certificates.length,
    };
  }
}

module.exports = new DocumentGenerationService();
