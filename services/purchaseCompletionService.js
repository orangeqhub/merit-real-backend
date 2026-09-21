'use strict';

const { Op } = require('sequelize');
const {
  PurchaseRequest,
  PurchaseRequestHistory,
  PurchasePayment,
  PurchaseReceipt,
  ClosedDeal,
  SalesHistory,
  BookingRequest,
  BookingPayment,
  ExpressInterest,
  ExpressInterestHistory,
  Property,
  PropertyCategory,
  User,
  ActivityLog,
  sequelize,
} = require('../models');
const { ROLES } = require('../constants/roles');
const notificationService = require('./notificationService');
const documentGenerationService = require('./documentGenerationService');

const COMPANY = {
  name: 'Merit Real Solutions',
  address: 'Andhra Pradesh & Telangana, India',
  email: 'support@meritrealsolutions.com',
  phone: '+91 00000 00000',
  logoUrl: '/logo.png',
};

class PurchaseCompletionService {
  computePaymentStatus(totalAmount, amountPaid) {
    const total = Number(totalAmount || 0);
    const paid = Number(amountPaid || 0);
    if (paid <= 0) return 'PENDING';
    if (total > 0 && paid >= total) return 'FULLY_PAID';
    return 'PARTIAL';
  }

  pad(n, size = 5) {
    return String(n).padStart(size, '0');
  }

  async nextReceiptNumber(transaction) {
    const year = new Date().getFullYear();
    const count = await PurchaseReceipt.count({ transaction });
    return `MRS-RCP-${year}-${this.pad(count + 1)}`;
  }

  async nextDealCode(transaction) {
    const year = new Date().getFullYear();
    const count = await ClosedDeal.count({ transaction });
    return `MRS-CD-${year}-${this.pad(count + 1)}`;
  }

  assertNotLocked(row) {
    if (row.isLocked || row.status === 'COMPLETED') {
      const err = new Error('This purchase is locked and cannot be modified.');
      err.status = 409;
      err.code = 'PURCHASE_LOCKED';
      throw err;
    }
  }

  async markPropertySold(propertyId, transaction) {
    await Property.update(
      {
        status: 'SOLD',
        isFeatured: false,
        isTrending: false,
      },
      { where: { id: propertyId }, transaction }
    );
  }

  async logSalesEvent({
    purchaseRequestId,
    propertyId,
    customerId,
    agentId,
    eventType,
    fromStatus,
    toStatus,
    amount,
    note,
    metaJson,
    createdBy,
    transaction,
  }) {
    await SalesHistory.create({
      purchaseRequestId,
      propertyId,
      customerId,
      agentId: agentId || null,
      eventType,
      fromStatus: fromStatus || null,
      toStatus: toStatus || null,
      amount: amount != null ? amount : null,
      note: note || null,
      metaJson: metaJson || {},
      createdBy: createdBy || null,
      modifiedBy: createdBy || null,
    }, { transaction });
  }

  async logActivity(entityType, entityId, action, details, createdBy, transaction) {
    await ActivityLog.create({
      entityType,
      entityId,
      action,
      details,
      createdBy,
    }, { transaction });
  }

  purchaseDetailIncludes() {
    return [
      {
        model: PurchasePayment,
        as: 'payments',
        include: [{ model: User, as: 'recorder', attributes: ['id', 'name'] }],
        separate: true,
        order: [['paymentDate', 'DESC'], ['id', 'DESC']],
      },
      {
        model: PurchaseReceipt,
        as: 'receipts',
        separate: true,
        order: [['createdAt', 'DESC']],
      },
      { model: ClosedDeal, as: 'closedDeal' },
      {
        model: SalesHistory,
        as: 'salesHistory',
        separate: true,
        order: [['createdAt', 'ASC']],
      },
      { model: BookingRequest, as: 'bookingRequest', attributes: ['id', 'bookingDate', 'expiryDate', 'status', 'amountPaid', 'totalAmount'] },
    ];
  }

  async ensurePurchaseAmounts(row, transaction) {
    if (row.totalAmount != null && Number(row.totalAmount) > 0) return row;
    const property = await Property.findByPk(row.propertyId, { transaction });
    const price = Number(property?.price || 0);
    await row.update({
      totalAmount: price,
      finalSaleAmount: row.finalSaleAmount != null ? row.finalSaleAmount : price,
    }, { transaction });
    return row.reload({ transaction });
  }

  async recordPayment(purchaseId, adminUser, body = {}, file = null) {
    const row = await PurchaseRequest.findByPk(Number(purchaseId));
    if (!row) {
      const err = new Error('Purchase not found.');
      err.status = 404;
      throw err;
    }
    this.assertNotLocked(row);

    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      const err = new Error('Valid payment amount is required.');
      err.status = 400;
      throw err;
    }

