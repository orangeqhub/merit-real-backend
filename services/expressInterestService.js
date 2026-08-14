'use strict';

const { Op } = require('sequelize');
const {
  ExpressInterest,
  ExpressInterestHistory,
  FollowUpRemark,
  ActivityLog,
  User,
  Property,
  PropertyCategory,
  PropertyImage,
  PurchaseRequest,
  BookingRequest,
  MapPlot,
  sequelize,
} = require('../models');
const { ROLES, USER_STATUSES } = require('../constants/roles');
const { EMPLOYEE_PERMISSIONS } = require('../constants/employeePermissions');
const notificationService = require('./notificationService');
const layoutPropertyService = require('./layoutPropertyService');
const { expressInterestLink } = require('../utils/notificationLinks');
const { emitExpressInterestUpdated } = require('../utils/realtime');

const OPEN_STATUSES = ['PENDING_APPROVAL', 'APPROVED', 'ASSIGNED', 'PURCHASE_REQUESTED', 'BOOKING_REQUESTED'];

class ExpressInterestService {
  detailIncludes() {
    return [
      { model: User, as: 'customer', attributes: { exclude: ['password'] } },
      { model: User, as: 'referralAgent', attributes: { exclude: ['password'] } },
      { model: User, as: 'assignedAgent', attributes: { exclude: ['password'] } },
      { model: User, as: 'assignedEmployee', attributes: { exclude: ['password'] } },
      {
        model: Property,
        as: 'property',
        include: [
          { model: PropertyCategory, as: 'category' },
          { model: PropertyImage, as: 'images' },
        ],
      },
      {
        model: ExpressInterestHistory,
        as: 'history',
        include: [{ model: User, as: 'actor', attributes: ['id', 'name', 'memberId', 'role'] }],
        separate: true,
        order: [['createdAt', 'ASC']],
      },
      {
        model: FollowUpRemark,
        as: 'followUps',
        include: [{ model: User, as: 'agent', attributes: ['id', 'name', 'memberId'] }],
        separate: true,
        order: [['createdAt', 'DESC']],
      },
      { model: PurchaseRequest, as: 'purchaseRequest' },
      { model: BookingRequest, as: 'bookingRequest' },
      {
        model: MapPlot,
        as: 'mapPlot',
        attributes: [
          'id',
          'externalId',
          'plotNo',
          'phase',
          'status',
          'plotArea',
          'facing',
          'plotCost',
          'ratePerSqYd',
          'plotType',
        ],
      },
    ];
  }

  formatUserBrief(user) {
    if (!user) return null;
    const u = user.toJSON ? user.toJSON() : user;
    return {
      id: u.id,
      memberId: u.memberId,
      name: u.name,
      mobile: u.mobile,
      email: u.email,
      role: u.role,
      agentGrade: u.agentGrade || null,
      status: u.status,
      district: u.district || null,
      city: u.city || null,
      address: u.address || null,
      preferredPropertyType: u.preferredPropertyType || null,
      createdAt: u.createdAt || null,
      approvedAt: u.approvedAt || null,
    };
  }

