'use strict';

const {
  ExpressInterest,
  ExpressInterestHistory,
  PurchaseRequest,
  PurchaseRequestHistory,
  PurchasePayment,
  PurchaseReceipt,
  ClosedDeal,
  SalesHistory,
  BookingRequest,
  BookingRequestHistory,
  BookingPayment,
  BookingFollowUp,
  ActivityLog,
  User,
  Property,
  PropertyCategory,
  PaymentReceipt,
  SaleCertificate,
  sequelize,
} = require('../models');
const { ROLES } = require('../constants/roles');
const notificationService = require('./notificationService');
const expressInterestService = require('./expressInterestService');
const bookingManagementService = require('./bookingManagementService');
const purchaseCompletionService = require('./purchaseCompletionService');

const DECISION_ELIGIBLE = ['APPROVED', 'ASSIGNED'];
const PURCHASE_STATUSES = PurchaseRequest.PURCHASE_STATUSES;
const BOOKING_STATUSES = BookingRequest.BOOKING_STATUSES;

class InterestDecisionService {
  purchaseIncludes() {
    return [
      { model: User, as: 'customer', attributes: { exclude: ['password'] } },
      { model: User, as: 'assignedAgent', attributes: { exclude: ['password'] } },
      {
        model: Property,
        as: 'property',
        include: [
          { model: PropertyCategory, as: 'category' },
          { model: User, as: 'postedBy', attributes: ['id', 'name', 'memberId', 'role'] },
        ],
      },
      {
        model: ExpressInterest,
        as: 'expressInterest',
        include: [
          { model: User, as: 'referralAgent', attributes: { exclude: ['password'] } },
        ],
      },
      {
        model: PurchaseRequestHistory,
        as: 'history',
        include: [{ model: User, as: 'actor', attributes: ['id', 'name', 'memberId', 'role'] }],
        separate: true,
        order: [['createdAt', 'ASC']],
      },
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
      {
        model: PaymentReceipt,
        as: 'paymentReceipts',
        separate: true,
        order: [['receiptDate', 'DESC']],
      },
      { model: SaleCertificate, as: 'saleCertificate' },
      { model: ClosedDeal, as: 'closedDeal' },
      {
        model: SalesHistory,
        as: 'salesHistory',
        separate: true,
        order: [['createdAt', 'ASC']],
      },
      {
        model: BookingRequest,
        as: 'bookingRequest',
        attributes: ['id', 'bookingDate', 'expiryDate', 'status', 'amountPaid', 'totalAmount'],
      },
    ];
  }

  bookingIncludes() {
    return [
      { model: User, as: 'customer', attributes: { exclude: ['password'] } },
      { model: User, as: 'assignedAgent', attributes: { exclude: ['password'] } },
      {
        model: Property,
        as: 'property',
        include: [
          { model: PropertyCategory, as: 'category' },
          { model: User, as: 'postedBy', attributes: ['id', 'name', 'memberId', 'role'] },
        ],
      },
      {
        model: ExpressInterest,
        as: 'expressInterest',
        include: [
          { model: User, as: 'referralAgent', attributes: { exclude: ['password'] } },
        ],
      },
      {
        model: BookingRequestHistory,
        as: 'history',
        include: [{ model: User, as: 'actor', attributes: ['id', 'name', 'memberId', 'role'] }],
        separate: true,
        order: [['createdAt', 'ASC']],
      },
      {
        model: BookingPayment,
        as: 'payments',
        include: [{ model: User, as: 'recorder', attributes: ['id', 'name'] }],
        separate: true,
        order: [['paymentDate', 'DESC'], ['id', 'DESC']],
      },
      {
        model: BookingFollowUp,
        as: 'followUps',
        include: [{ model: User, as: 'actor', attributes: ['id', 'name'] }],
        separate: true,
        order: [['createdAt', 'DESC']],
      },
    ];
  }