    await this.ensurePurchaseAmounts(row);

    const paymentDate = body.paymentDate ? new Date(body.paymentDate) : new Date();
    const paymentMethod = String(body.paymentMethod || '').trim() || null;
    const paymentReference = String(body.paymentReference || body.reference || '').trim()
      || `PAY-PR-${row.id}-${Date.now().toString(36).toUpperCase()}`;
    const remarks = String(body.remarks || '').trim() || null;
    const proofPath = file ? `/uploads/booking-payments/${file.filename}` : null;
    let paymentReceiptId = null;
    let paymentReceiptNumber = null;

    await sequelize.transaction(async (transaction) => {
      const payment = await PurchasePayment.create({
        purchaseRequestId: row.id,
        amount,
        paymentDate,
        paymentMethod,
        paymentReference,
        remarks,
        proofPath,
        recordedBy: adminUser.id,
        createdBy: adminUser.id,
        modifiedBy: adminUser.id,
      }, { transaction });

      const nextPaid = Number(row.amountPaid || 0) + amount;
      const total = Number(row.totalAmount || 0);
      const paymentStatus = this.computePaymentStatus(total, nextPaid);
      const balance = Math.max(0, total - nextPaid);

      await row.update({
        amountPaid: nextPaid,
        paymentStatus,
        paymentMethod: paymentMethod || row.paymentMethod,
        paymentCompletedAt: paymentStatus === 'FULLY_PAID' ? new Date() : row.paymentCompletedAt,
        modifiedBy: adminUser.id,
      }, { transaction });

      await PurchaseRequestHistory.create({
        purchaseRequestId: row.id,
        fromStatus: row.status,
        toStatus: row.status,
        note: `Payment of ₹${amount.toLocaleString('en-IN')} recorded${paymentMethod ? ` via ${paymentMethod}` : ''}. Receipt will be generated.`,
        createdBy: adminUser.id,
      }, { transaction });

      const receipt = await documentGenerationService.createPaymentReceipt({
        customerId: row.customerId,
        propertyId: row.propertyId,
        amount,
        totalPropertyAmount: total,
        totalAmountPaid: nextPaid,
        balanceAmount: balance,
        paymentMethod,
        paymentReference,
        paymentDate,
        remarks,
        status: paymentStatus === 'FULLY_PAID' ? 'FULL' : 'PARTIAL',
        bookingRequestId: row.bookingRequestId || null,
        purchaseRequestId: row.id,
        purchasePaymentId: payment.id,
        agentId: row.assignedAgentId,
        createdBy: adminUser.id,
        transaction,
      });
      paymentReceiptId = receipt.id;
      paymentReceiptNumber = receipt.receiptNumber;

      await this.logSalesEvent({
        purchaseRequestId: row.id,
        propertyId: row.propertyId,
        customerId: row.customerId,
        agentId: row.assignedAgentId,
        eventType: 'PAYMENT_RECORDED',
        amount,
        note: remarks || `Payment recorded: ₹${amount}`,
        metaJson: { paymentMethod, paymentStatus, paymentReceiptId, paymentReceiptNumber },
        createdBy: adminUser.id,
        transaction,
      });

      await this.logSalesEvent({
        purchaseRequestId: row.id,
        propertyId: row.propertyId,
        customerId: row.customerId,
        agentId: row.assignedAgentId,
        eventType: 'PAYMENT_RECEIPT_GENERATED',
        amount,
        note: `Payment receipt ${paymentReceiptNumber} generated`,
        metaJson: { paymentReceiptId },
        createdBy: adminUser.id,
        transaction,
      });
    });

    const interestDecisionService = require('./interestDecisionService');
    const formatted = await interestDecisionService.getPurchaseById(row.id);
    const propertyTitle = formatted.propertyName || `Property #${row.propertyId}`;

    await notificationService.create({
      userId: row.customerId,
      userRole: ROLES.CUSTOMER,
      titleEn: paymentStatusLabel(formatted.paymentStatus),
      messageEn: `A payment of ₹${amount.toLocaleString('en-IN')} was recorded for "${propertyTitle}". Receipt ${paymentReceiptNumber} is ready.`,
      notificationType: formatted.paymentStatus === 'FULLY_PAID' ? 'purchase_fully_paid' : 'purchase_partial_payment',
      referenceType: 'payment_receipt',
      referenceId: paymentReceiptId,
      linkPath: '/buyer/documents',
      createdBy: adminUser.id,
    });

    await notificationService.create({
      userId: row.customerId,
      userRole: ROLES.CUSTOMER,
      titleEn: 'Payment Receipt Generated',
      messageEn: `Payment receipt ${paymentReceiptNumber} is available to view, download, or print.`,
      notificationType: 'payment_receipt_generated',
      referenceType: 'payment_receipt',
      referenceId: paymentReceiptId,
      linkPath: `/buyer/documents/payment-receipts/${paymentReceiptId}`,
      createdBy: adminUser.id,
    });