  format(row) {
    if (!row) return null;
    const r = row.toJSON ? row.toJSON() : row;
    const property = r.property || null;
    const customer = r.customer || null;
    const assigned = r.assignedAgent || null;
    const assignedEmployee = r.assignedEmployee || null;
    const referral = r.referralAgent || null;
    const employeeWorkflowStatus = r.employeeWorkflowStatus || 'new';

    const formatted = {
      id: r.id,
      interestId: r.id,
      customerId: r.customerId,
      propertyId: r.propertyId,
      referralAgentId: r.referralAgentId,
      assignedAgentId: r.assignedAgentId,
      assignedEmployeeId: r.assignedEmployeeId || null,
      status: String(r.status || '').toLowerCase(),
      statusRaw: r.status,
      // Employee portal uses workflow status as primary contact status
      employeeWorkflowStatus,
      priority: r.priority || 'medium',
      nextFollowUpAt: r.nextFollowUpAt || null,
      isActiveLead: ['APPROVED', 'ASSIGNED', 'PURCHASE_REQUESTED', 'BOOKING_REQUESTED'].includes(r.status),
      canProceed: ['APPROVED', 'ASSIGNED'].includes(r.status) && !r.customerDecision,
      customerDecision: r.customerDecision || null,
      decisionAt: r.decisionAt || null,
      purchaseRequestId: r.purchaseRequest?.id || null,
      bookingRequestId: r.bookingRequest?.id || null,
      purchaseStatus: r.purchaseRequest?.status ? String(r.purchaseRequest.status).toLowerCase() : null,
      bookingStatus: r.bookingRequest?.status ? String(r.bookingRequest.status).toLowerCase() : null,
      remarks: r.remarks,
      message: r.remarks,
      adminRemarks: r.adminRemarks,
      internalRemarks: r.internalRemarks,
      followUpStatus: r.followUpStatus || 'NEW',
      referralAgentCode: r.referralAgentCode,
      referralAgentName: r.referralAgentNameSnapshot || referral?.name || null,
      rejectionReason: r.rejectionReason,
      approvedById: r.approvedById,
      approvedAt: r.approvedAt,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      submissionDate: r.createdAt,
      // Compatibility with legacy enquiry UI
      buyerName: customer?.name || null,
      buyerPhone: customer?.mobile || null,
      buyerEmail: customer?.email || null,
      channel: 'interest',
      customer: this.formatUserBrief(customer),
      referralAgent: this.formatUserBrief(referral),
      assignedAgent: this.formatUserBrief(assigned),
      assignedEmployee: this.formatUserBrief(assignedEmployee),
      agentGrade: assigned?.agentGrade || referral?.agentGrade || null,
      property: property
        ? {
            id: property.id,
            titleEn: property.titleEn,
            titleTe: property.titleTe,
            ventureName: property.ventureName,
            city: property.city,
            status: property.status,
            categorySlug: property.category?.slug || null,
            categoryName: property.category?.nameEn || null,
          }
        : null,
      propertyName: property?.titleEn || null,
      project: property?.ventureName || property?.category?.nameEn || null,
      mapPlotId: r.mapPlotId || null,
      mapPlotExternalId: r.mapPlotExternalId || r.mapPlot?.externalId || null,
      mapPlotNo: r.mapPlotNo || r.mapPlot?.plotNo || null,
      mapPhase: r.mapPhase != null ? Number(r.mapPhase) : (r.mapPlot?.phase != null ? Number(r.mapPlot.phase) : null),
      mapPlot: r.mapPlot
        ? {
            id: r.mapPlot.id,
            externalId: r.mapPlot.externalId,
            plotNo: r.mapPlot.plotNo,
            phase: Number(r.mapPlot.phase) === 2 ? 2 : 1,
            status: r.mapPlot.status,
            plotArea: r.mapPlot.plotArea != null ? Number(r.mapPlot.plotArea) : null,
            facing: r.mapPlot.facing || null,
            plotCost: r.mapPlot.plotCost != null ? Number(r.mapPlot.plotCost) : null,
            ratePerSqYd: r.mapPlot.ratePerSqYd != null ? Number(r.mapPlot.ratePerSqYd) : null,
            plotType: r.mapPlot.plotType || 'residential',
          }
        : null,
      history: (r.history || []).map((h) => ({
        id: h.id,
        fromStatus: h.fromStatus,
        toStatus: h.toStatus,
        note: h.note,
        createdBy: h.createdBy,
        actorName: h.actor?.name || null,
        createdAt: h.createdAt,
      })),
      followUps: (r.followUps || []).map((f) => ({
        id: f.id,
        remark: f.remark,
        followUpStatus: f.followUpStatus,
        agentId: f.agentId,
        agentName: f.agent?.name || null,
        createdAt: f.createdAt,
      })),
    };

    if (formatted.mapPlotNo) {
      const phaseLabel = formatted.mapPhase ? `Phase ${formatted.mapPhase}` : null;
      const plotLabel = `Plot ${formatted.mapPlotNo}${phaseLabel ? ` (${phaseLabel})` : ''}`;
      formatted.propertyName = property?.titleEn
        ? `${plotLabel} — ${property.titleEn}`
        : plotLabel;
    }

    return formatted;
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

  async addHistory(interestId, fromStatus, toStatus, note, createdBy, transaction) {
    await ExpressInterestHistory.create({
      interestId,
      fromStatus,
      toStatus,
      note: note || null,
      createdBy: createdBy || null,
    }, { transaction });
  }

  async findAgentByCode(code) {
    const raw = String(code || '').trim();
    if (!raw) return null;

    const where = {
      role: ROLES.AGENT,
      status: USER_STATUSES.ACTIVE,
    };

    if (/^\d+$/.test(raw)) {
      where.id = Number(raw);
    } else {
      where.memberId = { [Op.iLike]: raw };
    }

    return User.findOne({ where, attributes: { exclude: ['password'] } });
  }

  async validateAgent(code) {
    const agent = await this.findAgentByCode(code);
    if (!agent) {
      const err = new Error('Agent not found. Please check the Agent ID / Referral Code.');
      err.status = 404;
      err.code = 'AGENT_NOT_FOUND';
      throw err;
    }
    return {
      id: agent.id,
      memberId: agent.memberId,
      name: agent.name,
      agentGrade: agent.agentGrade,
      mobile: agent.mobile,
      email: agent.email,
      status: agent.status,
    };
  }

  async searchAgentsByName(searchText, { limit = 15 } = {}) {
    return this.searchAgents(searchText, { limit });
  }

  /** Search active approved agents by name or referral code (memberId). */
  async searchAgents(searchText, { limit = 15 } = {}) {
    const q = String(searchText || '').trim();
    if (q.length < 2) return [];

    const rows = await User.findAll({
      where: {
        role: ROLES.AGENT,
        status: USER_STATUSES.ACTIVE,
        [Op.or]: [
          { name: { [Op.iLike]: `%${q}%` } },
          { memberId: { [Op.iLike]: `%${q}%` } },
        ],
      },
      attributes: ['id', 'memberId', 'name', 'agentGrade', 'status'],
      order: [['name', 'ASC']],
      limit: Math.min(25, Math.max(1, Number(limit) || 15)),
    });

    return rows.map((agent) => ({
      id: agent.id,
      agentId: agent.id,
      memberId: agent.memberId,
      agentName: agent.name,
      name: agent.name,
      agentReferralCode: agent.memberId,
      agentGrade: agent.agentGrade,
      status: agent.status,
    }));
  }

  async getById(id, { actor = null } = {}) {
    const row = await ExpressInterest.findByPk(Number(id), { include: this.detailIncludes() });
    if (!row) {
      const err = new Error('Express interest not found.');
      err.status = 404;
      err.code = 'INTEREST_NOT_FOUND';
      throw err;
    }

    if (actor?.role === ROLES.CUSTOMER && row.customerId !== actor.id) {
      const err = new Error('You do not have access to this interest.');
      err.status = 403;
      err.code = 'FORBIDDEN';
      throw err;
    }

    if (actor?.role === ROLES.AGENT && row.assignedAgentId !== actor.id && row.referralAgentId !== actor.id) {
      const err = new Error('You do not have access to this lead.');
      err.status = 403;
      err.code = 'FORBIDDEN';
      throw err;
    }

    if (actor?.role === ROLES.EMPLOYEE) {
      const perms = Array.isArray(actor.permissions) ? actor.permissions : [];
      const canViewUnassigned = perms.includes(EMPLOYEE_PERMISSIONS.VIEW_UNASSIGNED_RECORDS);
      const isAssigned = row.assignedEmployeeId === actor.id;
      const isUnassigned = !row.assignedEmployeeId;
      if (!isAssigned && !(isUnassigned && canViewUnassigned)) {
        const err = new Error('You do not have access to this lead.');
        err.status = 403;
        err.code = 'FORBIDDEN';
        throw err;
      }
    }

    return this.format(row);
  }

  async list(filters = {}, { actor = null } = {}) {
    const where = {};

    if (filters.status) {
      where.status = String(filters.status).trim().toUpperCase();
    }
    if (filters.customerId) where.customerId = Number(filters.customerId);
    if (filters.propertyId) where.propertyId = Number(filters.propertyId);
    if (filters.assignedAgentId) where.assignedAgentId = Number(filters.assignedAgentId);
    if (filters.assignedEmployeeId) where.assignedEmployeeId = Number(filters.assignedEmployeeId);

    if (actor?.role === ROLES.CUSTOMER) {
      where.customerId = actor.id;
    } else if (actor?.role === ROLES.AGENT) {
      where[Op.or] = [
        { assignedAgentId: actor.id },
        { referralAgentId: actor.id },
      ];
    } else if (actor?.role === ROLES.EMPLOYEE) {
      const perms = Array.isArray(actor.permissions) ? actor.permissions : [];
      const canViewUnassigned = perms.includes(EMPLOYEE_PERMISSIONS.VIEW_UNASSIGNED_RECORDS);
      if (canViewUnassigned) {
        where[Op.or] = [
          { assignedEmployeeId: actor.id },
          { assignedEmployeeId: null },
        ];
      } else {
        where.assignedEmployeeId = actor.id;
      }
    }

    const page = Math.max(1, Number(filters.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(filters.pageSize) || 50));
    const offset = (page - 1) * pageSize;

    const { rows, count } = await ExpressInterest.findAndCountAll({
      where,
      include: this.detailIncludes(),
      order: [['createdAt', 'DESC']],
      limit: pageSize,
      offset,
      distinct: true,
    });

    return {
      items: rows.map((r) => this.format(r)),
      total: count,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(count / pageSize)),
    };
  }