  formatPurchase(row) {
    if (!row) return null;
    const r = row.toJSON ? row.toJSON() : row;
    const property = r.property || null;
    const customer = r.customer || null;
    const assigned = r.assignedAgent || null;
    const interest = r.expressInterest || null;
    const totalAmount = Number(r.totalAmount != null ? r.totalAmount : (property?.price || 0));
    const amountPaid = Number(r.amountPaid || 0);
    const finalSaleAmount = Number(r.finalSaleAmount != null ? r.finalSaleAmount : totalAmount);
    const balanceAmount = Math.max(0, finalSaleAmount - amountPaid);
    const isCompleted = String(r.status || '').toUpperCase() === 'COMPLETED';
    return {
      id: r.id,
      purchaseRequestId: r.id,
      type: 'purchase',
      expressInterestId: r.expressInterestId,
      bookingRequestId: r.bookingRequestId || null,
      bookingReference: r.bookingRequestId ? `BK-${r.bookingRequestId}` : null,
      purchaseReference: `PR-${r.id}`,
      source: r.source || 'DIRECT',
      customerId: r.customerId,
      propertyId: r.propertyId,
      assignedAgentId: r.assignedAgentId,
      status: String(r.status || '').toLowerCase(),
      statusRaw: r.status,
      paymentStatus: r.paymentStatus || 'PENDING',
      dealStatus: r.dealStatus || (isCompleted ? 'CLOSED' : 'OPEN'),
      propertyStatus: property?.status || null,
      totalAmount,
      amountPaid,
      balanceAmount,
      taxAmount: Number(r.taxAmount || 0),
      discountAmount: Number(r.discountAmount || 0),
      finalSaleAmount,
      paymentMethod: r.paymentMethod || null,
      saleDate: r.saleDate || null,
      paymentCompletedAt: r.paymentCompletedAt || null,
      completedAt: r.completedAt || null,
      isLocked: Boolean(r.isLocked) || isCompleted,
      canRecordPayment: !isCompleted && !r.isLocked && ['PURCHASE_REQUESTED', 'UNDER_VERIFICATION', 'APPROVED'].includes(String(r.status || '').toUpperCase()),
      canComplete: !isCompleted && !r.isLocked && String(r.status || '').toUpperCase() !== 'REJECTED',
      hasReceipt: Array.isArray(r.receipts) ? r.receipts.length > 0 : isCompleted,
      hasPaymentReceipts: Array.isArray(r.paymentReceipts) ? r.paymentReceipts.length > 0 : false,
      hasSaleCertificate: Boolean(r.saleCertificate) || isCompleted,
      paymentReceiptCount: Array.isArray(r.paymentReceipts) ? r.paymentReceipts.length : 0,
      remarks: r.remarks,
      adminRemarks: r.adminRemarks,
      internalRemarks: r.internalRemarks,
      rejectionReason: r.rejectionReason,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      customer: expressInterestService.formatUserBrief(customer),
      assignedAgent: expressInterestService.formatUserBrief(assigned),
      referralAgent: expressInterestService.formatUserBrief(interest?.referralAgent),
      propertyName: property?.titleEn || null,
      propertyType: property?.category?.nameEn || property?.category?.slug || null,
      postedByName: property?.postedBy?.name || null,
      ownerName: property?.contactName || property?.postedBy?.name || null,
      property: property
        ? {
            id: property.id,
            titleEn: property.titleEn,
            ventureName: property.ventureName,
            city: property.city,
            district: property.district,
            status: property.status,
            categoryName: property.category?.nameEn || null,
            propertyType: property.category?.nameEn || property.category?.slug || null,
            postedByName: property.postedBy?.name || null,
            ownerName: property.contactName || property.postedBy?.name || null,
            contactName: property.contactName || null,
          }
        : null,
      expressInterestStatus: interest?.status ? String(interest.status).toLowerCase() : null,
      payments: (r.payments || []).map((p) => ({
        id: p.id,
        amount: Number(p.amount),
        paymentDate: p.paymentDate,
        paymentMethod: p.paymentMethod,
        remarks: p.remarks,
        proofPath: p.proofPath,
        recordedByName: p.recorder?.name || null,
        createdAt: p.createdAt,
      })),
      receipts: (r.receipts || []).map((rc) => ({
        id: rc.id,
        receiptNumber: rc.receiptNumber,
        receiptType: rc.receiptType,
        receiptDate: rc.receiptDate,
      })),
      paymentReceipts: (r.paymentReceipts || []).map((rc) => ({
        id: rc.id,
        receiptNumber: rc.receiptNumber,
        receiptDate: rc.receiptDate,
        amount: Number(rc.amount || 0),
        status: rc.status,
      })),
      saleCertificate: r.saleCertificate
        ? {
            id: r.saleCertificate.id,
            saleConfirmationNumber: r.saleCertificate.saleConfirmationNumber,
            saleDate: r.saleCertificate.saleDate,
            generatedDate: r.saleCertificate.generatedDate,
            status: r.saleCertificate.status,
          }
        : null,
      closedDeal: r.closedDeal
        ? {
            id: r.closedDeal.id,
            dealCode: r.closedDeal.dealCode,
            dealStatus: r.closedDeal.dealStatus,
            commissionStatus: r.closedDeal.commissionStatus,
            saleAmount: Number(r.closedDeal.saleAmount || 0),
            purchaseDate: r.closedDeal.purchaseDate,
          }
        : null,
      timeline: (r.salesHistory || []).map((h) => ({
        id: h.id,
        eventType: h.eventType,
        fromStatus: h.fromStatus,
        toStatus: h.toStatus,
        amount: h.amount != null ? Number(h.amount) : null,
        note: h.note,
        createdAt: h.createdAt,
      })),
      history: (r.history || []).map((h) => ({
        id: h.id,
        fromStatus: h.fromStatus,
        toStatus: h.toStatus,
        note: h.note,
        actorName: h.actor?.name || null,
        createdAt: h.createdAt,
      })),
    };
  }

