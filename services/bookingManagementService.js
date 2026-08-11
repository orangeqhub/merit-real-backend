'use strict';

const { Op } = require('sequelize');
const {
  BookingRequest,
  BookingRequestHistory,
  BookingPayment,
  BookingFollowUp,
  PurchaseRequest,
  PurchaseRequestHistory,
  ExpressInterest,
  ExpressInterestHistory,
  Property,
  User,
  ActivityLog,
  sequelize,
} = require('../models');
const { ROLES } = require('../constants/roles');
const notificationService = require('./notificationService');
const { resolveMediaUrl } = require('../utils/mediaUrl');

const RESERVATION_DAYS = BookingRequest.RESERVATION_DAYS || 15;
const ACTIVE = BookingRequest.ACTIVE_RESERVATION_STATUSES;
const DECISION_AWAITING = BookingRequest.DECISION_AWAITING_STATUSES || ['AWAITING_ADMIN_DECISION', 'UNDER_REVIEW'];

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  d.setHours(23, 59, 59, 999);
  return d;
}

function daysRemaining(expiryDate) {
  if (!expiryDate) return null;
  const end = new Date(expiryDate).getTime();
  const now = Date.now();
  if (end <= now) return 0;
  return Math.ceil((end - now) / 86400000);
}

function daysOverdue(expiryDate) {
  if (!expiryDate) return 0;
  const end = new Date(expiryDate).getTime();
  const now = Date.now();
  if (end >= now) return 0;
  return Math.ceil((now - end) / 86400000);
}

function countdownParts(expiryDate) {
  if (!expiryDate) return null;
  const diff = new Date(expiryDate).getTime() - Date.now();
  if (diff <= 0) return { days: 0, hours: 0, mins: 0, secs: 0, expired: true };
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    mins: Math.floor((diff % 3600000) / 60000),
    secs: Math.floor((diff % 60000) / 1000),
    expired: false,
  };
}

function statusAfterExtension(row) {
  if (row.paymentStatus === 'FULLY_PAID') return 'FULLY_PAID';
  if (row.paymentStatus === 'PARTIAL') return 'PARTIALLY_PAID';
  if (DECISION_AWAITING.includes(row.status) || row.status === 'BOOKING_COMPLETED') {
    return 'BOOKING_APPROVED';
  }
  return row.status;
}

class BookingManagementService {
  enrichBooking(formatted, row, req = null) {
    if (!formatted) return null;
    const r = row?.toJSON ? row.toJSON() : (row || {});
    const total = r.totalAmount != null ? Number(r.totalAmount) : (formatted.property?.price != null ? Number(formatted.property.price) : null);
    const paid = Number(r.amountPaid || 0);
    const balance = total != null ? Math.max(0, total - paid) : null;
    const expiry = r.expiryDate || formatted.expiryDate;
    const payments = (r.payments || []).map((p) => ({
      id: p.id,
      amount: Number(p.amount),
      paymentDate: p.paymentDate,
      remarks: p.remarks,
      proofUrl: p.proofPath ? resolveMediaUrl(req, p.proofPath) : null,
      recordedBy: p.recorder ? { id: p.recorder.id, name: p.recorder.name } : null,
      createdAt: p.createdAt,
    }));
    const followUps = (r.followUps || []).map((f) => ({
      id: f.id,
      status: f.status,
      remarks: f.remarks,
      nextFollowUpAt: f.nextFollowUpAt,
      actorName: f.actor?.name || null,
      createdAt: f.createdAt,
    }));

    return {
      ...formatted,
      bookingDate: r.bookingDate || formatted.createdAt,
      expiryDate: expiry,
      originalExpiryDate: r.originalExpiryDate || null,
      daysRemaining: daysRemaining(expiry),
      daysOverdue: daysOverdue(expiry),
      countdown: countdownParts(expiry),
      totalAmount: total,
      amountPaid: paid,
      balanceAmount: balance,
      paymentStatus: r.paymentStatus || 'PENDING',
      followUpStatus: r.followUpStatus || null,
      nextFollowUpAt: r.nextFollowUpAt || null,
      extensionCount: Number(r.extensionCount || 0),
      extensionHistory: Array.isArray(r.extensionHistory) ? r.extensionHistory : [],
      adminDecision: r.adminDecision || null,
      decisionDate: r.decisionDate || null,
      decisionRemarks: r.decisionRemarks || null,
      reviewDate: r.reviewDate || null,
      payments,
      followUps,
      isReserved: ACTIVE.includes(r.status || formatted.statusRaw),
      awaitsAdminDecision: (r.status || formatted.statusRaw) === 'AWAITING_ADMIN_DECISION'
        || ((r.status || formatted.statusRaw) === 'UNDER_REVIEW' && r.reviewDate && new Date(r.reviewDate) <= new Date()),
      periodCompleted: (r.status || formatted.statusRaw) === 'AWAITING_ADMIN_DECISION'
        || (r.status || formatted.statusRaw) === 'UNDER_REVIEW'
        || (expiry && new Date(expiry).getTime() <= Date.now() && ACTIVE.includes(r.status || formatted.statusRaw)),
      canConvert: ['FULLY_PAID', 'BOOKING_CONFIRMED', 'BOOKING_COMPLETED', 'PARTIALLY_PAID', 'AWAITING_ADMIN_DECISION', 'UNDER_REVIEW'].includes(r.status)
        && Number(r.amountPaid || 0) > 0,
      canRecordPayment: ACTIVE.includes(r.status),
      canCancel: ACTIVE.includes(r.status) && Number(r.amountPaid || 0) <= 0,
      canExtend: ACTIVE.includes(r.status) && Number(r.amountPaid || 0) <= 0,
      canRelease: ACTIVE.includes(r.status) && Number(r.amountPaid || 0) <= 0,
      canKeepUnderReview: ACTIVE.includes(r.status),
      canDecide: ['AWAITING_ADMIN_DECISION', 'UNDER_REVIEW'].includes(r.status)
        || (ACTIVE.includes(r.status) && expiry && new Date(expiry).getTime() <= Date.now()),
      paymentStarted: Number(r.amountPaid || 0) > 0,
    };
  }