  async submit(body, customer, req = null) {
    const mapPlotKey = String(
      body.mapPlotExternalId || body.mapPlotId || body.externalId || body.plotId || ''
    ).trim();
    let mapPlot = null;
    let property = null;
    let propertyId = Number(body.propertyId) || null;

    if (mapPlotKey) {
      const where = /^\d+$/.test(mapPlotKey)
        ? { id: Number(mapPlotKey) }
        : { externalId: mapPlotKey };
      mapPlot = await MapPlot.findOne({ where });
      if (!mapPlot) {
        const err = new Error('Plot not found.');
        err.status = 404;
        err.code = 'PLOT_NOT_FOUND';
        throw err;
      }
      if (mapPlot.status !== 'available') {
        const err = new Error('This plot is not available for booking.');
        err.status = 409;
        err.code = 'PLOT_NOT_AVAILABLE';
        throw err;
      }
      const plotType = String(mapPlot.plotType || 'residential').toLowerCase();
      if (plotType !== 'residential') {
        const err = new Error('This plot is not available for booking (amenities/commercial).');
        err.status = 409;
        err.code = 'PLOT_NOT_SALEABLE';
        throw err;
      }

      const openForPlot = await ExpressInterest.findOne({
        where: {
          mapPlotId: mapPlot.id,
          status: { [Op.in]: OPEN_STATUSES },
        },
      });
      if (openForPlot) {
        const err = new Error(
          openForPlot.customerId === customer.id
            ? 'You already have an open interest for this plot.'
            : 'This plot already has an open interest from another customer.'
        );
        err.status = 409;
        err.code = 'DUPLICATE_PLOT_INTEREST';
        throw err;
      }

      property = await layoutPropertyService.ensureAnneEnclaveProperty();
      propertyId = property.id;
      if (!mapPlot.propertyId) {
        await mapPlot.update({ propertyId });
      }
    } else {
      if (!propertyId) {
        const err = new Error('Property is required.');
        err.status = 400;
        throw err;
      }
      property = await Property.findByPk(propertyId, {
        include: [{ model: PropertyCategory, as: 'category' }],
      });
      if (!property || property.status !== 'ACTIVE') {
        const err = new Error('Property not found or not available.');
        err.status = 404;
        err.code = 'PROPERTY_NOT_FOUND';
        throw err;
      }

      const duplicate = await ExpressInterest.findOne({
        where: {
          customerId: customer.id,
          propertyId,
          mapPlotId: null,
          status: { [Op.in]: OPEN_STATUSES },
        },
      });
      if (duplicate) {
        const err = new Error('You already have an open express interest for this property.');
        err.status = 409;
        err.code = 'DUPLICATE_INTEREST';
        throw err;
      }
    }

    let referralAgent = null;
    const agentCode = String(body.referralAgentCode || body.agentId || body.agentMemberId || '').trim();
    const agentNameInput = String(body.agentName || body.referralAgentName || '').trim();

    if (agentCode) {
      referralAgent = await this.findAgentByCode(agentCode);
      if (!referralAgent) {
        const err = new Error('Agent not found. Please check the Agent ID / Referral Code.');
        err.status = 400;
        err.code = 'INVALID_AGENT_ID';
        throw err;
      }
    }

    const remarks = String(body.remarks || body.message || '').trim() || null;
    const mapPhase = mapPlot ? (Number(mapPlot.phase) === 2 ? 2 : 1) : null;
    const labelTitle = mapPlot
      ? `Plot ${mapPlot.plotNo} (Phase ${mapPhase}) — ${property.titleEn}`
      : property.titleEn;

    const result = await sequelize.transaction(async (transaction) => {
      const interest = await ExpressInterest.create({
        customerId: customer.id,
        propertyId,
        mapPlotId: mapPlot?.id || null,
        mapPlotExternalId: mapPlot?.externalId || null,
        mapPlotNo: mapPlot?.plotNo || null,
        mapPhase,
        referralAgentId: referralAgent?.id || null,
        assignedAgentId: referralAgent?.id || null,
        status: 'PENDING_APPROVAL',
        remarks,
        referralAgentCode: agentCode || null,
        referralAgentNameSnapshot: referralAgent?.name || agentNameInput || null,
        followUpStatus: 'NEW',
        createdBy: customer.id,
        modifiedBy: customer.id,
      }, { transaction });

      await this.addHistory(
        interest.id,
        null,
        'PENDING_APPROVAL',
        mapPlot ? `Express interest submitted for map plot ${mapPlot.plotNo}` : 'Express interest submitted',
        customer.id,
        transaction
      );
      await this.logActivity(
        'ExpressInterest',
        interest.id,
        'SUBMITTED',
        mapPlot
          ? `Customer ${customer.id} submitted interest for map plot ${mapPlot.externalId}`
          : `Customer ${customer.id} submitted interest for property ${propertyId}`,
        customer.id,
        transaction
      );

      return interest.id;
    });

    const formatted = await this.getById(result);

    await notificationService.notifyAdmins({
      titleEn: mapPlot ? 'New Plot Interest' : 'New Express Interest',
      messageEn: `${customer.name} expressed interest in "${labelTitle}".`,
      notificationType: 'express_interest_new',
      referenceType: 'express_interest',
      referenceId: result,
      linkPath: expressInterestLink(ROLES.ADMIN, result),
      createdBy: customer.id,
    });

    if (referralAgent) {
      await notificationService.create({
        userId: referralAgent.id,
        userRole: ROLES.AGENT,
        titleEn: 'New Customer Lead',
        messageEn: `${customer.name} listed you as referral agent for "${labelTitle}".`,
        notificationType: 'agent_referral_lead',
        referenceType: 'express_interest',
        referenceId: result,
        linkPath: expressInterestLink(ROLES.AGENT, result),
        createdBy: customer.id,
      });
    }

    emitExpressInterestUpdated(
      [customer.id, referralAgent?.id].filter(Boolean),
      formatted,
      'created'
    );

    return formatted;
  }