  formatBooking(row, req = null) {
    if (!row) return null;
    const r = row.toJSON ? row.toJSON() : row;
    const property = r.property || null;
    const customer = r.customer || null;
    const assigned = r.assignedAgent || null;
    const interest = r.expressInterest || null;
    const base = {
      id: r.id,
      bookingRequestId: r.id,
      type: 'booking',
      expressInterestId: r.expressInterestId,
      customerId: r.customerId,
      propertyId: r.propertyId,
      assignedAgentId: r.assignedAgentId,
      status: String(r.status || '').toLowerCase(),
      statusRaw: r.status,
      remarks: r.remarks,
      adminRemarks: r.adminRemarks,
      internalRemarks: r.internalRemarks,
      rejectionReason: r.rejectionReason,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      customer: expressInterestService.formatUserBrief(customer),
      assignedAgent: expressInterestService.formatUserBrief(assigned),
      referralAgent: expressInterestService.formatUserBrief(interest?.referralAgent),
      propertyName: property?.titleEn || null,
      propertyType: property?.category?.nameEn || property?.category?.slug || null,
      postedByName: property?.postedBy?.name || null,
      ownerName: property?.contactName || property?.postedBy?.name || null,
      mapPlotId: r.mapPlotId || interest?.mapPlotId || null,
      mapPlotNo: interest?.mapPlotNo || null,
      mapPhase: interest?.mapPhase || null,
      mapPlotExternalId: interest?.mapPlotExternalId || null,
      property: property
        ? {
            id: property.id,
            titleEn: property.titleEn,
            ventureName: property.ventureName,
            city: property.city,
            price: property.price != null ? Number(property.price) : null,
            status: property.status,
            propertyType: property.category?.nameEn || property.category?.slug || null,
            postedByName: property.postedBy?.name || null,
            ownerName: property.contactName || property.postedBy?.name || null,
            contactName: property.contactName || null,
          }
        : null,
      expressInterestStatus: interest?.status ? String(interest.status).toLowerCase() : null,
      history: (r.history || []).map((h) => ({
        id: h.id,
        fromStatus: h.fromStatus,
        toStatus: h.toStatus,
        note: h.note,
        actorName: h.actor?.name || null,
        createdAt: h.createdAt,
      })),
    };
    if (base.mapPlotNo) {
      const phaseLabel = base.mapPhase ? `Phase ${base.mapPhase}` : null;
      const plotLabel = `Plot ${base.mapPlotNo}${phaseLabel ? ` (${phaseLabel})` : ''}`;
      base.propertyName = property?.titleEn
        ? `${plotLabel} — ${property.titleEn}`
        : plotLabel;
    }
    return bookingManagementService.enrichBooking(base, row, req);
  }

