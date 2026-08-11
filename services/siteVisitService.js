'use strict';

const { Op } = require('sequelize');
const {
  SiteVisit,
  SiteVisitHistory,
  ActivityLog,
  User,
  Property,
  PropertyCategory,
  PropertyImage,
  sequelize,
} = require('../models');
const { ROLES, USER_STATUSES } = require('../constants/roles');
const { EMPLOYEE_PERMISSIONS } = require('../constants/employeePermissions');
const notificationService = require('./notificationService');
const expressInterestService = require('./expressInterestService');

const OPEN_STATUSES = ['PENDING_APPROVAL', 'APPROVED', 'ASSIGNED', 'COMPLETED', 'PURCHASE_INTEREST'];
const DROP_REASONS = [
  'Budget Issue',
  'Location Not Suitable',
  'Found Another Property',
  'Loan Issue',
  'Family Decision',
  'Other',
];

class SiteVisitService {
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
        model: SiteVisitHistory,
        as: 'history',
        include: [{ model: User, as: 'actor', attributes: ['id', 'name', 'memberId', 'role'] }],
        separate: true,
        order: [['createdAt', 'ASC']],
      },
    ];
  }

  formatUserBrief(user) {
    return expressInterestService.formatUserBrief(user);
  }

  visitDateTimePassed(visitDate, visitTime) {
    if (!visitDate) return false;
    const time = String(visitTime || '00:00').trim();
    const iso = `${String(visitDate).slice(0, 10)}T${time.length === 5 ? `${time}:00` : time}`;
    const when = new Date(iso);
    if (Number.isNaN(when.getTime())) return false;
    return when.getTime() <= Date.now();
  }

  format(row) {
    if (!row) return null;
    const r = row.toJSON ? row.toJSON() : row;
    const property = r.property || null;
    const customer = r.customer || null;
    const assigned = r.assignedAgent || null;
    const assignedEmployee = r.assignedEmployee || null;
    const referral = r.referralAgent || null;
    const statusRaw = r.status;
    const canConfirmCompletion =
      ['APPROVED', 'ASSIGNED', 'COMPLETED'].includes(statusRaw) &&
      (statusRaw === 'COMPLETED' || this.visitDateTimePassed(r.visitDate, r.visitTime)) &&
      !['PURCHASE_INTEREST', 'DROPPED', 'REJECTED', 'CLOSED', 'PENDING_APPROVAL'].includes(statusRaw);

    return {
      id: r.id,
      siteVisitId: r.id,
      visitId: r.id,
      customerId: r.customerId,
      propertyId: r.propertyId,
      referralAgentId: r.referralAgentId,
      assignedAgentId: r.assignedAgentId,
      assignedEmployeeId: r.assignedEmployeeId || null,
      visitDate: r.visitDate,
      visitTime: r.visitTime,
      scheduledFor: r.visitDate && r.visitTime ? `${r.visitDate} ${r.visitTime}` : r.visitDate,
      status: String(r.employeeVisitStatus || r.status || '').toLowerCase(),
      statusRaw: r.status,
      employeeVisitStatus: r.employeeVisitStatus || null,
      outcome: r.employeeOutcome || null,
      notes: r.employeeNotes || r.internalRemarks || null,
      isActiveVisit: ['APPROVED', 'ASSIGNED', 'COMPLETED'].includes(r.status),
      canConfirmCompletion: Boolean(canConfirmCompletion),
      remarks: r.remarks,
      adminRemarks: r.adminRemarks,
      internalRemarks: r.internalRemarks,
      employeeOutcome: r.employeeOutcome || null,
      employeeNotes: r.employeeNotes || null,
      referralAgentCode: r.referralAgentCode,
      referralAgentName: r.referralAgentNameSnapshot || referral?.name || null,
      rejectionReason: r.rejectionReason,
      dropReason: r.dropReason,
      dropRemarks: r.dropRemarks,
      customerDecision: r.customerDecision,
      customerDecisionAt: r.customerDecisionAt,
      completedAt: r.completedAt,
      completedById: r.completedById,
      approvedById: r.approvedById,
      approvedAt: r.approvedAt,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      submissionDate: r.createdAt,
      buyerName: customer?.name || null,
      buyerPhone: customer?.mobile || null,
      buyerEmail: customer?.email || null,
      customer: this.formatUserBrief(customer),
      referralAgent: this.formatUserBrief(referral),
      assignedAgent: this.formatUserBrief(assigned),
      assignedEmployee: this.formatUserBrief(assignedEmployee),
      meetingLocation: property?.city || property?.ventureName || null,
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
      propertyTitle: property?.titleEn || null,
      project: property?.ventureName || property?.category?.nameEn || null,
      history: (r.history || []).map((h) => ({
        id: h.id,
        fromStatus: h.fromStatus,
        toStatus: h.toStatus,
        note: h.note,
        createdBy: h.createdBy,
        actorName: h.actor?.name || null,
        createdAt: h.createdAt,
      })),
      dropReasons: DROP_REASONS,
    };
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

  async addHistory(siteVisitId, fromStatus, toStatus, note, createdBy, transaction) {
    await SiteVisitHistory.create({
      siteVisitId,
      fromStatus,
      toStatus,
      note: note || null,
      createdBy: createdBy || null,
    }, { transaction });
  }

  async validateAgent(code) {
    return expressInterestService.validateAgent(code);
  }

  async findAgentByCode(code) {
    return expressInterestService.findAgentByCode(code);
  }

  async getById(id, { actor = null } = {}) {
    const row = await SiteVisit.findByPk(Number(id), { include: this.detailIncludes() });
    if (!row) {
      const err = new Error('Site visit not found.');
      err.status = 404;
      err.code = 'SITE_VISIT_NOT_FOUND';
      throw err;
    }

    if (actor?.role === ROLES.CUSTOMER && row.customerId !== actor.id) {
      const err = new Error('You do not have access to this site visit.');
      err.status = 403;
      err.code = 'FORBIDDEN';
      throw err;
    }

    if (actor?.role === ROLES.AGENT && row.assignedAgentId !== actor.id && row.referralAgentId !== actor.id) {
      const err = new Error('You do not have access to this site visit.');
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
        const err = new Error('You do not have access to this site visit.');
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

    const { rows, count } = await SiteVisit.findAndCountAll({
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

  parseVisitDate(value) {
    const raw = String(value || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
    const d = new Date(`${raw}T00:00:00`);
    if (Number.isNaN(d.getTime())) return null;
    return raw;
  }

  parseVisitTime(value) {
    const raw = String(value || '').trim();
    if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(raw)) return null;
    return raw;
  }

  async submit(body, customer) {
    const propertyId = Number(body.propertyId);
    if (!propertyId) {
      const err = new Error('Property is required.');
      err.status = 400;
      throw err;
    }

    const visitDate = this.parseVisitDate(body.visitDate || body.preferredDate);
    const visitTime = this.parseVisitTime(body.visitTime || body.preferredTime);
    if (!visitDate) {
      const err = new Error('Preferred visit date is required (YYYY-MM-DD).');
      err.status = 400;
      throw err;
    }
    if (!visitTime) {
      const err = new Error('Preferred visit time is required (HH:mm).');
      err.status = 400;
      throw err;
    }

    const property = await Property.findByPk(propertyId, {
      include: [{ model: PropertyCategory, as: 'category' }],
    });
    if (!property || property.status !== 'ACTIVE') {
      const err = new Error('Property not found or not available.');
      err.status = 404;
      err.code = 'PROPERTY_NOT_FOUND';
      throw err;
    }

    const duplicate = await SiteVisit.findOne({
      where: {
        customerId: customer.id,
        propertyId,
        status: { [Op.in]: OPEN_STATUSES },
      },
    });
    if (duplicate) {
      const err = new Error('You already have an open site visit request for this property.');
      err.status = 409;
      err.code = 'DUPLICATE_SITE_VISIT';
      throw err;
    }

    let referralAgent = null;
    const agentCode = String(body.referralAgentCode || body.agentId || body.agentMemberId || '').trim();
    if (agentCode) {
      referralAgent = await this.findAgentByCode(agentCode);
      if (!referralAgent) {
        const err = new Error('Invalid Agent ID. Please check and try again.');
        err.status = 400;
        err.code = 'INVALID_AGENT_ID';
        throw err;
      }
    }

    const remarks = String(body.remarks || body.message || '').trim() || null;

    const result = await sequelize.transaction(async (transaction) => {
      const visit = await SiteVisit.create({
        customerId: customer.id,
        propertyId,
        referralAgentId: referralAgent?.id || null,
        assignedAgentId: referralAgent?.id || null,
        visitDate,
        visitTime,
        status: 'PENDING_APPROVAL',
        remarks,
        referralAgentCode: agentCode || null,
        referralAgentNameSnapshot: referralAgent?.name || null,
        createdBy: customer.id,
        modifiedBy: customer.id,
      }, { transaction });

      await this.addHistory(visit.id, null, 'PENDING_APPROVAL', 'Site visit requested', customer.id, transaction);
      await this.logActivity(
        'SiteVisit',
        visit.id,
        'SUBMITTED',
        `Customer ${customer.id} requested site visit for property ${propertyId}`,
        customer.id,
        transaction
      );
      return visit.id;
    });

    const formatted = await this.getById(result);

    await notificationService.notifyAdmins({
      titleEn: 'New Site Visit Request',
      messageEn: `${customer.name} requested a site visit for "${property.titleEn}" on ${visitDate} at ${visitTime}.`,
      notificationType: 'site_visit_new',
      referenceType: 'site_visit',
      referenceId: result,
      linkPath: '/admin/visits',
      createdBy: customer.id,
    });

    await notificationService.create({
      userId: customer.id,
      userRole: ROLES.CUSTOMER,
      titleEn: 'Site Visit Request Submitted',
      messageEn: `Your site visit for "${property.titleEn}" was submitted and is pending approval.`,
      notificationType: 'site_visit_submitted',
      referenceType: 'site_visit',
      referenceId: result,
      linkPath: '/buyer/visits',
      createdBy: customer.id,
    });

    if (referralAgent) {
      await notificationService.create({
        userId: referralAgent.id,
        userRole: ROLES.AGENT,
        titleEn: 'New Assigned Site Visit',
        messageEn: `${customer.name} listed you as referral agent for a site visit to "${property.titleEn}".`,
        notificationType: 'site_visit_referral',
        referenceType: 'site_visit',
        referenceId: result,
        linkPath: '/mediator/visits',
        createdBy: customer.id,
      });
    }

    return formatted;
  }

  async approve(id, adminUser, body = {}) {
    const visit = await SiteVisit.findByPk(Number(id));
    if (!visit) {
      const err = new Error('Site visit not found.');
      err.status = 404;
      throw err;
    }
    if (visit.status !== 'PENDING_APPROVAL') {
      const err = new Error('Only pending site visits can be approved.');
      err.status = 400;
      throw err;
    }

    let assignAgentId = visit.assignedAgentId || visit.referralAgentId;
    if (body.assignedAgentId || body.agentId) {
      const agent = await this.findAgentByCode(body.assignedAgentId || body.agentId);
      if (!agent) {
        const err = new Error('Assigned agent not found.');
        err.status = 400;
        throw err;
      }
      assignAgentId = agent.id;
    }

    const nextStatus = assignAgentId ? 'ASSIGNED' : 'APPROVED';
    const adminRemarks = String(body.adminRemarks || body.remarks || '').trim() || null;

    await sequelize.transaction(async (transaction) => {
      const from = visit.status;
      await visit.update({
        status: nextStatus,
        assignedAgentId: assignAgentId || null,
        adminRemarks: adminRemarks || visit.adminRemarks,
        approvedById: adminUser.id,
        approvedAt: new Date(),
        rejectionReason: null,
        modifiedBy: adminUser.id,
      }, { transaction });
      await this.addHistory(visit.id, from, nextStatus, adminRemarks || 'Approved by admin', adminUser.id, transaction);
      await this.logActivity('SiteVisit', visit.id, 'APPROVED', adminRemarks, adminUser.id, transaction);
    });

    const formatted = await this.getById(visit.id);
    const propertyTitle = formatted.propertyName || `Property #${formatted.propertyId}`;

    await notificationService.create({
      userId: visit.customerId,
      userRole: ROLES.CUSTOMER,
      titleEn: 'Site Visit Approved',
      messageEn: `Your site visit for "${propertyTitle}" was approved.`,
      notificationType: 'site_visit_approved',
      referenceType: 'site_visit',
      referenceId: visit.id,
      linkPath: '/buyer/visits',
      createdBy: adminUser.id,
    });

    if (assignAgentId) {
      await notificationService.create({
        userId: assignAgentId,
        userRole: ROLES.AGENT,
        titleEn: 'Site Visit Approved',
        messageEn: `Admin approved an assigned site visit for "${propertyTitle}".`,
        notificationType: 'site_visit_approved_agent',
        referenceType: 'site_visit',
        referenceId: visit.id,
        linkPath: '/mediator/visits',
        createdBy: adminUser.id,
      });

      await notificationService.create({
        userId: visit.customerId,
        userRole: ROLES.CUSTOMER,
        titleEn: 'Agent Assigned',
        messageEn: `An agent has been assigned to your site visit for "${propertyTitle}".`,
        notificationType: 'site_visit_agent_assigned',
        referenceType: 'site_visit',
        referenceId: visit.id,
        linkPath: '/buyer/visits',
        createdBy: adminUser.id,
      });
    }

    return formatted;
  }

  async reject(id, adminUser, body = {}) {
    const visit = await SiteVisit.findByPk(Number(id));
    if (!visit) {
      const err = new Error('Site visit not found.');
      err.status = 404;
      throw err;
    }
    if (visit.status !== 'PENDING_APPROVAL') {
      const err = new Error('Only pending site visits can be rejected.');
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
      const from = visit.status;
      await visit.update({
        status: 'REJECTED',
        rejectionReason: reason,
        adminRemarks: reason,
        approvedById: adminUser.id,
        approvedAt: new Date(),
        modifiedBy: adminUser.id,
      }, { transaction });
      await this.addHistory(visit.id, from, 'REJECTED', reason, adminUser.id, transaction);
      await this.logActivity('SiteVisit', visit.id, 'REJECTED', reason, adminUser.id, transaction);
    });

    const formatted = await this.getById(visit.id);
    await notificationService.create({
      userId: visit.customerId,
      userRole: ROLES.CUSTOMER,
      titleEn: 'Site Visit Rejected',
      messageEn: `Your site visit request was rejected. Reason: ${reason}`,
      notificationType: 'site_visit_rejected',
      referenceType: 'site_visit',
      referenceId: visit.id,
      linkPath: '/buyer/visits',
      createdBy: adminUser.id,
    });

    const agentId = visit.assignedAgentId || visit.referralAgentId;
    if (agentId) {
      await notificationService.create({
        userId: agentId,
        userRole: ROLES.AGENT,
        titleEn: 'Site Visit Rejected',
        messageEn: 'A referred site visit was rejected by admin.',
        notificationType: 'site_visit_rejected_agent',
        referenceType: 'site_visit',
        referenceId: visit.id,
        linkPath: '/mediator/visits',
        createdBy: adminUser.id,
      });
    }

    return formatted;
  }

  async assignAgent(id, adminUser, body = {}) {
    const visit = await SiteVisit.findByPk(Number(id));
    if (!visit) {
      const err = new Error('Site visit not found.');
      err.status = 404;
      throw err;
    }
    if (['REJECTED', 'CLOSED', 'DROPPED'].includes(visit.status)) {
      const err = new Error('Cannot assign agent to this site visit.');
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

    const isReassign = Boolean(visit.assignedAgentId) && visit.assignedAgentId !== agent.id;
    const from = visit.status;
    const nextStatus = visit.status === 'PENDING_APPROVAL' ? 'PENDING_APPROVAL' : 'ASSIGNED';

    await sequelize.transaction(async (transaction) => {
      await visit.update({
        assignedAgentId: agent.id,
        status: nextStatus,
        modifiedBy: adminUser.id,
      }, { transaction });
      await this.addHistory(
        visit.id,
        from,
        nextStatus,
        `${isReassign ? 'Reassigned' : 'Assigned'} to ${agent.name} (${agent.memberId || agent.id})`,
        adminUser.id,
        transaction
      );
      await this.logActivity(
        'SiteVisit',
        visit.id,
        isReassign ? 'REASSIGNED' : 'ASSIGNED',
        `Agent ${agent.id}`,
        adminUser.id,
        transaction
      );
    });

    const formatted = await this.getById(visit.id);
    const propertyTitle = formatted.propertyName || `Property #${formatted.propertyId}`;

    await notificationService.create({
      userId: agent.id,
      userRole: ROLES.AGENT,
      titleEn: isReassign ? 'Site Visit Reassigned to You' : 'New Assigned Site Visit',
      messageEn: `You have been assigned a site visit for "${propertyTitle}".`,
      notificationType: 'site_visit_assigned',
      referenceType: 'site_visit',
      referenceId: visit.id,
      linkPath: '/mediator/visits',
      createdBy: adminUser.id,
    });

    await notificationService.create({
      userId: visit.customerId,
      userRole: ROLES.CUSTOMER,
      titleEn: 'Agent Assigned',
      messageEn: `${agent.name} has been assigned to your site visit for "${propertyTitle}".`,
      notificationType: 'site_visit_agent_assigned',
      referenceType: 'site_visit',
      referenceId: visit.id,
      linkPath: '/buyer/visits',
      createdBy: adminUser.id,
    });

    return formatted;
  }

  async addInternalRemarks(id, adminUser, remarks) {
    const visit = await SiteVisit.findByPk(Number(id));
    if (!visit) {
      const err = new Error('Site visit not found.');
      err.status = 404;
      throw err;
    }
    const text = String(remarks || '').trim();
    if (!text) {
      const err = new Error('Remarks are required.');
      err.status = 400;
      throw err;
    }

    await visit.update({ internalRemarks: text, modifiedBy: adminUser.id });
    await this.addHistory(visit.id, visit.status, visit.status, `Internal remark: ${text}`, adminUser.id);
    await this.logActivity('SiteVisit', visit.id, 'INTERNAL_REMARK', text, adminUser.id);
    return this.getById(visit.id);
  }

  async markCompleted(id, actor, body = {}) {
    const visit = await SiteVisit.findByPk(Number(id));
    if (!visit) {
      const err = new Error('Site visit not found.');
      err.status = 404;
      throw err;
    }

    if (actor.role === ROLES.AGENT && visit.assignedAgentId !== actor.id && visit.referralAgentId !== actor.id) {
      const err = new Error('You can only complete your assigned site visits.');
      err.status = 403;
      throw err;
    }

    if (actor.role === ROLES.EMPLOYEE && visit.assignedEmployeeId !== actor.id) {
      const perms = Array.isArray(actor.permissions) ? actor.permissions : [];
      if (!(perms.includes(EMPLOYEE_PERMISSIONS.VIEW_UNASSIGNED_RECORDS) && !visit.assignedEmployeeId)) {
        const err = new Error('You can only complete your assigned site visits.');
        err.status = 403;
        throw err;
      }
    }

    if (!['APPROVED', 'ASSIGNED', 'COMPLETED'].includes(visit.status)) {
      const err = new Error('Only approved or assigned site visits can be marked completed.');
      err.status = 400;
      throw err;
    }

    if (visit.status === 'COMPLETED') {
      return this.getById(visit.id);
    }

    const note = String(body.note || body.remarks || 'Marked as completed').trim();
    const from = visit.status;

    await sequelize.transaction(async (transaction) => {
      await visit.update({
        status: 'COMPLETED',
        completedAt: new Date(),
        completedById: actor.id,
        modifiedBy: actor.id,
      }, { transaction });
      await this.addHistory(visit.id, from, 'COMPLETED', note, actor.id, transaction);
      await this.logActivity('SiteVisit', visit.id, 'COMPLETED', note, actor.id, transaction);
    });

    const formatted = await this.getById(visit.id);
    const propertyTitle = formatted.propertyName || `Property #${formatted.propertyId}`;

    await notificationService.create({
      userId: visit.customerId,
      userRole: ROLES.CUSTOMER,
      titleEn: 'Site Visit Completion Pending',
      messageEn: `Please confirm your site visit for "${propertyTitle}" and share your purchase interest.`,
      notificationType: 'site_visit_completion_pending',
      referenceType: 'site_visit',
      referenceId: visit.id,
      linkPath: '/buyer/visits',
      createdBy: actor.id,
    });

    const agentId = visit.assignedAgentId || visit.referralAgentId;
    if (agentId && actor.id !== agentId) {
      await notificationService.create({
        userId: agentId,
        userRole: ROLES.AGENT,
        titleEn: 'Customer Site Visit Marked Completed',
        messageEn: `Site visit for "${propertyTitle}" was marked completed.`,
        notificationType: 'site_visit_marked_completed',
        referenceType: 'site_visit',
        referenceId: visit.id,
        linkPath: '/mediator/visits',
        createdBy: actor.id,
      });
    }

    return formatted;
  }

  async submitPurchaseInterest(id, customer, body = {}) {
    const visit = await SiteVisit.findByPk(Number(id));
    if (!visit) {
      const err = new Error('Site visit not found.');
      err.status = 404;
      throw err;
    }
    if (visit.customerId !== customer.id) {
      const err = new Error('You can only update your own site visits.');
      err.status = 403;
      throw err;
    }

    const eligible =
      ['COMPLETED'].includes(visit.status) ||
      (['APPROVED', 'ASSIGNED'].includes(visit.status) && this.visitDateTimePassed(visit.visitDate, visit.visitTime));

    if (!eligible) {
      const err = new Error('Site visit is not ready for purchase interest confirmation.');
      err.status = 400;
      throw err;
    }

    const remarks = String(body.remarks || body.customerRemarks || '').trim() || null;
    const from = visit.status;

    await sequelize.transaction(async (transaction) => {
      if (visit.status !== 'COMPLETED') {
        await visit.update({
          status: 'COMPLETED',
          completedAt: visit.completedAt || new Date(),
          completedById: visit.completedById || customer.id,
          modifiedBy: customer.id,
        }, { transaction });
        await this.addHistory(visit.id, from, 'COMPLETED', 'Customer confirmed site visit completed', customer.id, transaction);
      }

      const fromPurchase = 'COMPLETED';
      await visit.update({
        status: 'PURCHASE_INTEREST',
        customerDecision: 'INTERESTED',
        customerDecisionAt: new Date(),
        remarks: remarks || visit.remarks,
        modifiedBy: customer.id,
      }, { transaction });
      await this.addHistory(
        visit.id,
        fromPurchase,
        'PURCHASE_INTEREST',
        remarks || 'Customer interested to purchase',
        customer.id,
        transaction
      );
      await this.logActivity('SiteVisit', visit.id, 'PURCHASE_INTEREST', remarks, customer.id, transaction);
    });

    const formatted = await this.getById(visit.id);
    const propertyTitle = formatted.propertyName || `Property #${formatted.propertyId}`;

    await notificationService.notifyAdmins({
      titleEn: 'Purchase Interest Submitted',
      messageEn: `${formatted.customer?.name || 'Customer'} wishes to purchase "${propertyTitle}" after site visit.`,
      notificationType: 'site_visit_purchase_interest',
      referenceType: 'site_visit',
      referenceId: visit.id,
      linkPath: '/admin/visits',
      createdBy: customer.id,
    });

    await notificationService.create({
      userId: customer.id,
      userRole: ROLES.CUSTOMER,
      titleEn: 'Purchase Interest Submitted',
      messageEn: `Your purchase interest for "${propertyTitle}" was submitted to admin.`,
      notificationType: 'site_visit_purchase_submitted',
      referenceType: 'site_visit',
      referenceId: visit.id,
      linkPath: '/buyer/visits',
      createdBy: customer.id,
    });

    const agentId = visit.assignedAgentId || visit.referralAgentId;
    if (agentId) {
      await notificationService.create({
        userId: agentId,
        userRole: ROLES.AGENT,
        titleEn: 'Customer Interested to Purchase',
        messageEn: `Customer is interested in purchasing "${propertyTitle}" after the site visit.`,
        notificationType: 'site_visit_purchase_agent',
        referenceType: 'site_visit',
        referenceId: visit.id,
        linkPath: '/mediator/visits',
        createdBy: customer.id,
      });
    }

    return formatted;
  }

  async submitDrop(id, customer, body = {}) {
    const visit = await SiteVisit.findByPk(Number(id));
    if (!visit) {
      const err = new Error('Site visit not found.');
      err.status = 404;
      throw err;
    }
    if (visit.customerId !== customer.id) {
      const err = new Error('You can only update your own site visits.');
      err.status = 403;
      throw err;
    }

    const eligible =
      ['COMPLETED'].includes(visit.status) ||
      (['APPROVED', 'ASSIGNED'].includes(visit.status) && this.visitDateTimePassed(visit.visitDate, visit.visitTime));

    if (!eligible) {
      const err = new Error('Site visit is not ready for drop confirmation.');
      err.status = 400;
      throw err;
    }

    const dropReason = String(body.dropReason || body.reason || '').trim();
    if (!dropReason || !DROP_REASONS.includes(dropReason)) {
      const err = new Error('A valid drop reason is required.');
      err.status = 400;
      throw err;
    }

    const otherText = String(body.otherReason || body.dropRemarks || body.remarks || '').trim();
    if (dropReason === 'Other' && !otherText) {
      const err = new Error('Please provide details for Other reason.');
      err.status = 400;
      throw err;
    }

    const from = visit.status;

    await sequelize.transaction(async (transaction) => {
      if (visit.status !== 'COMPLETED') {
        await visit.update({
          status: 'COMPLETED',
          completedAt: visit.completedAt || new Date(),
          completedById: visit.completedById || customer.id,
          modifiedBy: customer.id,
        }, { transaction });
        await this.addHistory(visit.id, from, 'COMPLETED', 'Customer confirmed site visit completed', customer.id, transaction);
      }

      await visit.update({
        status: 'DROPPED',
        customerDecision: 'DROPPED',
        customerDecisionAt: new Date(),
        dropReason,
        dropRemarks: otherText || null,
        modifiedBy: customer.id,
      }, { transaction });
      await this.addHistory(
        visit.id,
        'COMPLETED',
        'DROPPED',
        `${dropReason}${otherText ? `: ${otherText}` : ''}`,
        customer.id,
        transaction
      );
      await this.logActivity('SiteVisit', visit.id, 'DROPPED', dropReason, customer.id, transaction);
    });

    const formatted = await this.getById(visit.id);
    const propertyTitle = formatted.propertyName || `Property #${formatted.propertyId}`;
    const reasonText = `${dropReason}${otherText ? ` — ${otherText}` : ''}`;

    await notificationService.notifyAdmins({
      titleEn: 'Customer Dropped After Site Visit',
      messageEn: `${formatted.customer?.name || 'Customer'} dropped interest in "${propertyTitle}". Reason: ${reasonText}`,
      notificationType: 'site_visit_dropped',
      referenceType: 'site_visit',
      referenceId: visit.id,
      linkPath: '/admin/visits',
      createdBy: customer.id,
    });

    await notificationService.create({
      userId: customer.id,
      userRole: ROLES.CUSTOMER,
      titleEn: 'Drop Confirmation',
      messageEn: `Your decision for "${propertyTitle}" was recorded as Dropped.`,
      notificationType: 'site_visit_drop_confirmed',
      referenceType: 'site_visit',
      referenceId: visit.id,
      linkPath: '/buyer/visits',
      createdBy: customer.id,
    });

    const agentId = visit.assignedAgentId || visit.referralAgentId;
    if (agentId) {
      await notificationService.create({
        userId: agentId,
        userRole: ROLES.AGENT,
        titleEn: 'Customer Dropped with Reason',
        messageEn: `Customer dropped "${propertyTitle}". Reason: ${reasonText}`,
        notificationType: 'site_visit_dropped_agent',
        referenceType: 'site_visit',
        referenceId: visit.id,
        linkPath: '/mediator/visits',
        createdBy: customer.id,
      });
    }

    return formatted;
  }

  assertEmployeeVisitAccess(visit, actor) {
    if (!actor) {
      const err = new Error('Unauthorized.');
      err.status = 401;
      throw err;
    }
    if (actor.role === ROLES.ADMIN || actor.role === ROLES.SALES_MEMBER) return;
    if (actor.role !== ROLES.EMPLOYEE) {
      const err = new Error('Forbidden.');
      err.status = 403;
      throw err;
    }
    const perms = Array.isArray(actor.permissions) ? actor.permissions : [];
    const canViewUnassigned = perms.includes(EMPLOYEE_PERMISSIONS.VIEW_UNASSIGNED_RECORDS);
    if (visit.assignedEmployeeId === actor.id) return;
    if (!visit.assignedEmployeeId && canViewUnassigned) return;
    const err = new Error('You do not have access to this site visit.');
    err.status = 403;
    throw err;
  }

  async assignEmployee(id, adminUser, body = {}) {
    const visit = await SiteVisit.findByPk(Number(id));
    if (!visit) {
      const err = new Error('Site visit not found.');
      err.status = 404;
      throw err;
    }
    if (['REJECTED', 'CLOSED', 'DROPPED'].includes(visit.status)) {
      const err = new Error('Cannot assign employee to this site visit.');
      err.status = 400;
      throw err;
    }

    const employeeId = Number(body.employeeId || body.assignedEmployeeId);
    if (!employeeId) {
      const err = new Error('Employee id is required.');
      err.status = 400;
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

    await visit.update({
      assignedEmployeeId: employee.id,
      modifiedBy: adminUser.id,
    });
    await this.addHistory(
      visit.id,
      visit.status,
      visit.status,
      `Assigned employee ${employee.name} (${employee.memberId || employee.id})`,
      adminUser.id
    );
    return this.getById(visit.id);
  }

  async updateEmployeeVisit(id, actor, body = {}) {
    const visit = await SiteVisit.findByPk(Number(id));
    if (!visit) {
      const err = new Error('Site visit not found.');
      err.status = 404;
      throw err;
    }
    this.assertEmployeeVisitAccess(visit, actor);

    const updates = { modifiedBy: actor.id };
    const notes = [];

    if (body.employeeVisitStatus != null || body.status != null) {
      updates.employeeVisitStatus = String(body.employeeVisitStatus || body.status).trim().toLowerCase() || null;
      notes.push(`Visit status: ${updates.employeeVisitStatus}`);
    }
    if (body.outcome != null || body.employeeOutcome != null) {
      updates.employeeOutcome = String(body.outcome || body.employeeOutcome || '').trim() || null;
      notes.push(`Outcome: ${updates.employeeOutcome}`);
    }
    if (body.notes != null || body.employeeNotes != null || body.note != null) {
      const text = String(body.notes || body.employeeNotes || body.note || '').trim();
      if (body.appendNote && visit.employeeNotes) {
        updates.employeeNotes = `${visit.employeeNotes}\n${text}`.trim();
      } else {
        updates.employeeNotes = text || null;
      }
      notes.push('Employee notes updated');
    }
    if (!visit.assignedEmployeeId && actor.role === ROLES.EMPLOYEE) {
      updates.assignedEmployeeId = actor.id;
    }

    await visit.update(updates);
    if (notes.length) {
      await this.addHistory(visit.id, visit.status, visit.status, notes.join('; '), actor.id);
      await this.logActivity('SiteVisit', visit.id, 'EMPLOYEE_VISIT_UPDATE', notes.join('; '), actor.id);
    }

    if (String(updates.employeeVisitStatus || '').toLowerCase() === 'completed') {
      try {
        return await this.markCompleted(visit.id, actor, { note: 'Completed by employee' });
      } catch {
        // fall through if pipeline status cannot be completed yet
      }
    }

    return this.getById(visit.id, { actor });
  }

  async close(id, adminUser, body = {}) {
    const visit = await SiteVisit.findByPk(Number(id));
    if (!visit) {
      const err = new Error('Site visit not found.');
      err.status = 404;
      throw err;
    }
    const note = String(body.note || body.remarks || 'Closed').trim();
    const from = visit.status;
    await visit.update({ status: 'CLOSED', modifiedBy: adminUser.id });
    await this.addHistory(visit.id, from, 'CLOSED', note, adminUser.id);
    await this.logActivity('SiteVisit', visit.id, 'CLOSED', note, adminUser.id);
    return this.getById(visit.id);
  }
}

module.exports = new SiteVisitService();
module.exports.DROP_REASONS = DROP_REASONS;