  async approve(id, adminUser, body = {}) {
    const interest = await ExpressInterest.findByPk(Number(id));
    if (!interest) {
      const err = new Error('Express interest not found.');
      err.status = 404;
      throw err;
    }
    if (interest.status !== 'PENDING_APPROVAL') {
      const err = new Error('Only pending interests can be approved.');
      err.status = 400;
      throw err;
    }

    let assignAgentId = interest.assignedAgentId || interest.referralAgentId;
    if (body.assignedAgentId) {
      const agent = await this.findAgentByCode(body.assignedAgentId);
      if (!agent) {
        const err = new Error('Assigned agent not found.');
        err.status = 400;
        throw err;
      }
      assignAgentId = agent.id;
    }

    // Keep Approved when agent is assigned so customer can Proceed; agent remains linked
    const nextStatus = 'APPROVED';
    const adminRemarks = String(body.adminRemarks || body.remarks || '').trim() || null;

    await sequelize.transaction(async (transaction) => {
      const from = interest.status;
      await interest.update({
        status: nextStatus,
        assignedAgentId: assignAgentId || null,
        adminRemarks: adminRemarks || interest.adminRemarks,
        approvedById: adminUser.id,
        approvedAt: new Date(),
        rejectionReason: null,
        modifiedBy: adminUser.id,
      }, { transaction });

      await this.addHistory(interest.id, from, nextStatus, adminRemarks || 'Approved by admin', adminUser.id, transaction);
      await this.logActivity('ExpressInterest', interest.id, 'APPROVED', adminRemarks, adminUser.id, transaction);
    });

    const formatted = await this.getById(interest.id);
    const propertyTitle = formatted.propertyName || `Property #${formatted.propertyId}`;

    await notificationService.create({
      userId: interest.customerId,
      userRole: ROLES.CUSTOMER,
      titleEn: 'Express Interest Approved',
      messageEn: `Your interest for "${propertyTitle}" was approved.`,
      notificationType: 'express_interest_approved',
      referenceType: 'express_interest',
      referenceId: interest.id,
      linkPath: expressInterestLink(ROLES.CUSTOMER, interest.id),
      createdBy: adminUser.id,
    });

    if (assignAgentId) {
      await notificationService.create({
        userId: assignAgentId,
        userRole: ROLES.AGENT,
        titleEn: 'Lead Approved',
        messageEn: `Admin approved a customer lead for "${propertyTitle}".`,
        notificationType: 'lead_approved',
        referenceType: 'express_interest',
        referenceId: interest.id,
        linkPath: expressInterestLink(ROLES.AGENT, interest.id),
        createdBy: adminUser.id,
      });

      await notificationService.create({
        userId: interest.customerId,
        userRole: ROLES.CUSTOMER,
        titleEn: 'Agent Assigned',
        messageEn: `An agent has been assigned to your interest for "${propertyTitle}".`,
        notificationType: 'agent_assigned',
        referenceType: 'express_interest',
        referenceId: interest.id,
        linkPath: expressInterestLink(ROLES.CUSTOMER, interest.id),
        createdBy: adminUser.id,
      });
    }

    emitExpressInterestUpdated(
      [interest.customerId, assignAgentId].filter(Boolean),
      formatted,
      'approved'
    );

    return formatted;
  }