  async logActivity(entityType, entityId, action, details, createdBy, transaction) {
    await ActivityLog.create({
      entityType,
      entityId,
      action,
      details: details ? String(details) : null,
      createdBy: createdBy || null,
    }, { transaction });
  }

  async assertCanDecide(interest, customer) {
    if (!interest) {
      const err = new Error('Express interest not found.');
      err.status = 404;
      throw err;
    }
    if (interest.customerId !== customer.id) {
      const err = new Error('You can only decide on your own express interest.');
      err.status = 403;
      throw err;
    }
    if (!DECISION_ELIGIBLE.includes(interest.status)) {
      const err = new Error('Express interest must be approved before you can proceed.');
      err.status = 400;
      throw err;
    }
    if (interest.customerDecision) {
      const err = new Error('A purchase or booking decision was already submitted for this interest.');
      err.status = 409;
      throw err;
    }
  }

  async submitPurchase(interestId, customer, body = {}) {
    const interest = await ExpressInterest.findByPk(Number(interestId));
    await this.assertCanDecide(interest, customer);

    const remarks = String(body.remarks || '').trim() || null;
    const agentId = interest.assignedAgentId || interest.referralAgentId || null;

    const resultId = await sequelize.transaction(async (transaction) => {
      const from = interest.status;
      await interest.update({
        status: 'PURCHASE_REQUESTED',
        customerDecision: 'PURCHASE',
        decisionAt: new Date(),
        modifiedBy: customer.id,
      }, { transaction });

      await ExpressInterestHistory.create({
        interestId: interest.id,
        fromStatus: from,
        toStatus: 'PURCHASE_REQUESTED',
        note: remarks || 'Customer selected Purchase (Buy)',
        createdBy: customer.id,
      }, { transaction });

      const property = await Property.findByPk(interest.propertyId, { transaction });
      const price = Number(property?.price || 0);

      const purchase = await PurchaseRequest.create({
        expressInterestId: interest.id,
        customerId: customer.id,
        propertyId: interest.propertyId,
        assignedAgentId: agentId,
        status: 'PURCHASE_REQUESTED',
        source: 'DIRECT',
        totalAmount: price,
        finalSaleAmount: price,
        amountPaid: 0,
        paymentStatus: 'PENDING',
        dealStatus: 'OPEN',
        remarks,
        createdBy: customer.id,
        modifiedBy: customer.id,
      }, { transaction });

      await PurchaseRequestHistory.create({
        purchaseRequestId: purchase.id,
        fromStatus: null,
        toStatus: 'PURCHASE_REQUESTED',
        note: remarks || 'Purchase request submitted',
        createdBy: customer.id,
      }, { transaction });

      await this.logActivity(
        'PurchaseRequest',
        purchase.id,
        'SUBMITTED',
        `Linked to ExpressInterest #${interest.id}`,
        customer.id,
        transaction
      );

      return purchase.id;
    });

    const formatted = await this.getPurchaseById(resultId);
    const propertyTitle = formatted.propertyName || `Property #${formatted.propertyId}`;

    await notificationService.create({
      userId: customer.id,
      userRole: ROLES.CUSTOMER,
      titleEn: 'Purchase Request Submitted',
      messageEn: `Your purchase request for "${propertyTitle}" was submitted.`,
      notificationType: 'purchase_request_submitted',
      referenceType: 'purchase_request',
      referenceId: resultId,
      linkPath: '/buyer/purchases',
      createdBy: customer.id,
    });

    await notificationService.notifyAdmins({
      titleEn: 'New Purchase Request',
      messageEn: `${formatted.customer?.name || 'Customer'} submitted a purchase request for "${propertyTitle}".`,
      notificationType: 'purchase_request_new',
      referenceType: 'purchase_request',
      referenceId: resultId,
      linkPath: '/admin/purchases',
      createdBy: customer.id,
    });

    if (agentId) {
      await notificationService.create({
        userId: agentId,
        userRole: ROLES.AGENT,
        titleEn: 'Customer Selected Purchase',
        messageEn: `Customer selected Purchase for "${propertyTitle}".`,
        notificationType: 'purchase_request_agent',
        referenceType: 'purchase_request',
        referenceId: resultId,
        linkPath: '/mediator/purchases',
        createdBy: customer.id,
      });
    }

    return formatted;
  }