  bookingDetailIncludes() {
    return [
      { model: BookingPayment, as: 'payments', include: [{ model: User, as: 'recorder', attributes: ['id', 'name'] }], separate: true, order: [['paymentDate', 'DESC'], ['id', 'DESC']] },
      { model: BookingFollowUp, as: 'followUps', include: [{ model: User, as: 'actor', attributes: ['id', 'name'] }], separate: true, order: [['createdAt', 'DESC']] },
    ];
  }

  async assertPropertyAvailable(propertyId, transaction) {
    const property = await Property.findByPk(propertyId, { transaction });
    if (!property) {
      const err = new Error('Property not found.');
      err.status = 404;
      throw err;
    }
    if (property.status === 'BOOKED' || property.status === 'SOLD') {
      const err = new Error('This property is already reserved or sold and is not available for booking.');
      err.status = 409;
      err.code = 'PROPERTY_NOT_AVAILABLE';
      throw err;
    }
    if (property.status !== 'ACTIVE') {
      const err = new Error('Property is not available.');
      err.status = 404;
      throw err;
    }
    const existing = await BookingRequest.findOne({
      where: {
        propertyId,
        status: { [Op.in]: ACTIVE },
      },
      transaction,
    });
    if (existing) {
      const err = new Error('This property already has an active booking reservation.');
      err.status = 409;
      err.code = 'PROPERTY_ALREADY_BOOKED';
      throw err;
    }
    return property;
  }

  async reserveProperty(propertyId, transaction) {
    await Property.update(
      { status: 'BOOKED' },
      { where: { id: propertyId }, transaction }
    );
  }

  async releaseProperty(propertyId, transaction) {
    const property = await Property.findByPk(propertyId, { transaction });
    if (property && property.status === 'BOOKED') {
      await property.update({ status: 'ACTIVE' }, { transaction });
    }
  }

  async closePendingFollowUps(bookingRequestId, adminUserId, note, transaction) {
    await BookingFollowUp.update(
      { status: 'COMPLETED', remarks: note || 'Closed by admin booking decision' },
      {
        where: {
          bookingRequestId,
          status: { [Op.ne]: 'COMPLETED' },
        },
        transaction,
      }
    );
    if (adminUserId) {
      await BookingFollowUp.create({
        bookingRequestId,
        status: 'COMPLETED',
        remarks: note || 'Booking follow-ups closed',
        createdBy: adminUserId,
      }, { transaction }).catch(() => null);
    }
  }

  async markPropertySold(propertyId, transaction) {
    await Property.update(
      { status: 'SOLD' },
      { where: { id: propertyId }, transaction }
    );
  }

  computePaymentStatus(totalAmount, amountPaid) {
    const total = Number(totalAmount || 0);
    const paid = Number(amountPaid || 0);
    if (paid <= 0) return 'PENDING';
    if (total > 0 && paid >= total) return 'FULLY_PAID';
    return 'PARTIAL';
  }

  async recordPayment(bookingId, adminUser, body = {}, file = null, req = null) {
    const row = await BookingRequest.findByPk(Number(bookingId));
    if (!row) {
      const err = new Error('Booking not found.');
      err.status = 404;
      throw err;
    }
    if (!ACTIVE.includes(row.status)) {
      const err = new Error('Payments can only be recorded for active bookings.');
      err.status = 400;
      throw err;
    }
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      const err = new Error('Valid payment amount is required.');
      err.status = 400;
      throw err;
    }

    const paymentDate = body.paymentDate ? new Date(body.paymentDate) : new Date();
    const remarks = String(body.remarks || '').trim() || null;
    const paymentMethod = String(body.paymentMethod || '').trim() || null;
    const paymentReference = String(body.paymentReference || body.reference || '').trim()
      || `PAY-BK-${row.id}-${Date.now().toString(36).toUpperCase()}`;
    const proofPath = file ? `/uploads/booking-payments/${file.filename}` : null;
    let paymentReceiptId = null;
    let paymentReceiptNumber = null;