  async reject(id, adminUser, body = {}) {
    const interest = await ExpressInterest.findByPk(Number(id));
    if (!interest) {
      const err = new Error('Express interest not found.');
      err.status = 404;
      throw err;
    }
    if (interest.status !== 'PENDING_APPROVAL') {
      const err = new Error('Only pending interests can be rejected.');
      err.status = 400;
      throw err;
    }

    const reason = String(body.reason || body.rejectionReason || body.adminRemarks || '').trim();
    if (!reason) {
      const err = new Error('Rejection reason is required.');
      err.status = 400;
      throw err;
    }

    await sequelize.transaction(async (transaction) => {
      const from = interest.status;
      await interest.update({
        status: 'REJECTED',
        rejectionReason: reason,
        adminRemarks: reason,
        approvedById: adminUser.id,
        approvedAt: new Date(),
        modifiedBy: adminUser.id,
      }, { transaction });
      await this.addHistory(interest.id, from, 'REJECTED', reason, adminUser.id, transaction);
      await this.logActivity('ExpressInterest', interest.id, 'REJECTED', reason, adminUser.id, transaction);
    });

    const formatted = await this.getById(interest.id);
    await notificationService.create({
      userId: interest.customerId,
      userRole: ROLES.CUSTOMER,
      titleEn: 'Express Interest Rejected',
      messageEn: `Your interest was rejected. Reason: ${reason}`,
      notificationType: 'express_interest_rejected',
      referenceType: 'express_interest',
      referenceId: interest.id,
      linkPath: expressInterestLink(ROLES.CUSTOMER, interest.id),
      createdBy: adminUser.id,
    });

    if (interest.assignedAgentId || interest.referralAgentId) {
      const agentId = interest.assignedAgentId || interest.referralAgentId;
      await notificationService.create({
        userId: agentId,
        userRole: ROLES.AGENT,
        titleEn: 'Lead Rejected',
        messageEn: 'A referred lead was rejected by admin.',
        notificationType: 'lead_rejected',
        referenceType: 'express_interest',
        referenceId: interest.id,
        linkPath: expressInterestLink(ROLES.AGENT, interest.id),
        createdBy: adminUser.id,
      });
    }

    emitExpressInterestUpdated(
      [interest.customerId, interest.assignedAgentId, interest.referralAgentId].filter(Boolean),
      formatted,
      'rejected'
    );

    return formatted;
  }