  async submitBooking(interestId, customer, body = {}) {
    const interest = await ExpressInterest.findByPk(Number(interestId));
    await this.assertCanDecide(interest, customer);

    const remarks = String(body.remarks || '').trim() || null;
    const agentId = interest.assignedAgentId || interest.referralAgentId || null;
    const bookingDate = new Date();
    const expiry = bookingManagementService.addDays(bookingDate, BookingRequest.RESERVATION_DAYS || 15);
    const mapPlotId = interest.mapPlotId || null;
    const mapBookingService = mapPlotId ? require('./mapBookingService') : null;

    const resultId = await sequelize.transaction(async (transaction) => {
      let totalAmount = null;
      let property = null;

      if (mapPlotId) {
        const MapPlot = require('../models').MapPlot;
        const plot = await MapPlot.findByPk(mapPlotId, {
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
        if (!plot) {
          const err = new Error('Map plot not found.');
          err.status = 404;
          throw err;
        }
        if (plot.status !== 'available') {
          const err = new Error('This plot is already reserved or sold and is not available for booking.');
          err.status = 409;
          err.code = 'PLOT_NOT_AVAILABLE';
          throw err;
        }
        const plotType = String(plot.plotType || 'residential').toLowerCase();
        if (plotType !== 'residential') {
          const err = new Error('This plot is not available for booking (amenities/commercial).');
          err.status = 409;
          err.code = 'PLOT_NOT_SALEABLE';
          throw err;
        }
        property = await bookingManagementService.assertPropertyAvailable(
          interest.propertyId,
          transaction,
          { mapPlotId }
        );
        totalAmount = plot.plotCost != null ? Number(plot.plotCost) : null;
      } else {
        property = await bookingManagementService.assertPropertyAvailable(interest.propertyId, transaction);
        totalAmount = property.price != null ? Number(property.price) : null;
      }

      const from = interest.status;
      await interest.update({
        status: 'BOOKING_REQUESTED',
        customerDecision: 'BOOKING',
        decisionAt: new Date(),
        modifiedBy: customer.id,
      }, { transaction });

      await ExpressInterestHistory.create({
        interestId: interest.id,
        fromStatus: from,
        toStatus: 'BOOKING_REQUESTED',
        note: remarks || 'Customer selected Booking',
        createdBy: customer.id,
      }, { transaction });

      const booking = await BookingRequest.create({
        expressInterestId: interest.id,
        customerId: customer.id,
        propertyId: interest.propertyId,
        mapPlotId,
        assignedAgentId: agentId,
        status: 'BOOKING_REQUESTED',
        remarks,
        bookingDate,
        expiryDate: expiry,
        originalExpiryDate: expiry,
        totalAmount,
        amountPaid: 0,
        paymentStatus: 'PENDING',
        followUpStatus: 'PENDING_CUSTOMER_RESPONSE',
        reminderFlags: {},
        createdBy: customer.id,
        modifiedBy: customer.id,
      }, { transaction });

      await BookingRequestHistory.create({
        bookingRequestId: booking.id,
        fromStatus: null,
        toStatus: 'BOOKING_REQUESTED',
        note: remarks || `Booking created. Reserved for ${BookingRequest.RESERVATION_DAYS || 15} days.`,
        createdBy: customer.id,
      }, { transaction });

      if (mapPlotId) {
        await mapBookingService.book(
          mapPlotId,
          {
            customerId: customer.id,
            customerName: customer.name,
            bookingRequestId: booking.id,
            remarks,
          },
          customer,
          { transaction }
        );
      } else {
        await bookingManagementService.reserveProperty(interest.propertyId, transaction);
      }

      await this.logActivity(
        'BookingRequest',
        booking.id,
        'SUBMITTED',
        mapPlotId
          ? `Linked to ExpressInterest #${interest.id}. Map plot reserved until ${expiry.toISOString()}`
          : `Linked to ExpressInterest #${interest.id}. Property reserved until ${expiry.toISOString()}`,
        customer.id,
        transaction
      );

      return booking.id;
    });

    const formatted = await this.getBookingById(resultId);
    const propertyTitle = formatted.propertyName || `Property #${formatted.propertyId}`;

    await notificationService.create({
      userId: customer.id,
      userRole: ROLES.CUSTOMER,
      titleEn: 'Booking Created',
      messageEn: `Your booking for "${propertyTitle}" was created. Reserved for ${BookingRequest.RESERVATION_DAYS || 15} days.`,
      notificationType: 'booking_created',
      referenceType: 'booking_request',
      referenceId: resultId,
      linkPath: `/buyer/bookings/${resultId}`,
      createdBy: customer.id,
    });

    await notificationService.notifyAdmins({
      titleEn: 'New Booking',
      messageEn: `${formatted.customer?.name || 'Customer'} booked "${propertyTitle}". Now reserved.`,
      notificationType: 'booking_request_new',
      referenceType: 'booking_request',
      referenceId: resultId,
      linkPath: '/admin/bookings',
      createdBy: customer.id,
    });

    if (agentId) {
      await notificationService.create({
        userId: agentId,
        userRole: ROLES.AGENT,
        titleEn: 'Customer Booking',
        messageEn: `${formatted.customer?.name || 'Customer'} booked "${propertyTitle}".`,
        notificationType: 'booking_agent_notify',
        referenceType: 'booking_request',
        referenceId: resultId,
        linkPath: '/mediator/bookings',
        createdBy: customer.id,
      });
    }

    return formatted;
  }

  async listPurchases(filters = {}, { actor = null } = {}) {
    const where = {};
    if (filters.status) where.status = String(filters.status).trim().toUpperCase();
    if (actor?.role === ROLES.CUSTOMER) where.customerId = actor.id;
    else if (actor?.role === ROLES.AGENT) where.assignedAgentId = actor.id;

    const page = Math.max(1, Number(filters.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(filters.pageSize) || 50));
    const { rows, count } = await PurchaseRequest.findAndCountAll({
      where,
      include: this.purchaseIncludes(),
      order: [['createdAt', 'DESC']],
      limit: pageSize,
      offset: (page - 1) * pageSize,
      distinct: true,
    });

    return {
      items: rows.map((r) => this.formatPurchase(r)),
      total: count,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(count / pageSize)),
    };
  }

  async listBookings(filters = {}, { actor = null } = {}) {
    const where = {};
    if (filters.status) where.status = String(filters.status).trim().toUpperCase();
    if (actor?.role === ROLES.CUSTOMER) where.customerId = actor.id;
    else if (actor?.role === ROLES.AGENT) where.assignedAgentId = actor.id;

    const page = Math.max(1, Number(filters.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(filters.pageSize) || 50));
    const { rows, count } = await BookingRequest.findAndCountAll({
      where,
      include: this.bookingIncludes(),
      order: [['createdAt', 'DESC']],
      limit: pageSize,
      offset: (page - 1) * pageSize,
      distinct: true,
    });

    return {
      items: rows.map((r) => this.formatBooking(r)),
      total: count,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(count / pageSize)),
    };
  }