    await sequelize.transaction(async (transaction) => {
      const payment = await BookingPayment.create({
        bookingRequestId: row.id,
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

      const newPaid = Number(row.amountPaid || 0) + amount;
      const total = row.totalAmount != null ? Number(row.totalAmount) : null;
      const paymentStatus = this.computePaymentStatus(total, newPaid);
      let nextStatus = row.status;
      if (paymentStatus === 'FULLY_PAID') nextStatus = 'FULLY_PAID';
      else if (paymentStatus === 'PARTIAL') nextStatus = 'PARTIALLY_PAID';
      else if (row.status === 'BOOKING_REQUESTED' || row.status === 'BOOKING_APPROVED') {
        nextStatus = 'PAYMENT_PENDING';
      }

      const from = row.status;
      await row.update({
        amountPaid: newPaid,
        paymentStatus,
        status: nextStatus,
        followUpStatus: paymentStatus === 'FULLY_PAID' ? 'PAYMENT_RECEIVED' : 'WAITING_FOR_PAYMENT',
        modifiedBy: adminUser.id,
      }, { transaction });

      if (from !== nextStatus) {
        await BookingRequestHistory.create({
          bookingRequestId: row.id,
          fromStatus: from,
          toStatus: nextStatus,
          note: `Payment of ₹${amount} recorded. ${remarks || ''}`.trim(),
          createdBy: adminUser.id,
        }, { transaction });
      }

      const documentGenerationService = require('./documentGenerationService');
      const linkedPurchase = await PurchaseRequest.findOne({
        where: { bookingRequestId: row.id },
        transaction,
      });
      const balance = total != null ? Math.max(0, total - newPaid) : 0;
      const receipt = await documentGenerationService.createPaymentReceipt({
        customerId: row.customerId,
        propertyId: row.propertyId,
        amount,
        totalPropertyAmount: total,
        totalAmountPaid: newPaid,
        balanceAmount: balance,
        paymentMethod,
        paymentReference,
        paymentDate,
        remarks,
        status: paymentStatus === 'FULLY_PAID' ? 'FULL' : 'PARTIAL',
        bookingRequestId: row.id,
        purchaseRequestId: linkedPurchase?.id || null,
        bookingPaymentId: payment.id,
        agentId: row.assignedAgentId,
        createdBy: adminUser.id,
        transaction,
      });
      paymentReceiptId = receipt.id;
      paymentReceiptNumber = receipt.receiptNumber;

      await ActivityLog.create({
        entityType: 'BookingRequest',
        entityId: row.id,
        action: 'PAYMENT_RECORDED',
        details: `Amount ${amount}; Receipt ${paymentReceiptNumber}`,
        createdBy: adminUser.id,
      }, { transaction });
    });

    const interestDecisionService = require('./interestDecisionService');
    const formatted = await interestDecisionService.getBookingById(row.id, { req });
    const propertyTitle = formatted.propertyName || `Property #${row.propertyId}`;

    await notificationService.create({
      userId: row.customerId,
      userRole: ROLES.CUSTOMER,
      titleEn: formatted.paymentStatus === 'FULLY_PAID'
        ? 'Full Payment Received'
        : 'Partial Payment Received',
      messageEn: `A payment of ₹${Number(amount).toLocaleString('en-IN')} was recorded for "${propertyTitle}". Receipt ${paymentReceiptNumber} is ready.`,
      notificationType: formatted.paymentStatus === 'FULLY_PAID' ? 'booking_fully_paid' : 'booking_partial_payment',
      referenceType: 'payment_receipt',
      referenceId: paymentReceiptId,
      linkPath: '/buyer/documents',
      createdBy: adminUser.id,
    });

    if (row.assignedAgentId) {
      await notificationService.create({
        userId: row.assignedAgentId,
        userRole: ROLES.AGENT,
        titleEn: 'Booking Payment Updated',
        messageEn: `Payment of ₹${Number(amount).toLocaleString('en-IN')} recorded for booking #${row.id}. Receipt ${paymentReceiptNumber}.`,
        notificationType: 'booking_payment_agent',
        referenceType: 'payment_receipt',
        referenceId: paymentReceiptId,
        linkPath: '/mediator/documents',
        createdBy: adminUser.id,
      });
    }

    return formatted;
  }

  async addFollowUp(bookingId, actor, body = {}) {
    const row = await BookingRequest.findByPk(Number(bookingId));
    if (!row) {
      const err = new Error('Booking not found.');
      err.status = 404;
      throw err;
    }
    if (actor.role === ROLES.AGENT && row.assignedAgentId !== actor.id) {
      const err = new Error('Access denied.');
      err.status = 403;
      throw err;
    }
    if (Number(row.amountPaid || 0) > 0) {
      const err = new Error('Follow-up is disabled because payment has started.');
      err.status = 400;
      err.code = 'PAYMENT_STARTED';
      throw err;
    }
    const status = String(body.status || row.followUpStatus || 'PENDING_CUSTOMER_RESPONSE').trim().toUpperCase();
    const remarks = String(body.remarks || '').trim();
    if (!remarks) {
      const err = new Error('Follow-up remarks are required.');
      err.status = 400;
      throw err;
    }
    const nextFollowUpAt = body.nextFollowUpAt ? new Date(body.nextFollowUpAt) : null;

    await sequelize.transaction(async (transaction) => {
      await BookingFollowUp.create({
        bookingRequestId: row.id,
        status,
        remarks,
        nextFollowUpAt,
        createdBy: actor.id,
        modifiedBy: actor.id,
      }, { transaction });

      await row.update({
        followUpStatus: status,
        nextFollowUpAt,
        modifiedBy: actor.id,
      }, { transaction });

      await BookingRequestHistory.create({
        bookingRequestId: row.id,
        fromStatus: row.status,
        toStatus: row.status,
        note: `Follow-up (${status}): ${remarks}`,
        createdBy: actor.id,
      }, { transaction });
    });

    const interestDecisionService = require('./interestDecisionService');
    return interestDecisionService.getBookingById(row.id);
  }

  async cancelBooking(bookingId, adminUser, body = {}) {
    const row = await BookingRequest.findByPk(Number(bookingId));
    if (!row) {
      const err = new Error('Booking not found.');
      err.status = 404;
      throw err;
    }
    if (!ACTIVE.includes(row.status)) {
      const err = new Error('Only active bookings can be cancelled.');
      err.status = 400;
      throw err;
    }
    const note = String(body.reason || body.remarks || 'Booking cancelled by admin').trim();
    const from = row.status;

    await sequelize.transaction(async (transaction) => {
      await row.update({
        status: 'CANCELLED',
        rejectionReason: note,
        modifiedBy: adminUser.id,
      }, { transaction });
      await BookingRequestHistory.create({
        bookingRequestId: row.id,
        fromStatus: from,
        toStatus: 'CANCELLED',
        note,
        createdBy: adminUser.id,
      }, { transaction });
      await this.releaseProperty(row.propertyId, transaction);
    });

    const interestDecisionService = require('./interestDecisionService');
    const formatted = await interestDecisionService.getBookingById(row.id);
    const propertyTitle = formatted.propertyName || `Property #${row.propertyId}`;

    await notificationService.create({
      userId: row.customerId,
      userRole: ROLES.CUSTOMER,
      titleEn: 'Booking Cancelled',
      messageEn: `Your booking for "${propertyTitle}" was cancelled. The property is available again.`,
      notificationType: 'booking_cancelled',
      referenceType: 'booking_request',
      referenceId: row.id,
      linkPath: `/buyer/bookings/${row.id}`,
      createdBy: adminUser.id,
    });

    return formatted;
  }

  async extendBooking(bookingId, adminUser, body = {}) {
    const row = await BookingRequest.findByPk(Number(bookingId));
    if (!row) {
      const err = new Error('Booking not found.');
      err.status = 404;
      throw err;
    }
    if (!ACTIVE.includes(row.status)) {
      const err = new Error('Only reserved bookings can be extended.');
      err.status = 400;
      throw err;
    }

    let days = Number(body.days);
    if (body.customDays != null) days = Number(body.customDays);
    if (![7, 15, 30].includes(days) && !(days >= 1 && days <= 90)) {
      days = Math.min(90, Math.max(1, Number(body.days) || 7));
    } else {
      days = Math.min(90, Math.max(1, days));
    }

    const reason = String(body.reason || body.remarks || body.decisionRemarks || 'Booking extended by admin').trim();
    const previousExpiry = row.expiryDate ? new Date(row.expiryDate) : new Date();
    const base = previousExpiry > new Date() ? previousExpiry : new Date();
    const newExpiry = addDays(base, days);
    const nextStatus = statusAfterExtension(row);
    const from = row.status;
    const history = Array.isArray(row.extensionHistory) ? [...row.extensionHistory] : [];
    history.push({
      days,
      previousExpiry: previousExpiry.toISOString(),
      newExpiry: newExpiry.toISOString(),
      reason,
      extendedBy: adminUser.id,
      extendedAt: new Date().toISOString(),
    });

    await sequelize.transaction(async (transaction) => {
      await row.update({
        status: nextStatus,
        expiryDate: newExpiry,
        originalExpiryDate: row.originalExpiryDate || row.expiryDate || previousExpiry,
        extensionCount: Number(row.extensionCount || 0) + 1,
        extensionHistory: history,
        reminderFlags: {},
        adminDecision: 'EXTENDED',
        decisionDate: new Date(),
        decisionRemarks: reason,
        decisionBy: adminUser.id,
        reviewDate: null,
        adminRemarks: reason,
        modifiedBy: adminUser.id,
      }, { transaction });
      await BookingRequestHistory.create({
        bookingRequestId: row.id,
        fromStatus: from,
        toStatus: nextStatus,
        note: `Extended by ${days} day(s). New expiry: ${newExpiry.toISOString()}. ${reason}`,
        createdBy: adminUser.id,
      }, { transaction });
      await ActivityLog.create({
        entityType: 'BookingRequest',
        entityId: row.id,
        action: 'BOOKING_EXTENDED',
        details: JSON.stringify({ days, newExpiry, reason }),
        createdBy: adminUser.id,
      }, { transaction }).catch(() => null);
    });

    const interestDecisionService = require('./interestDecisionService');
    const formatted = await interestDecisionService.getBookingById(row.id);
    const propertyTitle = formatted.propertyName || `Property #${row.propertyId}`;
    const expiryLabel = newExpiry.toLocaleString('en-IN');

    await notificationService.create({
      userId: row.customerId,
      userRole: ROLES.CUSTOMER,
      titleEn: 'Booking Extended',
      messageEn: `Your booking for "${propertyTitle}" was extended by ${days} day(s). New expiry: ${expiryLabel}. ${reason}`,
      notificationType: 'booking_extended',
      referenceType: 'booking_request',
      referenceId: row.id,
      linkPath: `/buyer/bookings/${row.id}`,
      createdBy: adminUser.id,
    });
    if (row.assignedAgentId) {
      await notificationService.create({
        userId: row.assignedAgentId,
        userRole: ROLES.AGENT,
        titleEn: 'Booking Extended',
        messageEn: `Booking #${row.id} for "${propertyTitle}" extended by ${days} day(s). New expiry: ${expiryLabel}.`,
        notificationType: 'booking_extended_agent',
        referenceType: 'booking_request',
        referenceId: row.id,
        linkPath: '/mediator/bookings',
        createdBy: adminUser.id,
      });
    }

    return formatted;
  }

  async releaseBooking(bookingId, adminUser, body = {}) {
    const row = await BookingRequest.findByPk(Number(bookingId));
    if (!row) {
      const err = new Error('Booking not found.');
      err.status = 404;
      throw err;
    }
    if (!ACTIVE.includes(row.status)) {
      const err = new Error('Only reserved bookings can be released.');
      err.status = 400;
      throw err;
    }
    const reason = String(body.reason || body.remarks || '').trim();
    if (!reason) {
      const err = new Error('Release reason is required.');
      err.status = 400;
      err.code = 'REASON_REQUIRED';
      throw err;
    }
    const remarks = String(body.decisionRemarks || body.adminRemarks || reason).trim();
    const from = row.status;

    await sequelize.transaction(async (transaction) => {
      await row.update({
        status: 'BOOKING_EXPIRED',
        rejectionReason: reason,
        adminRemarks: remarks,
        adminDecision: 'RELEASED',
        decisionDate: new Date(),
        decisionRemarks: remarks,
        decisionBy: adminUser.id,
        followUpStatus: 'COMPLETED',
        modifiedBy: adminUser.id,
      }, { transaction });
      await BookingRequestHistory.create({
        bookingRequestId: row.id,
        fromStatus: from,
        toStatus: 'BOOKING_EXPIRED',
        note: `Released by admin. Reason: ${reason}. ${remarks}`,
        createdBy: adminUser.id,
      }, { transaction });
      await this.closePendingFollowUps(row.id, adminUser.id, `Released: ${reason}`, transaction);
      await this.releaseProperty(row.propertyId, transaction);
      await ActivityLog.create({
        entityType: 'BookingRequest',
        entityId: row.id,
        action: 'BOOKING_RELEASED',
        details: JSON.stringify({ reason, remarks }),
        createdBy: adminUser.id,
      }, { transaction }).catch(() => null);
    });

    const interestDecisionService = require('./interestDecisionService');
    const formatted = await interestDecisionService.getBookingById(row.id);
    const propertyTitle = formatted.propertyName || `Property #${row.propertyId}`;

    await notificationService.create({
      userId: row.customerId,
      userRole: ROLES.CUSTOMER,
      titleEn: 'Booking Released',
      messageEn: `Your booking for "${propertyTitle}" was released. Reason: ${reason}. ${remarks}`,
      notificationType: 'booking_released',
      referenceType: 'booking_request',
      referenceId: row.id,
      linkPath: `/buyer/bookings/${row.id}`,
      createdBy: adminUser.id,
    });
    if (row.assignedAgentId) {
      await notificationService.create({
        userId: row.assignedAgentId,
        userRole: ROLES.AGENT,
        titleEn: 'Booking Released',
        messageEn: `Booking #${row.id} for "${propertyTitle}" was released. Reason: ${reason}.`,
        notificationType: 'booking_released_agent',
        referenceType: 'booking_request',
        referenceId: row.id,
        linkPath: '/mediator/bookings',
        createdBy: adminUser.id,
      });
    }

    return formatted;
  }

  async keepUnderReview(bookingId, adminUser, body = {}) {
    const row = await BookingRequest.findByPk(Number(bookingId));
    if (!row) {
      const err = new Error('Booking not found.');
      err.status = 404;
      throw err;
    }
    if (!ACTIVE.includes(row.status)) {
      const err = new Error('Only reserved bookings can be kept under review.');
      err.status = 400;
      throw err;
    }
    const remarks = String(body.remarks || body.decisionRemarks || body.reviewRemarks || '').trim();
    if (!remarks) {
      const err = new Error('Review remarks are required.');
      err.status = 400;
      throw err;
    }
    if (!body.reviewDate) {
      const err = new Error('Next review date is required.');
      err.status = 400;
      throw err;
    }
    const reviewDate = new Date(body.reviewDate);
    reviewDate.setHours(23, 59, 59, 999);
    const from = row.status;
    const flags = { ...(row.reminderFlags || {}) };
    delete flags.reviewReminded;

    await sequelize.transaction(async (transaction) => {
      await row.update({
        status: 'UNDER_REVIEW',
        adminDecision: 'UNDER_REVIEW',
        decisionDate: new Date(),
        decisionRemarks: remarks,
        decisionBy: adminUser.id,
        reviewDate,
        adminRemarks: remarks,
        reminderFlags: flags,
        modifiedBy: adminUser.id,
      }, { transaction });
      await BookingRequestHistory.create({
        bookingRequestId: row.id,
        fromStatus: from,
        toStatus: 'UNDER_REVIEW',
        note: `Kept under review until ${reviewDate.toISOString()}. ${remarks}`,
        createdBy: adminUser.id,
      }, { transaction });
    });

    const interestDecisionService = require('./interestDecisionService');
    const formatted = await interestDecisionService.getBookingById(row.id);
    const propertyTitle = formatted.propertyName || `Property #${row.propertyId}`;
    const reviewLabel = reviewDate.toLocaleDateString('en-IN');

    await notificationService.create({
      userId: row.customerId,
      userRole: ROLES.CUSTOMER,
      titleEn: 'Booking Under Review',
      messageEn: `Your booking for "${propertyTitle}" is under admin review until ${reviewLabel}. ${remarks}`,
      notificationType: 'booking_under_review',
      referenceType: 'booking_request',
      referenceId: row.id,
      linkPath: `/buyer/bookings/${row.id}`,
      createdBy: adminUser.id,
    });
    if (row.assignedAgentId) {
      await notificationService.create({
        userId: row.assignedAgentId,
        userRole: ROLES.AGENT,
        titleEn: 'Booking Under Review',
        messageEn: `Booking #${row.id} for "${propertyTitle}" is under review until ${reviewLabel}.`,
        notificationType: 'booking_under_review_agent',
        referenceType: 'booking_request',
        referenceId: row.id,
        linkPath: '/mediator/bookings',
        createdBy: adminUser.id,
      });
    }

    return formatted;
  }

  async convertToPurchase(bookingId, adminUser, body = {}) {
    const row = await BookingRequest.findByPk(Number(bookingId));
    if (!row) {
      const err = new Error('Booking not found.');
      err.status = 404;
      throw err;
    }
    if (row.status === 'CONVERTED_TO_PURCHASE') {
      const err = new Error('Booking already converted to purchase.');
      err.status = 409;
      throw err;
    }
    if (!ACTIVE.includes(row.status) && row.status !== 'FULLY_PAID') {
      const err = new Error('Booking cannot be converted in its current status.');
      err.status = 400;
      throw err;
    }

    const note = String(body.remarks || 'Converted booking to purchase').trim();
    const from = row.status;
    let purchaseId = null;

    await sequelize.transaction(async (transaction) => {
      await row.update({
        status: 'CONVERTED_TO_PURCHASE',
        followUpStatus: 'COMPLETED',
        paymentStatus: this.computePaymentStatus(row.totalAmount, row.amountPaid),
        adminDecision: 'CONVERTED_TO_PURCHASE',
        decisionDate: new Date(),
        decisionRemarks: note,
        decisionBy: adminUser.id,
        modifiedBy: adminUser.id,
      }, { transaction });

      await BookingRequestHistory.create({
        bookingRequestId: row.id,
        fromStatus: from,
        toStatus: 'CONVERTED_TO_PURCHASE',
        note,
        createdBy: adminUser.id,
      }, { transaction });

      await BookingFollowUp.create({
        bookingRequestId: row.id,
        status: 'COMPLETED',
        remarks: note,
        createdBy: adminUser.id,
        modifiedBy: adminUser.id,
      }, { transaction });

      let purchase = await PurchaseRequest.findOne({
        where: { expressInterestId: row.expressInterestId },
        transaction,
      });

      if (!purchase) {
        purchase = await PurchaseRequest.create({
          expressInterestId: row.expressInterestId,
          customerId: row.customerId,
          propertyId: row.propertyId,
          assignedAgentId: row.assignedAgentId,
          bookingRequestId: row.id,
          source: 'BOOKING_CONVERSION',
          status: 'APPROVED',
          totalAmount: Number(row.totalAmount || 0),
          amountPaid: Number(row.amountPaid || 0),
          finalSaleAmount: Number(row.totalAmount || 0),
          paymentStatus: this.computePaymentStatus(row.totalAmount, row.amountPaid),
          paymentCompletedAt: this.computePaymentStatus(row.totalAmount, row.amountPaid) === 'FULLY_PAID'
            ? new Date()
            : null,
          dealStatus: 'OPEN',
          remarks: note,
          adminRemarks: `Converted from Booking #${row.id}`,
          createdBy: adminUser.id,
          modifiedBy: adminUser.id,
        }, { transaction });

        await PurchaseRequestHistory.create({
          purchaseRequestId: purchase.id,
          fromStatus: null,
          toStatus: 'APPROVED',
          note: `Created from Booking #${row.id}`,
          createdBy: adminUser.id,
        }, { transaction });
      } else {
        const fromPurchase = purchase.status;
        await purchase.update({
          status: 'APPROVED',
          bookingRequestId: row.id,
          source: 'BOOKING_CONVERSION',
          totalAmount: Number(row.totalAmount != null ? row.totalAmount : purchase.totalAmount || 0),
          amountPaid: Number(row.amountPaid || purchase.amountPaid || 0),
          finalSaleAmount: Number(row.totalAmount != null ? row.totalAmount : purchase.finalSaleAmount || 0),
          paymentStatus: this.computePaymentStatus(
            row.totalAmount != null ? row.totalAmount : purchase.totalAmount,
            row.amountPaid || purchase.amountPaid
          ),
          adminRemarks: `Converted from Booking #${row.id}`,
          modifiedBy: adminUser.id,
        }, { transaction });
        await PurchaseRequestHistory.create({
          purchaseRequestId: purchase.id,
          fromStatus: fromPurchase,
          toStatus: 'APPROVED',
          note: `Linked conversion from Booking #${row.id}`,
          createdBy: adminUser.id,
        }, { transaction });
      }
      purchaseId = purchase.id;

      const interest = await ExpressInterest.findByPk(row.expressInterestId, { transaction });
      if (interest) {
        const interestFrom = interest.status;
        await interest.update({
          status: 'PURCHASE_REQUESTED',
          customerDecision: 'PURCHASE',
          decisionAt: interest.decisionAt || new Date(),
          modifiedBy: adminUser.id,
        }, { transaction });
        await ExpressInterestHistory.create({
          interestId: interest.id,
          fromStatus: interestFrom,
          toStatus: 'PURCHASE_REQUESTED',
          note: `Booking #${row.id} converted to purchase`,
          createdBy: adminUser.id,
        }, { transaction });
      }

      // Keep property BOOKED until purchase completion marks it SOLD
    });

    const interestDecisionService = require('./interestDecisionService');
    const formatted = await interestDecisionService.getBookingById(row.id);
    const propertyTitle = formatted.propertyName || `Property #${row.propertyId}`;

    await notificationService.create({
      userId: row.customerId,
      userRole: ROLES.CUSTOMER,
      titleEn: 'Booking Converted to Purchase',
      messageEn: `Your booking for "${propertyTitle}" was converted to a purchase. Complete payment confirmation with admin to finalize the sale.`,
      notificationType: 'booking_converted',
      referenceType: 'booking_request',
      referenceId: row.id,
      linkPath: '/buyer/purchases',
      createdBy: adminUser.id,
    });

    await notificationService.notifyAdmins({
      titleEn: 'Booking Converted to Purchase',
      messageEn: `Booking #${row.id} for "${propertyTitle}" converted to purchase #${purchaseId}. Complete purchase to mark property sold.`,
      notificationType: 'booking_converted_admin',
      referenceType: 'booking_request',
      referenceId: row.id,
      linkPath: '/admin/purchases',
      createdBy: adminUser.id,
    });

    if (row.assignedAgentId) {
      await notificationService.create({
        userId: row.assignedAgentId,
        userRole: ROLES.AGENT,
        titleEn: 'Booking Converted to Purchase',
        messageEn: `Booking #${row.id} for "${propertyTitle}" was converted to purchase.`,
        notificationType: 'booking_converted_agent',
        referenceType: 'booking_request',
        referenceId: row.id,
        linkPath: '/mediator/purchases',
        createdBy: adminUser.id,
      });
    }

    return { booking: formatted, purchaseId };
  }

  async markPeriodCompleted(booking, { notify = true } = {}) {
    if (!ACTIVE.includes(booking.status)) return null;
    if (booking.status === 'AWAITING_ADMIN_DECISION' || booking.status === 'UNDER_REVIEW') {
      return booking;
    }
    const from = booking.status;
    const flags = { ...(booking.reminderFlags || {}), periodCompleted: true };

    await sequelize.transaction(async (transaction) => {
      await booking.update({
        status: 'AWAITING_ADMIN_DECISION',
        adminDecision: null,
        decisionDate: null,
        reminderFlags: flags,
        modifiedBy: null,
      }, { transaction });
      await BookingRequestHistory.create({
        bookingRequestId: booking.id,
        fromStatus: from,
        toStatus: 'AWAITING_ADMIN_DECISION',
        note: 'Booking period completed — awaiting admin decision. Property remains reserved.',
        createdBy: null,
      }, { transaction });
    });

    if (notify) {
      const property = await Property.findByPk(booking.propertyId);
      const propertyTitle = property?.titleEn || `Property #${booking.propertyId}`;

      await notificationService.create({
        userId: booking.customerId,
        userRole: ROLES.CUSTOMER,
        titleEn: 'Booking Period Completed',
        messageEn: `Your 15-day booking period for "${propertyTitle}" has ended. The property stays reserved until admin decides.`,
        notificationType: 'booking_period_completed',
        referenceType: 'booking_request',
        referenceId: booking.id,
        linkPath: `/buyer/bookings/${booking.id}`,
      });

      await notificationService.notifyAdmins({
        titleEn: 'Booking Requires Decision',
        messageEn: `Booking #${booking.id} for "${propertyTitle}" period completed. Choose Extend, Release, Convert, or Keep Under Review.`,
        notificationType: 'booking_requires_decision',
        referenceType: 'booking_request',
        referenceId: booking.id,
        linkPath: '/admin/bookings',
      });

      if (booking.assignedAgentId) {
        await notificationService.create({
          userId: booking.assignedAgentId,
          userRole: ROLES.AGENT,
          titleEn: 'Booking Period Completed',
          messageEn: `Booking #${booking.id} for "${propertyTitle}" period completed — awaiting admin decision.`,
          notificationType: 'booking_period_completed_agent',
          referenceType: 'booking_request',
          referenceId: booking.id,
          linkPath: '/mediator/bookings',
        });
      }
    }

    return booking;
  }

  /** @deprecated Use markPeriodCompleted — no longer auto-releases property. */
  async expireBooking(booking, options = {}) {
    return this.markPeriodCompleted(booking, options);
  }

  async processExpiriesAndReminders() {
    const now = new Date();
    const active = await BookingRequest.findAll({
      where: {
        status: { [Op.in]: ACTIVE },
        expiryDate: { [Op.ne]: null },
      },
    });

    let awaitingDecision = 0;
    let reminded = 0;
    let reviewReminders = 0;

    for (const booking of active) {
      if (booking.status === 'AWAITING_ADMIN_DECISION') continue;

      const expiry = new Date(booking.expiryDate);
      if (expiry.getTime() <= now.getTime() && booking.status !== 'UNDER_REVIEW') {
        await this.markPeriodCompleted(booking);
        awaitingDecision += 1;
        continue;
      }

      if (booking.status === 'UNDER_REVIEW') {
        const flags = booking.reminderFlags || {};
        if (booking.reviewDate && new Date(booking.reviewDate).getTime() <= now.getTime() && !flags.reviewReminded) {
          const property = await Property.findByPk(booking.propertyId);
          const propertyTitle = property?.titleEn || `Property #${booking.propertyId}`;
          await notificationService.notifyAdmins({
            titleEn: 'Booking Review Reminder',
            messageEn: `Review date reached for booking #${booking.id} ("${propertyTitle}"). Please take a decision.`,
            notificationType: 'booking_review_reminder',
            referenceType: 'booking_request',
            referenceId: booking.id,
            linkPath: '/admin/bookings',
          });
          await booking.update({ reminderFlags: { ...flags, reviewReminded: true } });
          reviewReminders += 1;
        }
        continue;
      }

      const days = daysRemaining(expiry);
      const flags = booking.reminderFlags || {};
      const property = await Property.findByPk(booking.propertyId);
      const propertyTitle = property?.titleEn || `Property #${booking.propertyId}`;

      const sendReminder = async (key, label) => {
        if (flags[key]) return;
        await notificationService.create({
          userId: booking.customerId,
          userRole: ROLES.CUSTOMER,
          titleEn: `Booking Expiry Reminder (${label})`,
          messageEn: `Your booking for "${propertyTitle}" expires in ${label}. Please complete payment.`,
          notificationType: `booking_expiry_reminder_${key}`,
          referenceType: 'booking_request',
          referenceId: booking.id,
          linkPath: `/buyer/bookings/${booking.id}`,
        });
        await notificationService.notifyAdmins({
          titleEn: `Booking Expiring Soon (${label})`,
          messageEn: `Booking #${booking.id} for "${propertyTitle}" expires in ${label}.`,
          notificationType: `booking_expiring_admin_${key}`,
          referenceType: 'booking_request',
          referenceId: booking.id,
          linkPath: '/admin/bookings',
        });
        if (booking.assignedAgentId) {
          await notificationService.create({
            userId: booking.assignedAgentId,
            userRole: ROLES.AGENT,
            titleEn: `Booking Expiring Soon (${label})`,
            messageEn: `Booking #${booking.id} expires in ${label}.`,
            notificationType: `booking_expiring_agent_${key}`,
            referenceType: 'booking_request',
            referenceId: booking.id,
            linkPath: '/mediator/bookings',
          });
        }
        flags[key] = true;
        await booking.update({ reminderFlags: { ...flags } });
        reminded += 1;
      };

      if (days <= 1) await sendReminder('d1', '1 day');
      else if (days <= 3) await sendReminder('d3', '3 days');
      else if (days <= 7) await sendReminder('d7', '7 days');
    }

    return {
      expired: awaitingDecision,
      awaitingDecision,
      reminded,
      reviewReminders,
      checked: active.length,
    };
  }

  async listRequiringDecision({ page = 1, pageSize = 50 } = {}) {
    const now = new Date();
    const where = {
      [Op.or]: [
        { status: 'AWAITING_ADMIN_DECISION' },
        {
          status: 'UNDER_REVIEW',
          reviewDate: { [Op.lte]: now },
        },
      ],
    };
    const limit = Math.min(100, Math.max(1, Number(pageSize) || 50));
    const offset = (Math.max(1, Number(page) || 1) - 1) * limit;
    const interestDecisionService = require('./interestDecisionService');

    const { rows, count } = await BookingRequest.findAndCountAll({
      where,
      include: interestDecisionService.bookingIncludes(),
      order: [['expiryDate', 'ASC']],
      limit,
      offset,
      distinct: true,
    });

    return {
      items: rows.map((r) => interestDecisionService.formatBooking(r)),
      total: count,
      page: Math.max(1, Number(page) || 1),
      pageSize: limit,
      totalPages: Math.max(1, Math.ceil(count / limit)),
    };
  }

  async getStats() {
    const rows = await BookingRequest.findAll({ attributes: ['status', 'paymentStatus'] });
    const byStatus = {};
    const byPayment = {};
    for (const r of rows) {
      byStatus[r.status] = (byStatus[r.status] || 0) + 1;
      byPayment[r.paymentStatus] = (byPayment[r.paymentStatus] || 0) + 1;
    }
    return {
      total: rows.length,
      active: rows.filter((r) => ACTIVE.includes(r.status)).length,
      awaitingDecision: byStatus.AWAITING_ADMIN_DECISION || 0,
      underReview: byStatus.UNDER_REVIEW || 0,
      expired: byStatus.BOOKING_EXPIRED || 0,
      converted: byStatus.CONVERTED_TO_PURCHASE || 0,
      byStatus,
      byPayment,
    };
  }
}

module.exports = new BookingManagementService();
module.exports.addDays = addDays;
module.exports.daysRemaining = daysRemaining;
module.exports.daysOverdue = daysOverdue;
module.exports.RESERVATION_DAYS = RESERVATION_DAYS;