  async assignAgent(id, adminUser, body = {}) {
    const interest = await ExpressInterest.findByPk(Number(id));
    if (!interest) {
      const err = new Error('Express interest not found.');
      err.status = 404;
      throw err;
    }
    if (['REJECTED', 'CLOSED'].includes(interest.status)) {
      const err = new Error('Cannot assign agent to a rejected or closed interest.');
      err.status = 400;
      throw err;
    }

    const agent = await this.findAgentByCode(body.agentId || body.assignedAgentId);
    if (!agent) {
      const err = new Error('Agent not found.');
      err.status = 400;
      err.code = 'AGENT_NOT_FOUND';
      throw err;
    }

    const isReassign = Boolean(interest.assignedAgentId) && interest.assignedAgentId !== agent.id;
    const from = interest.status;
    // Keep pending until admin approves; otherwise mark assigned
    const nextStatus = interest.status === 'PENDING_APPROVAL' ? 'PENDING_APPROVAL' : 'ASSIGNED';

    await sequelize.transaction(async (transaction) => {
      await interest.update({
        assignedAgentId: agent.id,
        status: nextStatus,
        modifiedBy: adminUser.id,
      }, { transaction });

      await this.addHistory(
        interest.id,
        from,
        nextStatus,
        `${isReassign ? 'Reassigned' : 'Assigned'} to ${agent.name} (${agent.memberId || agent.id})`,
        adminUser.id,
        transaction
      );
      await this.logActivity(
        'ExpressInterest',
        interest.id,
        isReassign ? 'REASSIGNED' : 'ASSIGNED',
        `Agent ${agent.id}`,
        adminUser.id,
        transaction
      );
    });

    const formatted = await this.getById(interest.id);
    const propertyTitle = formatted.propertyName || `Property #${formatted.propertyId}`;

    await notificationService.create({
      userId: agent.id,
      userRole: ROLES.AGENT,
      titleEn: isReassign ? 'Lead Reassigned to You' : 'New Lead Assigned',
      messageEn: `You have been assigned a customer lead for "${propertyTitle}".`,
      notificationType: 'lead_assigned',
      referenceType: 'express_interest',
      referenceId: interest.id,
      linkPath: expressInterestLink(ROLES.AGENT, interest.id),
      createdBy: adminUser.id,
    });

    await notificationService.create({
      userId: interest.customerId,
      userRole: ROLES.CUSTOMER,
      titleEn: 'Agent Assigned',
      messageEn: `${agent.name} has been assigned to your interest for "${propertyTitle}".`,
      notificationType: 'agent_assigned',
      referenceType: 'express_interest',
      referenceId: interest.id,
      linkPath: expressInterestLink(ROLES.CUSTOMER, interest.id),
      createdBy: adminUser.id,
    });

    await notificationService.notifyAdmins({
      titleEn: 'Lead Assignment Updated',
      messageEn: `Interest #${interest.id} ${isReassign ? 'reassigned' : 'assigned'} to ${agent.name}.`,
      notificationType: 'lead_assignment',
      referenceType: 'express_interest',
      referenceId: interest.id,
      linkPath: expressInterestLink(ROLES.ADMIN, interest.id),
      createdBy: adminUser.id,
    });

    emitExpressInterestUpdated(
      [interest.customerId, agent.id].filter(Boolean),
      formatted,
      'assigned'
    );

    return formatted;
  }