  async getPurchaseById(id, { actor = null } = {}) {
    const row = await PurchaseRequest.findByPk(Number(id), { include: this.purchaseIncludes() });
    if (!row) {
      const err = new Error('Purchase request not found.');
      err.status = 404;
      throw err;
    }
    if (actor?.role === ROLES.CUSTOMER && row.customerId !== actor.id) {
      const err = new Error('Access denied.');
      err.status = 403;
      throw err;
    }
    if (actor?.role === ROLES.AGENT && row.assignedAgentId !== actor.id) {
      const err = new Error('Access denied.');
      err.status = 403;
      throw err;
    }
    return this.formatPurchase(row);
  }

  async getBookingById(id, { actor = null } = {}) {
    const row = await BookingRequest.findByPk(Number(id), { include: this.bookingIncludes() });
    if (!row) {
      const err = new Error('Booking request not found.');
      err.status = 404;
      throw err;
    }
    if (actor?.role === ROLES.CUSTOMER && row.customerId !== actor.id) {
      const err = new Error('Access denied.');
      err.status = 403;
      throw err;
    }
    if (actor?.role === ROLES.AGENT && row.assignedAgentId !== actor.id) {
      const err = new Error('Access denied.');
      err.status = 403;
      throw err;
    }
    return this.formatBooking(row);
  }