    if (row.assignedAgentId) {
      await notificationService.create({
        userId: row.assignedAgentId,
        userRole: ROLES.AGENT,
        titleEn: 'Purchase Payment Recorded',
        messageEn: `Payment recorded for purchase #${row.id} (${propertyTitle}). Receipt ${paymentReceiptNumber}.`,
        notificationType: 'purchase_payment_agent',
        referenceType: 'payment_receipt',
        referenceId: paymentReceiptId,
        linkPath: '/mediator/documents',
        createdBy: adminUser.id,
      });
    }

    return { ...formatted, latestPaymentReceiptId: paymentReceiptId, latestPaymentReceiptNumber: paymentReceiptNumber };
  }

  async completePurchase(purchaseId, adminUser, body = {}) {
    const row = await PurchaseRequest.findByPk(Number(purchaseId), {
      include: [
        { model: Property, as: 'property', include: [{ model: PropertyCategory, as: 'category' }] },
        { model: User, as: 'customer', attributes: { exclude: ['password'] } },
        { model: User, as: 'assignedAgent', attributes: { exclude: ['password'] } },
        { model: BookingRequest, as: 'bookingRequest' },
      ],
    });
    if (!row) {
      const err = new Error('Purchase not found.');
      err.status = 404;
      throw err;
    }
    if (row.status === 'COMPLETED' && row.isLocked) {
      const err = new Error('Purchase is already completed and locked.');
      err.status = 409;
      throw err;
    }
    if (row.status === 'REJECTED') {
      const err = new Error('Rejected purchases cannot be completed.');
      err.status = 400;
      throw err;
    }

    await this.ensurePurchaseAmounts(row);

    const finalSaleAmount = body.finalSaleAmount != null
      ? Number(body.finalSaleAmount)
      : Number(row.finalSaleAmount != null ? row.finalSaleAmount : row.totalAmount || 0);
    if (!Number.isFinite(finalSaleAmount) || finalSaleAmount < 0) {
      const err = new Error('Valid final sale amount is required.');
      err.status = 400;
      throw err;
    }

    const taxAmount = body.taxAmount != null ? Number(body.taxAmount) : Number(row.taxAmount || 0);
    const discountAmount = body.discountAmount != null ? Number(body.discountAmount) : Number(row.discountAmount || 0);
    const paymentMethod = String(body.paymentMethod || row.paymentMethod || 'Manual Settlement').trim();
    const saleDate = body.saleDate ? new Date(body.saleDate) : new Date();
    const note = String(body.remarks || body.note || 'Purchase completed — payment confirmed, property sold.').trim();
    const forceComplete = body.forceComplete === true || body.forceComplete === 'true';

    const amountPaid = Number(row.amountPaid || 0);
    if (!forceComplete && amountPaid + 0.009 < finalSaleAmount) {
      const err = new Error('Payment is not fully settled. Record remaining payment or use force complete with confirmation.');
      err.status = 400;
      err.code = 'PAYMENT_INCOMPLETE';
      throw err;
    }

    const fromStatus = row.status;
    let certificateId = null;
    let saleConfirmationNumber = null;
    let dealId = null;

    await sequelize.transaction(async (transaction) => {
      const paidNow = Math.max(amountPaid, finalSaleAmount);
      await row.update({
        status: 'COMPLETED',
        paymentStatus: 'FULLY_PAID',
        amountPaid: paidNow,
        totalAmount: finalSaleAmount,
        finalSaleAmount,
        taxAmount: Number.isFinite(taxAmount) ? taxAmount : 0,
        discountAmount: Number.isFinite(discountAmount) ? discountAmount : 0,
        paymentMethod,
        saleDate,
        paymentCompletedAt: row.paymentCompletedAt || saleDate,
        completedAt: new Date(),
        completedBy: adminUser.id,
        isLocked: true,
        dealStatus: 'CLOSED',
        adminRemarks: body.adminRemarks != null ? String(body.adminRemarks).trim() : row.adminRemarks,
        modifiedBy: adminUser.id,
      }, { transaction });

      await PurchaseRequestHistory.create({
        purchaseRequestId: row.id,
        fromStatus,
        toStatus: 'COMPLETED',
        note,
        createdBy: adminUser.id,
      }, { transaction });

      await this.markPropertySold(row.propertyId, transaction);

      const interest = await ExpressInterest.findByPk(row.expressInterestId, { transaction });
      if (interest && interest.status !== 'CLOSED') {
        const interestFrom = interest.status;
        await interest.update({
          status: 'CLOSED',
          modifiedBy: adminUser.id,
        }, { transaction });
        await ExpressInterestHistory.create({
          interestId: interest.id,
          fromStatus: interestFrom,
          toStatus: 'CLOSED',
          note: `Purchase #${row.id} completed — property sold`,
          createdBy: adminUser.id,
        }, { transaction });
      }

      await this.logSalesEvent({
        purchaseRequestId: row.id,
        propertyId: row.propertyId,
        customerId: row.customerId,
        agentId: row.assignedAgentId,
        eventType: 'PURCHASE_COMPLETED',
        fromStatus,
        toStatus: 'COMPLETED',
        amount: finalSaleAmount,
        note,
        metaJson: { paymentMethod, source: row.source },
        createdBy: adminUser.id,
        transaction,
      });

      await this.logSalesEvent({
        purchaseRequestId: row.id,
        propertyId: row.propertyId,
        customerId: row.customerId,
        agentId: row.assignedAgentId,
        eventType: 'PROPERTY_SOLD',
        toStatus: 'SOLD',
        amount: finalSaleAmount,
        note: 'Property marked as SOLD',
        createdBy: adminUser.id,
        transaction,
      });

      let closed = await ClosedDeal.findOne({ where: { purchaseRequestId: row.id }, transaction });
      if (!closed) {
        const dealCode = await this.nextDealCode(transaction);
        closed = await ClosedDeal.create({
          dealCode,
          purchaseRequestId: row.id,
          bookingRequestId: row.bookingRequestId || null,
          customerId: row.customerId,
          agentId: row.assignedAgentId || null,
          propertyId: row.propertyId,
          saleAmount: finalSaleAmount,
          bookingDate: row.bookingRequest?.bookingDate || null,
          purchaseDate: saleDate,
          commissionStatus: 'PENDING',
          dealStatus: 'CLOSED',
          createdBy: adminUser.id,
          modifiedBy: adminUser.id,
        }, { transaction });
      }
      dealId = closed.id;

      // Reload row with updated values for certificate
      await row.reload({ transaction });
      const property = row.property
        || await Property.findByPk(row.propertyId, {
          include: [{ model: PropertyCategory, as: 'category' }],
          transaction,
        });
      const customer = row.customer
        || await User.findByPk(row.customerId, { attributes: { exclude: ['password'] }, transaction });
      const agent = row.assignedAgent
        || (row.assignedAgentId
          ? await User.findByPk(row.assignedAgentId, { attributes: { exclude: ['password'] }, transaction })
          : null);

      const certificate = await documentGenerationService.createSaleCertificate({
        purchase: row,
        property,
        customer,
        agent,
        saleDate,
        createdBy: adminUser.id,
        transaction,
      });
      certificateId = certificate.id;
      saleConfirmationNumber = certificate.saleConfirmationNumber;

      // Keep legacy PurchaseReceipt SALE row for backward compatibility with old receipt endpoints
      const legacyNumber = await this.nextReceiptNumber(transaction);
      const snapshot = await this.buildReceiptSnapshot(row, {
        receiptNumber: legacyNumber,
        receiptType: 'SALE',
        receiptDate: saleDate,
        finalSaleAmount,
        taxAmount,
        discountAmount,
        paymentMethod,
        transaction,
      });
      await PurchaseReceipt.create({
        purchaseRequestId: row.id,
        receiptNumber: legacyNumber,
        receiptType: 'SALE',
        receiptDate: saleDate,
        snapshotJson: {
          ...snapshot,
          title: 'Property Sale Certificate',
          saleConfirmationNumber,
          documentType: 'SALE_CERTIFICATE',
        },
        generatedBy: adminUser.id,
        createdBy: adminUser.id,
        modifiedBy: adminUser.id,
      }, { transaction });

      await this.logSalesEvent({
        purchaseRequestId: row.id,
        propertyId: row.propertyId,
        customerId: row.customerId,
        agentId: row.assignedAgentId,
        eventType: 'SALE_CERTIFICATE_GENERATED',
        note: `Sale certificate ${saleConfirmationNumber} generated`,
        metaJson: { certificateId, saleConfirmationNumber },
        createdBy: adminUser.id,
        transaction,
      });

      await this.logActivity(
        'PurchaseRequest',
        row.id,
        'COMPLETED',
        note,
        adminUser.id,
        transaction
      );
    });

    const interestDecisionService = require('./interestDecisionService');
    const formatted = await interestDecisionService.getPurchaseById(row.id);
    const propertyTitle = formatted.propertyName || `Property #${row.propertyId}`;

    await notificationService.create({
      userId: row.customerId,
      userRole: ROLES.CUSTOMER,
      titleEn: 'Payment Completed',
      messageEn: `Payment for "${propertyTitle}" is fully settled.`,
      notificationType: 'purchase_payment_completed',
      referenceType: 'purchase_request',
      referenceId: row.id,
      linkPath: '/buyer/purchases',
      createdBy: adminUser.id,
    });

    await notificationService.create({
      userId: row.customerId,
      userRole: ROLES.CUSTOMER,
      titleEn: 'Property Purchase Confirmed',
      messageEn: `Your purchase of "${propertyTitle}" is confirmed. The property is now sold to you.`,
      notificationType: 'purchase_confirmed',
      referenceType: 'purchase_request',
      referenceId: row.id,
      linkPath: '/buyer/purchases',
      createdBy: adminUser.id,
    });

    await notificationService.create({
      userId: row.customerId,
      userRole: ROLES.CUSTOMER,
      titleEn: 'Sale Certificate Generated',
      messageEn: `Property Sale Certificate ${saleConfirmationNumber} is ready to view, download, or print.`,
      notificationType: 'sale_certificate_generated',
      referenceType: 'sale_certificate',
      referenceId: certificateId,
      linkPath: `/buyer/documents/sale-certificates/${certificateId}`,
      createdBy: adminUser.id,
    });

    await notificationService.create({
      userId: row.customerId,
      userRole: ROLES.CUSTOMER,
      titleEn: 'Property Successfully Sold',
      messageEn: `"${propertyTitle}" has been marked as sold under your purchase.`,
      notificationType: 'property_sold_customer',
      referenceType: 'purchase_request',
      referenceId: row.id,
      linkPath: '/buyer/purchases',
      createdBy: adminUser.id,
    });

    if (row.assignedAgentId) {
      await notificationService.create({
        userId: row.assignedAgentId,
        userRole: ROLES.AGENT,
        titleEn: 'Closed Deal Achieved',
        messageEn: `Closed deal for "${propertyTitle}" (Purchase #${row.id}).`,
        notificationType: 'closed_deal_achieved',
        referenceType: 'closed_deal',
        referenceId: dealId,
        linkPath: '/mediator/closed-deals',
        createdBy: adminUser.id,
      });
      await notificationService.create({
        userId: row.assignedAgentId,
        userRole: ROLES.AGENT,
        titleEn: 'Sale Certificate Available',
        messageEn: `Sale certificate ${saleConfirmationNumber} generated for "${propertyTitle}".`,
        notificationType: 'sale_certificate_agent',
        referenceType: 'sale_certificate',
        referenceId: certificateId,
        linkPath: '/mediator/documents',
        createdBy: adminUser.id,
      });
    }

    await notificationService.notifyAdmins({
      titleEn: 'Purchase Completed',
      messageEn: `Purchase #${row.id} for "${propertyTitle}" completed. Sale amount ₹${Number(finalSaleAmount).toLocaleString('en-IN')}.`,
      notificationType: 'purchase_completed_admin',
      referenceType: 'purchase_request',
      referenceId: row.id,
      linkPath: '/admin/purchases',
      createdBy: adminUser.id,
    });

    await notificationService.notifyAdmins({
      titleEn: 'Sale Certificate Generated',
      messageEn: `Sale certificate ${saleConfirmationNumber} generated for purchase #${row.id}.`,
      notificationType: 'sale_certificate_admin',
      referenceType: 'sale_certificate',
      referenceId: certificateId,
      linkPath: '/admin/documents',
      createdBy: adminUser.id,
    });

    await notificationService.notifyAdmins({
      titleEn: 'Property Sold Successfully',
      messageEn: `"${propertyTitle}" marked as SOLD via purchase #${row.id}.`,
      notificationType: 'property_sold_admin',
      referenceType: 'purchase_request',
      referenceId: row.id,
      linkPath: '/admin/purchases',
      createdBy: adminUser.id,
    });

    if (row.assignedAgentId && dealId) {
      await notificationService.notifyAdmins({
        titleEn: 'Commission Credit Pending',
        messageEn: `Closed deal for "${propertyTitle}" awaits commission credit to the assigned agent.`,
        notificationType: 'commission_credit_pending',
        referenceType: 'closed_deal',
        referenceId: dealId,
        linkPath: '/admin/closed-deals',
        createdBy: adminUser.id,
      });
    }

    return formatted;
  }

  async buildReceiptSnapshot(row, {
    receiptNumber,
    receiptType,
    receiptDate,
    finalSaleAmount,
    taxAmount,
    discountAmount,
    paymentMethod,
    transaction,
  }) {
    const property = row.property
      || await Property.findByPk(row.propertyId, {
        include: [{ model: PropertyCategory, as: 'category' }],
        transaction,
      });
    const customer = row.customer
      || await User.findByPk(row.customerId, { attributes: { exclude: ['password'] }, transaction });
    const agent = row.assignedAgent
      || (row.assignedAgentId
        ? await User.findByPk(row.assignedAgentId, { attributes: { exclude: ['password'] }, transaction })
        : null);

    const purchasePayments = await PurchasePayment.findAll({
      where: { purchaseRequestId: row.id },
      order: [['paymentDate', 'ASC']],
      transaction,
    });

    let bookingPayments = [];
    if (row.bookingRequestId) {
      bookingPayments = await BookingPayment.findAll({
        where: { bookingRequestId: row.bookingRequestId },
        order: [['paymentDate', 'ASC']],
        transaction,
      });
    }

    const totalPaid = Number(row.amountPaid || finalSaleAmount || 0);
    const propertyAmount = Number(finalSaleAmount || row.totalAmount || 0);
    const tax = Number(taxAmount || 0);
    const discount = Number(discountAmount || 0);

    return {
      company: COMPANY,
      title: receiptType === 'PAYMENT' ? 'Payment Receipt' : 'Property Purchase Receipt',
      receiptNumber,
      receiptType,
      receiptDate: receiptDate.toISOString(),
      customer: {
        id: customer?.id,
        name: customer?.name,
        mobile: customer?.mobile,
        email: customer?.email,
        memberId: customer?.memberId,
        address: [customer?.address, customer?.city, customer?.district].filter(Boolean).join(', ') || null,
      },
      property: {
        id: property?.id,
        name: property?.titleEn,
        project: property?.ventureName || null,
        type: property?.category?.nameEn || property?.transactionType || null,
        location: [property?.locality, property?.city, property?.district, property?.state]
          .filter(Boolean)
          .join(', ') || property?.locationEn || null,
      },
      agent: agent
        ? {
            id: agent.id,
            name: agent.name,
            mobile: agent.mobile,
            email: agent.email,
            memberId: agent.memberId,
            grade: agent.agentGrade || null,
          }
        : null,
      bookingReference: row.bookingRequestId ? `BK-${row.bookingRequestId}` : null,
      purchaseReference: `PR-${row.id}`,
      paymentSummary: {
        propertyAmount,
        taxes: tax,
        discount,
        totalAmountPaid: totalPaid,
        paymentMethod: paymentMethod || row.paymentMethod || '—',
        paymentDate: (row.paymentCompletedAt || receiptDate).toISOString(),
        balanceAmount: 0,
      },
      status: {
        payment: 'Payment Completed',
        property: 'Property Sold',
        deal: 'CLOSED',
      },
      payments: [
        ...bookingPayments.map((p) => ({
          source: 'booking',
          amount: Number(p.amount),
          paymentDate: p.paymentDate,
          remarks: p.remarks,
        })),
        ...purchasePayments.map((p) => ({
          source: 'purchase',
          amount: Number(p.amount),
          paymentDate: p.paymentDate,
          paymentMethod: p.paymentMethod,
          remarks: p.remarks,
        })),
      ],
      authorizedSignatureArea: true,
      companySealArea: true,
    };
  }

  async getReceipt(purchaseId, { actor = null, receiptType = null } = {}) {
    const interestDecisionService = require('./interestDecisionService');
    await interestDecisionService.getPurchaseById(purchaseId, { actor });

    const where = { purchaseRequestId: Number(purchaseId) };
    if (receiptType) where.receiptType = String(receiptType).toUpperCase();

    let receipt = await PurchaseReceipt.findOne({
      where,
      order: [['createdAt', 'DESC']],
    });

    if (!receipt && !receiptType) {
      receipt = await PurchaseReceipt.findOne({
        where: { purchaseRequestId: Number(purchaseId) },
        order: [['createdAt', 'DESC']],
      });
    }

    if (!receipt) {
      const err = new Error('Receipt not found. Complete the purchase to generate receipts.');
      err.status = 404;
      throw err;
    }

    return {
      id: receipt.id,
      purchaseRequestId: receipt.purchaseRequestId,
      receiptNumber: receipt.receiptNumber,
      receiptType: receipt.receiptType,
      receiptDate: receipt.receiptDate,
      generatedAt: receipt.createdAt,
      ...receipt.snapshotJson,
    };
  }

  async listReceipts(purchaseId, { actor = null } = {}) {
    const interestDecisionService = require('./interestDecisionService');
    await interestDecisionService.getPurchaseById(purchaseId, { actor });
    const rows = await PurchaseReceipt.findAll({
      where: { purchaseRequestId: Number(purchaseId) },
      order: [['createdAt', 'DESC']],
    });
    return rows.map((r) => ({
      id: r.id,
      receiptNumber: r.receiptNumber,
      receiptType: r.receiptType,
      receiptDate: r.receiptDate,
      createdAt: r.createdAt,
    }));
  }

  async listClosedDeals(filters = {}, { actor = null } = {}) {
    const where = {};
    if (actor?.role === ROLES.AGENT) where.agentId = actor.id;
    if (filters.agentId) where.agentId = Number(filters.agentId);
    if (filters.customerId) where.customerId = Number(filters.customerId);

    const page = Math.max(1, Number(filters.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(filters.pageSize) || 50));

    const { rows, count } = await ClosedDeal.findAndCountAll({
      where,
      include: [
        { model: User, as: 'customer', attributes: ['id', 'name', 'mobile', 'email', 'memberId'] },
        { model: User, as: 'agent', attributes: ['id', 'name', 'mobile', 'email', 'memberId', 'agentGrade'] },
        {
          model: Property,
          as: 'property',
          attributes: ['id', 'titleEn', 'ventureName', 'city', 'district', 'price'],
        },
        { model: PurchaseRequest, as: 'purchase', attributes: ['id', 'status', 'paymentStatus', 'source'] },
      ],
      order: [['purchaseDate', 'DESC']],
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });

    return {
      items: rows.map((r) => {
        const j = r.toJSON();
        return {
          id: j.id,
          dealId: j.dealCode,
          dealCode: j.dealCode,
          purchaseRequestId: j.purchaseRequestId,
          bookingRequestId: j.bookingRequestId,
          customerName: j.customer?.name || null,
          customer: j.customer,
          property: j.property?.titleEn || null,
          propertyId: j.propertyId,
          propertyDetails: j.property,
          agent: j.agent,
          saleAmount: Number(j.saleAmount || 0),
          agentId: j.agentId,
          bookingDate: j.bookingDate,
          purchaseDate: j.purchaseDate,
          commissionPercent: j.commissionPercent != null ? Number(j.commissionPercent) : 2,
          commissionAmount: j.commissionAmount != null ? Number(j.commissionAmount) : null,
          suggestedCommission: Math.round(
            (Number(j.saleAmount || 0) * (j.commissionPercent != null ? Number(j.commissionPercent) : 2)) / 100 * 100
          ) / 100,
          commissionStatus: j.commissionStatus,
          commissionCreditedAt: j.commissionCreditedAt,
          dealStatus: j.dealStatus,
          purchaseStatus: j.purchase?.status || null,
          paymentStatus: j.purchase?.paymentStatus || null,
          source: j.purchase?.source || null,
          createdAt: j.createdAt,
        };
      }),
      total: count,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(count / pageSize)),
    };
  }

  async getAgentDashboardStats(agentId) {
    const leadsResult = await ExpressInterest.findAll({
      where: {
        [Op.or]: [{ assignedAgentId: agentId }, { referralAgentId: agentId }],
      },
      attributes: ['id', 'status'],
    });
    const totalLeads = leadsResult.length;
    const activeLeads = leadsResult.filter((l) => !['CLOSED', 'REJECTED'].includes(l.status)).length;

    const reserved = await BookingRequest.count({
      where: {
        assignedAgentId: agentId,
        status: {
          [Op.in]: [
            'BOOKING_REQUESTED',
            'BOOKING_VERIFICATION',
            'BOOKING_APPROVED',
            'PAYMENT_PENDING',
            'PARTIALLY_PAID',
            'FULLY_PAID',
            'BOOKING_CONFIRMED',
          ],
        },
      },
    });

    const closedDeals = await ClosedDeal.count({ where: { agentId } });
    const salesSum = await ClosedDeal.sum('saleAmount', { where: { agentId } });

    return {
      totalLeads,
      activeLeads,
      reservedProperties: reserved,
      closedDeals,
      totalSalesValue: Number(salesSum || 0),
      agentId,
    };
  }

  async getSalesReports({ actor = null } = {}) {
    const completed = await PurchaseRequest.findAll({
      where: { status: 'COMPLETED' },
      include: [
        {
          model: Property,
          as: 'property',
          include: [{ model: PropertyCategory, as: 'category' }],
        },
        { model: User, as: 'assignedAgent', attributes: ['id', 'name'] },
        { model: User, as: 'customer', attributes: ['id', 'name'] },
        { model: ClosedDeal, as: 'closedDeal' },
      ],
      order: [['saleDate', 'DESC']],
    });

    const totalPurchases = completed.length;
    const totalRevenue = completed.reduce((s, p) => s + Number(p.finalSaleAmount || p.totalAmount || 0), 0);
    const propertiesSold = new Set(completed.map((p) => p.propertyId)).size;

    const byProject = {};
    const byType = {};
    const byMonth = {};
    const byYear = {};

    for (const p of completed) {
      const amount = Number(p.finalSaleAmount || p.totalAmount || 0);
      const project = p.property?.ventureName || 'Unassigned Project';
      const type = p.property?.category?.nameEn || 'Other';
      const d = p.saleDate ? new Date(p.saleDate) : new Date(p.completedAt || p.updatedAt);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const yearKey = String(d.getFullYear());

      byProject[project] = (byProject[project] || 0) + amount;
      byType[type] = (byType[type] || 0) + amount;
      byMonth[monthKey] = (byMonth[monthKey] || 0) + amount;
      byYear[yearKey] = (byYear[yearKey] || 0) + amount;
    }

    const inventory = await Property.findAll({ attributes: ['id', 'status'] });
    const openInventory = inventory.filter((p) => p.status === 'ACTIVE').length;
    const reservedInventory = inventory.filter((p) => p.status === 'BOOKED').length;
    const soldInventory = inventory.filter((p) => p.status === 'SOLD').length;

    const closedDeals = await ClosedDeal.findAll({
      include: [
        { model: User, as: 'agent', attributes: ['id', 'name'] },
        { model: User, as: 'customer', attributes: ['id', 'name'] },
      ],
    });

    const agentPerf = {};
    for (const d of closedDeals) {
      const key = d.agentId || 'unassigned';
      if (!agentPerf[key]) {
        agentPerf[key] = {
          agentId: d.agentId,
          agentName: d.agent?.name || 'Unassigned',
          closedDeals: 0,
          salesValue: 0,
          customers: new Set(),
        };
      }
      agentPerf[key].closedDeals += 1;
      agentPerf[key].salesValue += Number(d.saleAmount || 0);
      agentPerf[key].customers.add(d.customerId);
    }

    const agentReports = Object.values(agentPerf).map((a) => ({
      agentId: a.agentId,
      agentName: a.agentName,
      closedDeals: a.closedDeals,
      salesValue: a.salesValue,
      customerCount: a.customers.size,
      conversionRate: null,
    }));

    // Enrich conversion rate with lead counts when possible
    for (const a of agentReports) {
      if (!a.agentId) continue;
      // eslint-disable-next-line no-await-in-loop
      const leads = await ExpressInterest.count({
        where: {
          [Op.or]: [{ assignedAgentId: a.agentId }, { referralAgentId: a.agentId }],
        },
      });
      a.activeDeals = await PurchaseRequest.count({
        where: {
          assignedAgentId: a.agentId,
          status: { [Op.ne]: 'COMPLETED' },
          dealStatus: 'OPEN',
        },
      });
      a.conversionRate = leads > 0 ? Number(((a.closedDeals / leads) * 100).toFixed(1)) : 0;
    }

    let customerPurchases = completed;
    if (actor?.role === ROLES.CUSTOMER) {
      customerPurchases = completed.filter((p) => p.customerId === actor.id);
    }

    const customerReports = {
      purchasedProperties: customerPurchases.length,
      purchaseHistory: customerPurchases.map((p) => ({
        purchaseId: p.id,
        property: p.property?.titleEn,
        saleAmount: Number(p.finalSaleAmount || p.totalAmount || 0),
        saleDate: p.saleDate,
        paymentStatus: p.paymentStatus,
      })),
      totalAmountPaid: customerPurchases.reduce((s, p) => s + Number(p.amountPaid || 0), 0),
    };

    const documentStats = await documentGenerationService.getDocumentStats();

    return {
      purchaseReports: {
        totalPurchases,
        totalRevenue,
        propertiesSold,
        salesByProject: Object.entries(byProject).map(([name, value]) => ({ name, value })),
        salesByPropertyType: Object.entries(byType).map(([name, value]) => ({ name, value })),
        monthlySales: Object.entries(byMonth).sort().map(([name, value]) => ({ name, value })),
        yearlySales: Object.entries(byYear).sort().map(([name, value]) => ({ name, value })),
      },
      agentReports,
      customerReports,
      documentReports: documentStats,
      adminReports: {
        openInventory,
        reservedInventory,
        soldInventory,
        revenue: totalRevenue,
        closedDeals: closedDeals.length,
        agentPerformance: agentReports,
        propertyPerformance: Object.entries(byType).map(([name, value]) => ({ name, value })),
        totalPaymentReceipts: documentStats.totalPaymentReceipts,
        totalSaleCertificates: documentStats.totalSaleCertificates,
      },
      completedPurchases: completed.map((p) => ({
        purchaseId: p.id,
        property: p.property?.titleEn,
        customer: p.customer?.name,
        agent: p.assignedAgent?.name,
        saleAmount: Number(p.finalSaleAmount || 0),
        saleDate: p.saleDate,
        paymentStatus: p.paymentStatus,
        dealStatus: p.dealStatus,
      })),
    };
  }
}

function paymentStatusLabel(status) {
  if (String(status).toUpperCase() === 'FULLY_PAID') return 'Payment Completed';
  return 'Purchase Payment Recorded';
}

module.exports = new PurchaseCompletionService();