  async addInternalRemarks(id, adminUser, remarks) {
    const interest = await ExpressInterest.findByPk(Number(id));
    if (!interest) {
      const err = new Error('Express interest not found.');
      err.status = 404;
      throw err;
    }
    const text = String(remarks || '').trim();
    if (!text) {
      const err = new Error('Remarks are required.');
      err.status = 400;
      throw err;
    }

    await interest.update({
      internalRemarks: text,
      modifiedBy: adminUser.id,
    });
    await this.addHistory(interest.id, interest.status, interest.status, `Internal remark: ${text}`, adminUser.id);
    await this.logActivity('ExpressInterest', interest.id, 'INTERNAL_REMARK', text, adminUser.id);
    return this.getById(interest.id);
  }

  async addFollowUp(id, agentUser, body = {}) {
    const interest = await ExpressInterest.findByPk(Number(id));
    if (!interest) {
      const err = new Error('Express interest not found.');
      err.status = 404;
      throw err;
    }
    if (
      agentUser.role === ROLES.AGENT
      && interest.assignedAgentId !== agentUser.id
      && interest.referralAgentId !== agentUser.id
    ) {
      const err = new Error('You can only follow up on your assigned leads.');
      err.status = 403;
      throw err;
    }
    if (
      agentUser.role === ROLES.EMPLOYEE
      && interest.assignedEmployeeId !== agentUser.id
    ) {
      const err = new Error('You can only follow up on your assigned leads.');
      err.status = 403;
      throw err;
    }
    if (['REJECTED', 'CLOSED'].includes(interest.status)) {
      const err = new Error('Cannot follow up on a closed or rejected lead.');
      err.status = 400;
      throw err;
    }

    const remark = String(body.remark || body.remarks || '').trim();
    if (!remark) {
      const err = new Error('Follow-up remark is required.');
      err.status = 400;
      throw err;
    }
    const followUpStatus = String(body.followUpStatus || interest.followUpStatus || 'IN_PROGRESS').trim();

    await sequelize.transaction(async (transaction) => {
      await FollowUpRemark.create({
        interestId: interest.id,
        agentId: agentUser.id,
        remark,
        followUpStatus,
        createdBy: agentUser.id,
        modifiedBy: agentUser.id,
      }, { transaction });

      await interest.update({
        followUpStatus,
        modifiedBy: agentUser.id,
      }, { transaction });

      await this.addHistory(interest.id, interest.status, interest.status, `Follow-up: ${remark}`, agentUser.id, transaction);
      await this.logActivity('ExpressInterest', interest.id, 'FOLLOW_UP', remark, agentUser.id, transaction);
    });

    const formatted = await this.getById(interest.id);

    await notificationService.create({
      userId: interest.customerId,
      userRole: ROLES.CUSTOMER,
      titleEn: 'Lead Status Update',
      messageEn: `Your agent updated the follow-up status to ${followUpStatus}.`,
      notificationType: 'lead_status_update',
      referenceType: 'express_interest',
      referenceId: interest.id,
      linkPath: expressInterestLink(ROLES.CUSTOMER, interest.id),
      createdBy: agentUser.id,
    });

    emitExpressInterestUpdated([interest.customerId, agentUser.id], formatted, 'updated');

    return formatted;
  }