  async updatePurchaseStatus(id, adminUser, body = {}) {
    const nextStatus = String(body.status || '').trim().toUpperCase();
    if (nextStatus === 'COMPLETED') {
      return purchaseCompletionService.completePurchase(id, adminUser, body);
    }

    const row = await PurchaseRequest.findByPk(Number(id));
    if (!row) {
      const err = new Error('Purchase request not found.');
      err.status = 404;
      throw err;
    }
    purchaseCompletionService.assertNotLocked(row);
    if (!PURCHASE_STATUSES.includes(nextStatus)) {
      const err = new Error('Invalid purchase status.');
      err.status = 400;
      throw err;
    }
    const note = String(body.remarks || body.adminRemarks || body.note || '').trim() || `Status updated to ${nextStatus}`;
    const from = row.status;

    await sequelize.transaction(async (transaction) => {
      await row.update({
        status: nextStatus,
        adminRemarks: body.adminRemarks != null ? String(body.adminRemarks).trim() : row.adminRemarks,
        rejectionReason: nextStatus === 'REJECTED'
          ? (String(body.reason || body.rejectionReason || note).trim() || row.rejectionReason)
          : row.rejectionReason,
        modifiedBy: adminUser.id,
      }, { transaction });
      await PurchaseRequestHistory.create({
        purchaseRequestId: row.id,
        fromStatus: from,
        toStatus: nextStatus,
        note,
        createdBy: adminUser.id,
      }, { transaction });
      await this.logActivity('PurchaseRequest', row.id, 'STATUS_UPDATE', note, adminUser.id, transaction);
    });

    const formatted = await this.getPurchaseById(row.id);
    const propertyTitle = formatted.propertyName || `Property #${formatted.propertyId}`;

    await notificationService.create({
      userId: row.customerId,
      userRole: ROLES.CUSTOMER,
      titleEn: 'Purchase Status Updated',
      messageEn: `Your purchase request for "${propertyTitle}" is now ${nextStatus.replace(/_/g, ' ').toLowerCase()}.`,
      notificationType: 'purchase_status_update',
      referenceType: 'purchase_request',
      referenceId: row.id,
      linkPath: '/buyer/purchases',
      createdBy: adminUser.id,
    });

    if (row.assignedAgentId) {
      await notificationService.create({
        userId: row.assignedAgentId,
        userRole: ROLES.AGENT,
        titleEn: 'Purchase Status Updated',
        messageEn: `Purchase request #${row.id} for "${propertyTitle}" is now ${nextStatus.replace(/_/g, ' ').toLowerCase()}.`,
        notificationType: 'purchase_status_update_agent',
        referenceType: 'purchase_request',
        referenceId: row.id,
        linkPath: '/mediator/purchases',
        createdBy: adminUser.id,
      });
    }

    return formatted;
  }

  async updateBookingStatus(id, adminUser, body = {}) {
    const nextStatus = String(body.status || '').trim().toUpperCase();

    if (nextStatus === 'CANCELLED') {
      return bookingManagementService.cancelBooking(id, adminUser, body);
    }
    if (nextStatus === 'CONVERTED_TO_PURCHASE') {
      const result = await bookingManagementService.convertToPurchase(id, adminUser, body);
      return result.booking;
    }

    const row = await BookingRequest.findByPk(Number(id));
    if (!row) {
      const err = new Error('Booking request not found.');
      err.status = 404;
      throw err;
    }
    if (!BOOKING_STATUSES.includes(nextStatus)) {
      const err = new Error('Invalid booking status.');
      err.status = 400;
      throw err;
    }
    const note = String(body.remarks || body.adminRemarks || body.note || '').trim() || `Status updated to ${nextStatus}`;
    const from = row.status;

    await sequelize.transaction(async (transaction) => {
      await row.update({
        status: nextStatus,
        adminRemarks: body.adminRemarks != null ? String(body.adminRemarks).trim() : row.adminRemarks,
        rejectionReason: nextStatus === 'REJECTED'
          ? (String(body.reason || body.rejectionReason || note).trim() || row.rejectionReason)
          : row.rejectionReason,
        modifiedBy: adminUser.id,
      }, { transaction });
      await BookingRequestHistory.create({
        bookingRequestId: row.id,
        fromStatus: from,
        toStatus: nextStatus,
        note,
        createdBy: adminUser.id,
      }, { transaction });

      if (nextStatus === 'REJECTED' || nextStatus === 'BOOKING_EXPIRED' || nextStatus === 'CANCELLED') {
        await bookingManagementService.releaseBookingReservation(row, transaction);
      }
      if (
        !row.mapPlotId
        && (nextStatus === 'BOOKING_APPROVED' || nextStatus === 'BOOKING_CONFIRMED')
      ) {
        await bookingManagementService.reserveProperty(row.propertyId, transaction);
      }

      await this.logActivity('BookingRequest', row.id, 'STATUS_UPDATE', note, adminUser.id, transaction);
    });

    const formatted = await this.getBookingById(row.id);
    const propertyTitle = formatted.propertyName || `Property #${formatted.propertyId}`;
    const titleEn = nextStatus === 'BOOKING_APPROVED' ? 'Booking Approved' : 'Booking Status Updated';

    await notificationService.create({
      userId: row.customerId,
      userRole: ROLES.CUSTOMER,
      titleEn,
      messageEn: `Your booking for "${propertyTitle}" is now ${nextStatus.replace(/_/g, ' ').toLowerCase()}.`,
      notificationType: nextStatus === 'BOOKING_APPROVED' ? 'booking_approved' : 'booking_status_update',
      referenceType: 'booking_request',
      referenceId: row.id,
      linkPath: `/buyer/bookings/${row.id}`,
      createdBy: adminUser.id,
    });

    if (row.assignedAgentId) {
      await notificationService.create({
        userId: row.assignedAgentId,
        userRole: ROLES.AGENT,
        titleEn,
        messageEn: `Booking request #${row.id} for "${propertyTitle}" is now ${nextStatus.replace(/_/g, ' ').toLowerCase()}.`,
        notificationType: 'booking_status_update_agent',
        referenceType: 'booking_request',
        referenceId: row.id,
        linkPath: '/mediator/bookings',
        createdBy: adminUser.id,
      });
    }

    return formatted;
  }

  async addPurchaseRemarks(id, actor, remarks) {
    const row = await PurchaseRequest.findByPk(Number(id));
    if (!row) {
      const err = new Error('Purchase request not found.');
      err.status = 404;
      throw err;
    }
    purchaseCompletionService.assertNotLocked(row);
    const text = String(remarks || '').trim();
    if (!text) {
      const err = new Error('Remarks are required.');
      err.status = 400;
      throw err;
    }
    const isAdmin = actor.role === ROLES.ADMIN;
    await row.update({
      ...(isAdmin ? { internalRemarks: text } : {}),
      ...(!isAdmin ? { remarks: text } : {}),
      modifiedBy: actor.id,
    });
    await PurchaseRequestHistory.create({
      purchaseRequestId: row.id,
      fromStatus: row.status,
      toStatus: row.status,
      note: `${isAdmin ? 'Internal' : 'Follow-up'} remark: ${text}`,
      createdBy: actor.id,
    });
    return this.getPurchaseById(row.id);
  }

  async addBookingRemarks(id, actor, remarks) {
    const row = await BookingRequest.findByPk(Number(id));
    if (!row) {
      const err = new Error('Booking request not found.');
      err.status = 404;
      throw err;
    }
    const text = String(remarks || '').trim();
    if (!text) {
      const err = new Error('Remarks are required.');
      err.status = 400;
      throw err;
    }
    const isAdmin = actor.role === ROLES.ADMIN;
    await row.update({
      ...(isAdmin ? { internalRemarks: text } : {}),
      ...(!isAdmin ? { remarks: text } : {}),
      modifiedBy: actor.id,
    });
    await BookingRequestHistory.create({
      bookingRequestId: row.id,
      fromStatus: row.status,
      toStatus: row.status,
      note: `${isAdmin ? 'Internal' : 'Follow-up'} remark: ${text}`,
      createdBy: actor.id,
    });
    return this.getBookingById(row.id);
  }
}

module.exports = new InterestDecisionService();