  async assignEmployee(id, adminUser, body = {}) {
    const interest = await ExpressInterest.findByPk(Number(id));
    if (!interest) {
      const err = new Error('Express interest not found.');
      err.status = 404;
      throw err;
    }
    if (['REJECTED', 'CLOSED'].includes(interest.status)) {
      const err = new Error('Cannot assign employee to a rejected or closed interest.');
      err.status = 400;
      throw err;
    }

    const employeeId = Number(body.employeeId || body.assignedEmployeeId);
    if (!employeeId) {
      const err = new Error('Employee id is required.');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    const employee = await User.findOne({
      where: { id: employeeId, role: ROLES.EMPLOYEE, status: USER_STATUSES.ACTIVE },
    });
    if (!employee) {
      const err = new Error('Active employee not found.');
      err.status = 404;
      err.code = 'EMPLOYEE_NOT_FOUND';
      throw err;
    }

    const isReassign = Boolean(interest.assignedEmployeeId) && interest.assignedEmployeeId !== employee.id;
    await interest.update({
      assignedEmployeeId: employee.id,
      employeeWorkflowStatus: interest.employeeWorkflowStatus || 'new',
      priority: interest.priority || 'medium',
      modifiedBy: adminUser.id,
    });
    await this.addHistory(
      interest.id,
      interest.status,
      interest.status,
      `${isReassign ? 'Reassigned' : 'Assigned'} employee ${employee.name} (${employee.memberId || employee.id})`,
      adminUser.id
    );
    await this.logActivity(
      'ExpressInterest',
      interest.id,
      isReassign ? 'EMPLOYEE_REASSIGNED' : 'EMPLOYEE_ASSIGNED',
      `Employee ${employee.id}`,
      adminUser.id
    );

    return this.getById(interest.id);
  }

  async updateEmployeeWorkflow(id, actor, body = {}) {
    const interest = await ExpressInterest.findByPk(Number(id));
    if (!interest) {
      const err = new Error('Express interest not found.');
      err.status = 404;
      throw err;
    }

    if (actor?.role === ROLES.EMPLOYEE) {
      const perms = Array.isArray(actor.permissions) ? actor.permissions : [];
      const canViewUnassigned = perms.includes(EMPLOYEE_PERMISSIONS.VIEW_UNASSIGNED_RECORDS);
      if (interest.assignedEmployeeId !== actor.id) {
        if (!(canViewUnassigned && !interest.assignedEmployeeId)) {
          const err = new Error('You can only update your assigned leads.');
          err.status = 403;
          throw err;
        }
        // Claiming an unassigned lead when updating it
        body.assignedEmployeeId = actor.id;
      }
    } else if (![ROLES.ADMIN, ROLES.SALES_MEMBER].includes(actor?.role)) {
      const err = new Error('Forbidden.');
      err.status = 403;
      throw err;
    }

    const updates = { modifiedBy: actor.id };
    const notes = [];

    if (body.status != null || body.employeeWorkflowStatus != null) {
      const status = String(body.employeeWorkflowStatus || body.status).trim().toLowerCase();
      updates.employeeWorkflowStatus = status || 'new';
      notes.push(`Workflow status: ${updates.employeeWorkflowStatus}`);
    }
    if (body.priority != null) {
      updates.priority = String(body.priority).trim().toLowerCase() || 'medium';
      notes.push(`Priority: ${updates.priority}`);
    }
    if (body.nextFollowUpAt !== undefined) {
      if (body.nextFollowUpAt === null || body.nextFollowUpAt === '') {
        updates.nextFollowUpAt = null;
        notes.push('Next follow-up cleared');
      } else {
        const when = new Date(body.nextFollowUpAt);
        if (Number.isNaN(when.getTime())) {
          const err = new Error('Invalid nextFollowUpAt.');
          err.status = 400;
          throw err;
        }
        updates.nextFollowUpAt = when;
        if (!updates.employeeWorkflowStatus) {
          updates.employeeWorkflowStatus = 'followup_required';
        }
        notes.push(`Next follow-up: ${when.toISOString()}`);
      }
    }
    if (body.assignedEmployeeId !== undefined) {
      updates.assignedEmployeeId = body.assignedEmployeeId ? Number(body.assignedEmployeeId) : null;
    }

    await interest.update(updates);
    if (notes.length) {
      await this.addHistory(interest.id, interest.status, interest.status, notes.join('; '), actor.id);
      await this.logActivity('ExpressInterest', interest.id, 'EMPLOYEE_WORKFLOW', notes.join('; '), actor.id);
    }

    return this.getById(interest.id, { actor });
  }

  async close(id, adminUser, body = {}) {
    const interest = await ExpressInterest.findByPk(Number(id));
    if (!interest) {
      const err = new Error('Express interest not found.');
      err.status = 404;
      throw err;
    }
    const note = String(body.note || body.remarks || 'Closed').trim();
    const from = interest.status;
    await interest.update({ status: 'CLOSED', modifiedBy: adminUser.id });
    await this.addHistory(interest.id, from, 'CLOSED', note, adminUser.id);
    await this.logActivity('ExpressInterest', interest.id, 'CLOSED', note, adminUser.id);
    return this.getById(interest.id);
  }
}

module.exports = new ExpressInterestService();
