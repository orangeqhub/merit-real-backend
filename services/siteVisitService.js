'use strict';

const { Op } = require('sequelize');
const {
  SiteVisit,
  SiteVisitHistory,
  SiteVisitFollowUp,
  SiteVisitVehicleAssignment,
  SiteVisitRescheduleHistory,
  ActivityLog,
  ExpressInterest,
  ExpressInterestHistory,
  PurchaseRequest,
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
const interestDecisionService = require('./interestDecisionService');
const { siteVisitLink } = require('../utils/notificationLinks');
const { emitSiteVisitUpdated } = require('../utils/realtime');

const OPEN_STATUSES = [
  'PENDING_APPROVAL',
  'APPROVED',
  'ASSIGNED',
  'SCHEDULED',
  'RESCHEDULE_REQUESTED',
  'IN_PROGRESS',
  'VEHICLE_REQUIRED',
  'VEHICLE_APPROVED',
  'VEHICLE_ASSIGNED',
  'VEHICLE_CHANGE_REQUESTED',
  'CONFIRMED',
  'STARTED',
  'COMPLETED',
  'PURCHASE_INTEREST',
];
const TERMINAL_STATUSES = ['REJECTED', 'DROPPED', 'NO_SHOW', 'CANCELLED', 'CLOSED'];
const ACTIVE_VISIT_STATUSES = [
  'APPROVED', 'ASSIGNED', 'SCHEDULED', 'RESCHEDULE_REQUESTED', 'IN_PROGRESS',
  'VEHICLE_REQUIRED', 'VEHICLE_APPROVED', 'VEHICLE_ASSIGNED',
  'VEHICLE_CHANGE_REQUESTED', 'CONFIRMED', 'STARTED',
];
const VEHICLE_STATUSES = [
  'NOT_REQUIRED', 'REQUIRED', 'PENDING_APPROVAL', 'REQUESTED', 'APPROVED',
  'ASSIGNED', 'AWAITING_CUSTOMER_ACCEPTANCE', 'ACCEPTED', 'REJECTED',
  'PENDING_CUSTOMER_ACCEPTANCE',
  'CHANGE_REQUESTED', 'EN_ROUTE', 'ARRIVED', 'COMPLETED', 'CANCELLED',
];
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
      {
        model: SiteVisitFollowUp,
        as: 'followUps',
        include: [{ model: User, as: 'actor', attributes: ['id', 'name', 'memberId', 'role'] }],
        separate: true,
        order: [['createdAt', 'DESC']],
      },
      {
        model: ExpressInterest,
        as: 'expressInterest',
        attributes: ['id', 'status', 'customerDecision', 'createdAt'],
      },
      {
        model: PurchaseRequest,
        as: 'purchaseRequest',
        attributes: ['id', 'status', 'paymentStatus', 'createdAt'],
      },
      {
        model: SiteVisitVehicleAssignment,
        as: 'vehicleAssignments',
        separate: true,
        order: [['createdAt', 'DESC']],
      },
      {
        model: SiteVisitRescheduleHistory,
        as: 'rescheduleHistory',
        separate: true,
        order: [['createdAt', 'DESC']],
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

  scheduledDateTime(visitDate, visitTime) {
    const date = this.parseVisitDate(visitDate);
    const time = this.parseVisitTime(visitTime);
    if (!date || !time) return null;
    const when = new Date(`${date}T${time}:00`);
    return Number.isNaN(when.getTime()) ? null : when;
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
    const startedAtMs = r.startedAt ? new Date(r.startedAt).getTime() : NaN;
    const completedAtMs = r.completedAt ? new Date(r.completedAt).getTime() : NaN;
    const visitDurationMinutes = Number.isFinite(startedAtMs) && Number.isFinite(completedAtMs)
      ? Math.max(0, Math.round((completedAtMs - startedAtMs) / 60000))
      : null;
    const canConfirmCompletion = r.expressInterestId
      ? statusRaw === 'COMPLETED'
      : (
          ['APPROVED', 'ASSIGNED', 'SCHEDULED', 'CONFIRMED', 'STARTED', 'IN_PROGRESS', 'COMPLETED'].includes(statusRaw)
          && (statusRaw === 'COMPLETED' || this.visitDateTimePassed(r.visitDate, r.visitTime))
          && !['PURCHASE_INTEREST', 'DROPPED', 'REJECTED', 'CLOSED', 'PENDING_APPROVAL'].includes(statusRaw)
        );

    return {
      id: r.id,
      siteVisitId: r.id,
      visitId: r.id,
      customerId: r.customerId,
      propertyId: r.propertyId,
      referralAgentId: r.referralAgentId,
      assignedAgentId: r.assignedAgentId,
      assignedEmployeeId: r.assignedEmployeeId || null,
      expressInterestId: r.expressInterestId || null,
      purchaseRequestId: r.purchaseRequestId || null,
      visitDate: r.visitDate,
      visitTime: r.visitTime,
      scheduledAt: r.scheduledAt || this.scheduledDateTime(r.visitDate, r.visitTime),
      scheduledFor: r.visitDate && r.visitTime ? `${r.visitDate} ${r.visitTime}` : r.visitDate,
      status: String(r.status || '').toLowerCase(),
      statusRaw: r.status,
      employeeVisitStatus: r.employeeVisitStatus || null,
      outcome: r.employeeOutcome || null,
      notes: r.employeeNotes || r.internalRemarks || null,
      isActiveVisit: ACTIVE_VISIT_STATUSES.includes(r.status),
      canConfirmCompletion: Boolean(canConfirmCompletion),
      canStart: r.status === 'CONFIRMED',
      canReschedule: [...ACTIVE_VISIT_STATUSES, 'PENDING_APPROVAL'].includes(r.status),
      canCancel: !TERMINAL_STATUSES.includes(r.status) && !['PURCHASE_INTEREST'].includes(r.status),
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
      visitDurationMinutes,
      startedAt: r.startedAt || null,
      startedById: r.startedById || null,
      noShowAt: r.noShowAt || null,
      noShowById: r.noShowById || null,
      cancelledAt: r.cancelledAt || null,
      cancelledById: r.cancelledById || null,
      cancellationReason: r.cancellationReason || null,
      rescheduleReason: r.rescheduleReason || null,
      previousSchedule: Array.isArray(r.previousSchedule) ? r.previousSchedule : [],
      meetingLocation: r.meetingLocation || property?.city || property?.ventureName || null,
      attendeeCount: Number(r.attendeeCount || 1),
      visitorCount: Number(r.visitorCount || r.attendeeCount || 1),
      visitMode: r.visitMode || (r.vehicleRequired ? 'company_vehicle' : 'own_vehicle'),
      pickupLocation: r.pickupLocation || null,
      pickupCity: r.pickupCity || null,
      pickupDistrict: r.pickupDistrict || null,
      pickupState: r.pickupState || null,
      pickupLatitude: r.pickupLatitude != null ? Number(r.pickupLatitude) : null,
      pickupLongitude: r.pickupLongitude != null ? Number(r.pickupLongitude) : null,
      preferredPickupTime: r.preferredPickupTime || null,
      pickupDate: r.pickupDate || null,
      pickupTime: r.pickupTime || null,
      propertyAddress: r.propertyAddressSnapshot || property?.address || null,
      propertyCity: r.propertyCitySnapshot || property?.city || null,
      propertyDistrict: r.propertyDistrictSnapshot || property?.district || null,
      propertyState: r.propertyStateSnapshot || property?.state || null,
      propertyLatitude: r.propertyLatitudeSnapshot != null ? Number(r.propertyLatitudeSnapshot) : null,
      propertyLongitude: r.propertyLongitudeSnapshot != null ? Number(r.propertyLongitudeSnapshot) : null,
      propertyAddressSnapshot: r.propertyAddressSnapshot || null,
      propertyCitySnapshot: r.propertyCitySnapshot || null,
      propertyDistrictSnapshot: r.propertyDistrictSnapshot || null,
      propertyStateSnapshot: r.propertyStateSnapshot || null,
      propertyLatitudeSnapshot: r.propertyLatitudeSnapshot != null ? Number(r.propertyLatitudeSnapshot) : null,
      propertyLongitudeSnapshot: r.propertyLongitudeSnapshot != null ? Number(r.propertyLongitudeSnapshot) : null,
      vehicleRequired: Boolean(r.vehicleRequired),
      vehicleStatus: r.vehicleStatus || (r.vehicleRequired ? 'REQUESTED' : 'NOT_REQUIRED'),
      vehicleType: r.vehicleType || null,
      vehicleModel: r.vehicleModel || null,
      vehicleColor: r.vehicleColor || null,
      vehicleCapacity: r.vehicleCapacity != null ? Number(r.vehicleCapacity) : null,
      capacity: r.vehicleCapacity != null ? Number(r.vehicleCapacity) : null,
      vehicleReference: r.vehicleReference || null,
      vehicleId: r.vehicleReference || null,
      vehicleRef: r.vehicleReference || null,
      vehicleNumber: r.vehicleNumber || null,
      driverName: r.driverName || null,
      driverMobile: r.driverMobile || null,
      driverPhone: r.driverMobile || null,
      driverId: r.driverId || null,
      driverReference: r.driverReference || null,
      driverRef: r.driverReference || null,
      driverLicenseNumber: r.driverLicenseNumber || null,
      driverLicense: r.driverLicenseNumber || null,
      pickupAddress: r.pickupAddress || null,
      pickupAt: r.pickupAt || null,
      vehicleAssignedAt: r.vehicleAssignedAt || null,
      dropLocation: r.dropLocation || null,
      driverRemarks: r.driverRemarks || null,
      vehicleRemarks: r.vehicleRemarks || null,
      customerAcceptedAt: r.customerAcceptedAt || null,
      confirmedAt: r.confirmedAt || null,
      adminReviewedAt: r.adminReviewedAt || null,
      rescheduledAt: r.rescheduledAt || null,
      agentRemarks: r.agentRemarks || null,
      customerVehicleChangeRequest: r.customerVehicleChangeRequest || null,
      customerChangeRequest: r.customerVehicleChangeRequest || null,
      rescheduleRequest: r.rescheduleRequest || null,
      reminderFlags: r.reminderFlags || {},
      nextFollowUpAt: r.nextFollowUpAt || null,
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
      agentGrade: assigned?.agentGrade || referral?.agentGrade || null,
      property: property
        ? {
            id: property.id,
            titleEn: property.titleEn,
            titleTe: property.titleTe,
            ventureName: property.ventureName,
            city: property.city,
            district: property.district,
            state: property.state,
            address: property.address,
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
        action: h.action || null,
        actorRole: h.actorRole || h.actor?.role || null,
        remarks: h.remarks || null,
        metadata: h.metadata || {},
        createdBy: h.createdBy,
        actorName: h.actor?.name || null,
        createdAt: h.createdAt,
      })),
      followUps: (r.followUps || []).map((f) => ({
        id: f.id,
        status: f.status,
        remarks: f.remarks,
        nextFollowUpAt: f.nextFollowUpAt,
        createdBy: f.createdBy,
        actorName: f.actor?.name || null,
        createdAt: f.createdAt,
      })),
      expressInterest: r.expressInterest || null,
      purchaseRequest: r.purchaseRequest || null,
      vehicleAssignments: r.vehicleAssignments || [],
      rescheduleHistory: r.rescheduleHistory || [],
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

  async addHistory(siteVisitId, fromStatus, toStatus, note, createdBy, transaction, options = {}) {
    await SiteVisitHistory.create({
      siteVisitId,
      fromStatus,
      toStatus,
      note: note || null,
      action: options.action || null,
      actorRole: options.actorRole || null,
      remarks: options.remarks || note || null,
      metadata: options.metadata || {},
      createdBy: createdBy || null,
    }, { transaction });
  }

  publish(visit, formatted, action = 'updated') {
    emitSiteVisitUpdated(
      [
        visit.customerId,
        visit.assignedAgentId,
        visit.referralAgentId,
        visit.assignedEmployeeId,
      ].filter(Boolean),
      formatted,
      action
    );
  }

  async notifyVisitAgent(visit, {
    titleEn,
    messageEn,
    notificationType,
    createdBy = null,
  }) {
    const agentId = visit.assignedAgentId || visit.referralAgentId;
    if (!agentId || Number(agentId) === Number(createdBy)) return null;
    return notificationService.create({
      userId: agentId,
      userRole: ROLES.AGENT,
      titleEn,
      messageEn,
      notificationType,
      referenceType: 'site_visit',
      referenceId: visit.id,
      linkPath: siteVisitLink(ROLES.AGENT, visit.id),
      createdBy,
    });
  }

  assertParticipantAccess(visit, actor, { customer = false } = {}) {
    if (!actor) {
      const err = new Error('Unauthorized.');
      err.status = 401;
      throw err;
    }
    if ([ROLES.ADMIN, ROLES.SALES_MEMBER].includes(actor.role)) return;
    if (actor.role === ROLES.CUSTOMER && customer && visit.customerId === actor.id) return;
    if (
      actor.role === ROLES.AGENT
      && [visit.assignedAgentId, visit.referralAgentId].filter(Boolean).includes(actor.id)
    ) return;
    if (actor.role === ROLES.EMPLOYEE) {
      this.assertEmployeeVisitAccess(visit, actor);
      return;
    }
    const err = new Error('You do not have access to update this site visit.');
    err.status = 403;
    err.code = 'FORBIDDEN';
    throw err;
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
    if (filters.expressInterestId) where.expressInterestId = Number(filters.expressInterestId);
    if (filters.vehicleStatus) where.vehicleStatus = String(filters.vehicleStatus).trim().toUpperCase();
    if (filters.employeeVisitStatus) {
      where.employeeVisitStatus = String(filters.employeeVisitStatus).trim().toLowerCase();
    }
    if (filters.dateFrom || filters.dateTo) {
      where.visitDate = {};
      if (filters.dateFrom) where.visitDate[Op.gte] = this.parseVisitDate(filters.dateFrom);
      if (filters.dateTo) where.visitDate[Op.lte] = this.parseVisitDate(filters.dateTo);
    }

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

    let linkedInterest = null;
    if (body.expressInterestId) {
      linkedInterest = await ExpressInterest.findByPk(Number(body.expressInterestId));
      if (
        !linkedInterest
        || linkedInterest.customerId !== customer.id
        || linkedInterest.propertyId !== propertyId
        || !['APPROVED', 'ASSIGNED'].includes(linkedInterest.status)
      ) {
        const err = new Error('A linked express interest must be approved and belong to this customer and property.');
        err.status = 400;
        err.code = 'INVALID_EXPRESS_INTEREST';
        throw err;
      }
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
    const scheduledAt = this.scheduledDateTime(visitDate, visitTime);
    const normalizedVisitMode = String(body.visitMode || '').trim().toLowerCase();
    const visitMode = normalizedVisitMode === 'company_vehicle' ? 'company_vehicle' : 'own_vehicle';
    const vehicleFlag = body.vehicleRequired ?? body.needVehicle ?? body.transportRequired
      ?? (visitMode === 'company_vehicle');
    const vehicleRequired = visitMode === 'company_vehicle' || vehicleFlag === true || vehicleFlag === 1
      || ['true', '1', 'yes'].includes(String(vehicleFlag || '').toLowerCase());
    const visitorCount = Math.min(20, Math.max(1, Number(body.visitorCount || body.attendeeCount) || 1));
    const pickupAddress = String(body.pickupAddress || '').trim();
    const pickupLocation = String(body.pickupLocation || '').trim();
    const preferredPickupTime = this.parseVisitTime(body.preferredPickupTime || body.pickupTime);
    if (vehicleRequired && (!pickupAddress || !pickupLocation || !preferredPickupTime)) {
      const err = new Error(
        'Pickup address, pickup location, and preferred pickup time are required for a company vehicle.'
      );
      err.status = 400;
      err.code = 'COMPANY_VEHICLE_PICKUP_REQUIRED';
      throw err;
    }
    const propertyDetails = property.detailsJson || {};
    const propertyLatitude = propertyDetails.latitude ?? propertyDetails.lat ?? null;
    const propertyLongitude = propertyDetails.longitude ?? propertyDetails.lng ?? propertyDetails.long ?? null;

    const result = await sequelize.transaction(async (transaction) => {
      const visit = await SiteVisit.create({
        customerId: customer.id,
        propertyId,
        referralAgentId: referralAgent?.id || null,
        assignedAgentId: referralAgent?.id || linkedInterest?.assignedAgentId || linkedInterest?.referralAgentId || null,
        expressInterestId: linkedInterest?.id || null,
        visitDate,
        visitTime,
        scheduledAt,
        visitMode,
        visitorCount,
        status: vehicleRequired ? 'VEHICLE_REQUIRED' : 'PENDING_APPROVAL',
        remarks,
        meetingLocation: String(body.meetingLocation || '').trim() || null,
        attendeeCount: visitorCount,
        vehicleRequired,
        vehicleStatus: vehicleRequired ? 'PENDING_APPROVAL' : 'NOT_REQUIRED',
        pickupAddress: vehicleRequired ? pickupAddress : null,
        pickupLocation: vehicleRequired ? pickupLocation : null,
        pickupCity: String(body.pickupCity || customer.city || '').trim() || null,
        pickupDistrict: String(body.pickupDistrict || customer.district || '').trim() || null,
        pickupState: String(body.pickupState || '').trim() || null,
        pickupLatitude: body.pickupLatitude ?? body.latitude ?? null,
        pickupLongitude: body.pickupLongitude ?? body.longitude ?? null,
        preferredPickupTime: vehicleRequired ? preferredPickupTime : null,
        pickupDate: vehicleRequired ? (this.parseVisitDate(body.pickupDate) || visitDate) : null,
        pickupTime: vehicleRequired ? preferredPickupTime : null,
        pickupAt: body.pickupAt ? new Date(body.pickupAt) : null,
        propertyAddressSnapshot: property.address || property.locationEn || null,
        propertyCitySnapshot: property.city || null,
        propertyDistrictSnapshot: property.district || null,
        propertyStateSnapshot: property.state || null,
        propertyLatitudeSnapshot: propertyLatitude,
        propertyLongitudeSnapshot: propertyLongitude,
        dropLocation: property.address || property.locationEn || property.city || property.ventureName || null,
        reminderFlags: {},
        referralAgentCode: agentCode || null,
        referralAgentNameSnapshot: referralAgent?.name || null,
        createdBy: customer.id,
        modifiedBy: customer.id,
      }, { transaction });

      await this.addHistory(
        visit.id,
        null,
        vehicleRequired ? 'VEHICLE_REQUIRED' : 'PENDING_APPROVAL',
        'Site visit requested',
        customer.id,
        transaction,
        {
          action: 'SUBMITTED',
          actorRole: customer.role,
          metadata: { visitMode, visitorCount },
        }
      );
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
      linkPath: siteVisitLink(ROLES.ADMIN, result),
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
      linkPath: siteVisitLink(ROLES.CUSTOMER, result),
      createdBy: customer.id,
      allowSelfNotification: true,
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
        linkPath: siteVisitLink(ROLES.AGENT, result),
        createdBy: customer.id,
      });
    }
    const linkedAgentId = formatted.assignedAgentId;
    if (linkedAgentId && linkedAgentId !== referralAgent?.id) {
      await this.notifyVisitAgent(
        { ...formatted, id: result },
        {
          titleEn: 'New Site Visit Request',
          messageEn: `${customer.name} requested a site visit for "${property.titleEn}".`,
          notificationType: 'site_visit_assigned_request',
          createdBy: customer.id,
        }
      );
    }

    emitSiteVisitUpdated(
      [customer.id, referralAgent?.id].filter(Boolean),
      formatted,
      'created'
    );

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
      linkPath: siteVisitLink(ROLES.CUSTOMER, visit.id),
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
        linkPath: siteVisitLink(ROLES.AGENT, visit.id),
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
        linkPath: siteVisitLink(ROLES.CUSTOMER, visit.id),
        createdBy: adminUser.id,
      });
    }

    this.publish(visit, formatted, 'approved');
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
      linkPath: siteVisitLink(ROLES.CUSTOMER, visit.id),
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
        linkPath: siteVisitLink(ROLES.AGENT, visit.id),
        createdBy: adminUser.id,
      });
    }

    this.publish(visit, formatted, 'rejected');
    return formatted;
  }

  async assignAgent(id, adminUser, body = {}) {
    const visit = await SiteVisit.findByPk(Number(id));
    if (!visit) {
      const err = new Error('Site visit not found.');
      err.status = 404;
      throw err;
    }
    if (TERMINAL_STATUSES.includes(visit.status) || ['COMPLETED', 'PURCHASE_INTEREST'].includes(visit.status)) {
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
      linkPath: siteVisitLink(ROLES.AGENT, visit.id),
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
      linkPath: siteVisitLink(ROLES.CUSTOMER, visit.id),
      createdBy: adminUser.id,
    });

    this.publish(visit, formatted, 'assigned');
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
    const formatted = await this.getById(visit.id);
    this.publish(visit, formatted, 'updated');
    return formatted;
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

    const completionStatuses = visit.expressInterestId
      ? ['STARTED', 'IN_PROGRESS', 'COMPLETED']
      : [
          'APPROVED', 'ASSIGNED', 'SCHEDULED', 'CONFIRMED',
          'VEHICLE_ASSIGNED', 'STARTED', 'IN_PROGRESS', 'COMPLETED',
        ];
    if (!completionStatuses.includes(visit.status)) {
      const err = new Error(
        visit.expressInterestId
          ? 'The linked site visit must be started before it can be completed.'
          : 'Only approved or assigned site visits can be marked completed.'
      );
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
        employeeVisitStatus: 'completed',
        vehicleStatus: visit.vehicleRequired ? 'COMPLETED' : visit.vehicleStatus,
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
      linkPath: siteVisitLink(ROLES.CUSTOMER, visit.id),
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
        linkPath: siteVisitLink(ROLES.AGENT, visit.id),
        createdBy: actor.id,
      });
    }
    await notificationService.notifyAdmins({
      titleEn: 'Site Visit Completed',
      messageEn: `Site visit #${visit.id} for "${propertyTitle}" was completed.`,
      notificationType: 'site_visit_completed_admin',
      referenceType: 'site_visit',
      referenceId: visit.id,
      linkPath: siteVisitLink(ROLES.ADMIN, visit.id),
      createdBy: actor.id,
    });

    this.publish(visit, formatted, 'completed');
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
    if (visit.expressInterestId) {
      const result = await this.postVisitPurchase(visit.id, customer, body);
      return result.siteVisit;
    }

    const eligible =
      ['COMPLETED'].includes(visit.status) ||
      (['APPROVED', 'ASSIGNED', 'SCHEDULED', 'CONFIRMED', 'STARTED', 'IN_PROGRESS'].includes(visit.status)
        && this.visitDateTimePassed(visit.visitDate, visit.visitTime));

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
      linkPath: siteVisitLink(ROLES.ADMIN, visit.id),
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
      linkPath: siteVisitLink(ROLES.CUSTOMER, visit.id),
      createdBy: customer.id,
      allowSelfNotification: true,
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
        linkPath: siteVisitLink(ROLES.AGENT, visit.id),
        createdBy: customer.id,
      });
    }

    this.publish(visit, formatted, 'purchase-interest');
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
      (['APPROVED', 'ASSIGNED', 'SCHEDULED', 'CONFIRMED', 'STARTED', 'IN_PROGRESS'].includes(visit.status)
        && this.visitDateTimePassed(visit.visitDate, visit.visitTime));

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
      linkPath: siteVisitLink(ROLES.ADMIN, visit.id),
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
      linkPath: siteVisitLink(ROLES.CUSTOMER, visit.id),
      createdBy: customer.id,
      allowSelfNotification: true,
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
        linkPath: siteVisitLink(ROLES.AGENT, visit.id),
        createdBy: customer.id,
      });
    }

    this.publish(visit, formatted, 'dropped');
    return formatted;
  }

  async confirm(id, actor, body = {}) {
    const visit = await SiteVisit.findByPk(Number(id));
    if (!visit) {
      const err = new Error('Site visit not found.');
      err.status = 404;
      throw err;
    }
    this.assertParticipantAccess(visit, actor, { customer: true });
    if (visit.status === 'CONFIRMED') return this.getById(visit.id, { actor });
    if (visit.status === 'RESCHEDULE_REQUESTED' && visit.rescheduleRequest) {
      const err = new Error('Apply or resolve the pending reschedule request before confirming the visit.');
      err.status = 409;
      err.code = 'RESCHEDULE_REQUEST_PENDING';
      throw err;
    }
    if (TERMINAL_STATUSES.includes(visit.status) || ['COMPLETED', 'PURCHASE_INTEREST'].includes(visit.status)) {
      const err = new Error('This site visit cannot be confirmed in its current status.');
      err.status = 400;
      throw err;
    }
    const mode = visit.visitMode || (visit.vehicleRequired ? 'company_vehicle' : 'own_vehicle');
    if (mode === 'company_vehicle' && visit.vehicleStatus !== 'ACCEPTED') {
      const err = new Error('The customer must accept the assigned company vehicle before confirmation.');
      err.status = 409;
      err.code = 'VEHICLE_ACCEPTANCE_REQUIRED';
      throw err;
    }
    if (
      mode === 'own_vehicle'
      && !['APPROVED', 'ASSIGNED', 'SCHEDULED'].includes(visit.status)
    ) {
      const err = new Error('The site visit must be approved before confirmation.');
      err.status = 409;
      err.code = 'SITE_VISIT_APPROVAL_REQUIRED';
      throw err;
    }
    const from = visit.status;
    const note = String(body.remarks || body.note || 'Site visit confirmed').trim();
    await sequelize.transaction(async (transaction) => {
      await visit.update({
        status: 'CONFIRMED',
        confirmedAt: new Date(),
        modifiedBy: actor.id,
      }, { transaction });
      await this.addHistory(visit.id, from, 'CONFIRMED', note, actor.id, transaction, {
        action: 'CONFIRMED',
        actorRole: actor.role,
      });
      await this.logActivity('SiteVisit', visit.id, 'CONFIRMED', note, actor.id, transaction);
    });
    const formatted = await this.getById(visit.id);
    await notificationService.notifyAdmins({
      titleEn: 'Site Visit Confirmed',
      messageEn: `Site visit #${visit.id} was confirmed.`,
      notificationType: 'site_visit_confirmed',
      referenceType: 'site_visit',
      referenceId: visit.id,
      linkPath: siteVisitLink(ROLES.ADMIN, visit.id),
      createdBy: actor.id,
    });
    if (actor.id !== visit.customerId) {
      await notificationService.create({
        userId: visit.customerId,
        userRole: ROLES.CUSTOMER,
        titleEn: 'Site Visit Confirmed',
        messageEn: `Your site visit for "${formatted.propertyName}" is confirmed.`,
        notificationType: 'site_visit_confirmed',
        referenceType: 'site_visit',
        referenceId: visit.id,
        linkPath: siteVisitLink(ROLES.CUSTOMER, visit.id),
        createdBy: actor.id,
      });
    }
    await this.notifyVisitAgent(visit, {
      titleEn: 'Site Visit Confirmed',
      messageEn: `Site visit #${visit.id} for "${formatted.propertyName}" is confirmed.`,
      notificationType: 'site_visit_confirmed_agent',
      createdBy: actor.id,
    });
    this.publish(visit, formatted, 'confirmed');
    return formatted;
  }

  async approveVehicle(id, actor, body = {}) {
    const visit = await SiteVisit.findByPk(Number(id));
    if (!visit) {
      const err = new Error('Site visit not found.');
      err.status = 404;
      throw err;
    }
    if (![ROLES.ADMIN, ROLES.SALES_MEMBER].includes(actor.role)) {
      const err = new Error('Only admin or sales staff can approve vehicle requests.');
      err.status = 403;
      throw err;
    }
    if ((visit.visitMode || '') !== 'company_vehicle' && !visit.vehicleRequired) {
      const err = new Error('This site visit does not require a company vehicle.');
      err.status = 400;
      throw err;
    }
    if (!['PENDING_APPROVAL', 'REQUESTED', 'CHANGE_REQUESTED', 'REJECTED'].includes(visit.vehicleStatus)) {
      const err = new Error('This company vehicle request is not awaiting approval.');
      err.status = 409;
      throw err;
    }
    const from = visit.status;
    const remarks = String(body.remarks || body.note || 'Company vehicle request approved').trim();
    await sequelize.transaction(async (transaction) => {
      await visit.update({
        status: 'VEHICLE_APPROVED',
        vehicleStatus: 'APPROVED',
        adminReviewedAt: new Date(),
        approvedById: actor.id,
        approvedAt: visit.approvedAt || new Date(),
        vehicleRemarks: remarks,
        modifiedBy: actor.id,
      }, { transaction });
      await this.addHistory(visit.id, from, 'VEHICLE_APPROVED', remarks, actor.id, transaction, {
        action: 'VEHICLE_APPROVED', actorRole: actor.role,
      });
      await this.logActivity('SiteVisit', visit.id, 'VEHICLE_APPROVED', remarks, actor.id, transaction);
    });
    const formatted = await this.getById(visit.id);
    await notificationService.create({
      userId: visit.customerId,
      userRole: ROLES.CUSTOMER,
      titleEn: 'Company Vehicle Approved',
      messageEn: 'Your company vehicle request was approved and is awaiting assignment.',
      notificationType: 'site_visit_vehicle_approved',
      referenceType: 'site_visit',
      referenceId: visit.id,
      linkPath: siteVisitLink(ROLES.CUSTOMER, visit.id),
      createdBy: actor.id,
    });
    await this.notifyVisitAgent(visit, {
      titleEn: 'Company Vehicle Approved',
      messageEn: `The company vehicle request for site visit #${visit.id} was approved.`,
      notificationType: 'site_visit_vehicle_approved_agent',
      createdBy: actor.id,
    });
    this.publish(visit, formatted, 'vehicle-approved');
    return formatted;
  }

  vehicleAssignmentPayload(visit, body, actorId) {
    return {
      siteVisitId: visit.id,
      vehicleStatus: 'PENDING_CUSTOMER_ACCEPTANCE',
      vehicleType: String(body.vehicleType || visit.vehicleType || '').trim() || null,
      vehicleModel: String(body.vehicleModel || visit.vehicleModel || '').trim() || null,
      vehicleNumber: String(body.vehicleNumber || visit.vehicleNumber || '').trim() || null,
      vehicleColor: String(body.vehicleColor || visit.vehicleColor || '').trim() || null,
      vehicleCapacity: Number(body.vehicleCapacity || body.capacity || visit.vehicleCapacity) || null,
      vehicleReference: String(body.vehicleReference || body.vehicleId || visit.vehicleReference || '').trim() || null,
      driverId: Number(body.driverId || visit.driverId) || null,
      driverName: String(body.driverName || visit.driverName || '').trim() || null,
      driverPhone: String(body.driverPhone || body.driverMobile || visit.driverMobile || '').trim() || null,
      driverReference: String(body.driverReference || visit.driverReference || '').trim() || null,
      driverLicenseNumber: String(body.driverLicenseNumber || body.driverLicense || visit.driverLicenseNumber || '').trim() || null,
      pickupDate: this.parseVisitDate(body.pickupDate) || visit.pickupDate || visit.visitDate,
      pickupTime: this.parseVisitTime(body.pickupTime || body.preferredPickupTime)
        || visit.pickupTime || visit.preferredPickupTime,
      pickupAddress: String(body.pickupAddress || visit.pickupAddress || '').trim() || null,
      pickupLocation: String(body.pickupLocation || visit.pickupLocation || '').trim() || null,
      dropLocation: String(body.dropLocation || visit.dropLocation || '').trim() || null,
      remarks: String(body.remarks || body.vehicleRemarks || '').trim() || null,
      assignedById: actorId,
      metadata: {},
    };
  }

  async assignVehicle(id, actor, body = {}) {
    const visit = await SiteVisit.findByPk(Number(id));
    if (!visit) {
      const err = new Error('Site visit not found.');
      err.status = 404;
      throw err;
    }
    if (![ROLES.ADMIN, ROLES.SALES_MEMBER].includes(actor.role)) {
      const err = new Error('Only admin or sales staff can assign a vehicle.');
      err.status = 403;
      throw err;
    }
    if (!['APPROVED', 'CHANGE_REQUESTED', 'REJECTED'].includes(visit.vehicleStatus)) {
      const err = new Error('Approve the company vehicle request before assigning a vehicle.');
      err.status = 409;
      throw err;
    }
    const assignment = this.vehicleAssignmentPayload(visit, body, actor.id);
    if (
      !assignment.vehicleType || !assignment.vehicleNumber || !assignment.driverName || !assignment.driverPhone
      || !assignment.driverLicenseNumber || !assignment.pickupAddress
      || !assignment.pickupLocation || !assignment.dropLocation
      || !assignment.pickupDate || !assignment.pickupTime
    ) {
      const err = new Error('Complete vehicle, driver, pickup date/time, address, and location details are required.');
      err.status = 400;
      throw err;
    }
    const from = visit.status;
    await sequelize.transaction(async (transaction) => {
      await SiteVisitVehicleAssignment.create(assignment, { transaction });
      await visit.update({
        status: 'VEHICLE_ASSIGNED',
        vehicleStatus: 'PENDING_CUSTOMER_ACCEPTANCE',
        vehicleType: assignment.vehicleType,
        vehicleModel: assignment.vehicleModel,
        vehicleNumber: assignment.vehicleNumber,
        vehicleColor: assignment.vehicleColor,
        vehicleCapacity: assignment.vehicleCapacity,
        vehicleReference: assignment.vehicleReference,
        driverId: assignment.driverId,
        driverName: assignment.driverName,
        driverMobile: assignment.driverPhone,
        driverReference: assignment.driverReference,
        driverLicenseNumber: assignment.driverLicenseNumber,
        pickupDate: assignment.pickupDate,
        pickupTime: assignment.pickupTime,
        pickupAddress: assignment.pickupAddress,
        pickupLocation: assignment.pickupLocation,
        dropLocation: assignment.dropLocation,
        driverRemarks: String(body.driverRemarks || '').trim() || null,
        vehicleRemarks: assignment.remarks,
        vehicleAssignedAt: new Date(),
        vehicleAssignedById: actor.id,
        customerVehicleChangeRequest: null,
        modifiedBy: actor.id,
      }, { transaction });
      await this.addHistory(visit.id, from, 'VEHICLE_ASSIGNED', assignment.remarks || 'Vehicle assigned', actor.id, transaction, {
        action: 'VEHICLE_ASSIGNED',
        actorRole: actor.role,
        metadata: { vehicleNumber: assignment.vehicleNumber, driverName: assignment.driverName },
      });
      await this.logActivity('SiteVisit', visit.id, 'VEHICLE_ASSIGNED', assignment.vehicleNumber, actor.id, transaction);
    });
    const formatted = await this.getById(visit.id);
    await notificationService.create({
      userId: visit.customerId,
      userRole: ROLES.CUSTOMER,
      titleEn: 'Company Vehicle Assigned',
      messageEn: `Vehicle ${assignment.vehicleNumber} with driver ${assignment.driverName} is assigned. Please accept or request a change.`,
      notificationType: 'site_visit_vehicle_assigned',
      referenceType: 'site_visit',
      referenceId: visit.id,
      linkPath: siteVisitLink(ROLES.CUSTOMER, visit.id),
      createdBy: actor.id,
    });
    await this.notifyVisitAgent(visit, {
      titleEn: 'Company Vehicle Assigned',
      messageEn: `Vehicle ${assignment.vehicleNumber} was assigned for site visit #${visit.id}.`,
      notificationType: 'site_visit_vehicle_assigned_agent',
      createdBy: actor.id,
    });
    this.publish(visit, formatted, 'vehicle-assigned');
    return formatted;
  }

  async rejectVehicle(id, actor, body = {}) {
    const visit = await SiteVisit.findByPk(Number(id));
    if (!visit) {
      const err = new Error('Site visit not found.');
      err.status = 404;
      throw err;
    }
    if (![ROLES.ADMIN, ROLES.SALES_MEMBER].includes(actor.role)) {
      const err = new Error('Only admin or sales staff can reject vehicle requests.');
      err.status = 403;
      throw err;
    }
    if (!['PENDING_APPROVAL', 'REQUESTED', 'APPROVED', 'CHANGE_REQUESTED'].includes(visit.vehicleStatus)) {
      const err = new Error('This company vehicle request cannot be rejected in its current state.');
      err.status = 409;
      throw err;
    }
    const reason = String(body.reason || body.remarks || body.vehicleRemarks || '').trim();
    if (!reason) {
      const err = new Error('Vehicle rejection reason is required.');
      err.status = 400;
      throw err;
    }
    const from = visit.status;
    await sequelize.transaction(async (transaction) => {
      await visit.update({
        status: 'VEHICLE_REQUIRED',
        vehicleStatus: 'REJECTED',
        vehicleRemarks: reason,
        adminReviewedAt: new Date(),
        modifiedBy: actor.id,
      }, { transaction });
      await this.addHistory(visit.id, from, 'VEHICLE_REQUIRED', reason, actor.id, transaction, {
        action: 'VEHICLE_REJECTED', actorRole: actor.role,
      });
      await this.logActivity('SiteVisit', visit.id, 'VEHICLE_REJECTED', reason, actor.id, transaction);
    });
    const formatted = await this.getById(visit.id);
    await notificationService.create({
      userId: visit.customerId,
      userRole: ROLES.CUSTOMER,
      titleEn: 'Company Vehicle Request Rejected',
      messageEn: `Your company vehicle request was rejected. Reason: ${reason}`,
      notificationType: 'site_visit_vehicle_rejected',
      referenceType: 'site_visit',
      referenceId: visit.id,
      linkPath: siteVisitLink(ROLES.CUSTOMER, visit.id),
      createdBy: actor.id,
    });
    this.publish(visit, formatted, 'vehicle-rejected');
    return formatted;
  }

  async acceptVehicle(id, customer, body = {}) {
    const visit = await SiteVisit.findByPk(Number(id));
    if (!visit) {
      const err = new Error('Site visit not found.');
      err.status = 404;
      throw err;
    }
    if (customer.role !== ROLES.CUSTOMER || visit.customerId !== customer.id) {
      const err = new Error('Only the visit customer can accept the assigned vehicle.');
      err.status = 403;
      throw err;
    }
    if (!['PENDING_CUSTOMER_ACCEPTANCE', 'AWAITING_CUSTOMER_ACCEPTANCE'].includes(visit.vehicleStatus)) {
      const err = new Error('There is no vehicle assignment awaiting acceptance.');
      err.status = 409;
      throw err;
    }
    const from = visit.status;
    await sequelize.transaction(async (transaction) => {
      await visit.update({
        status: 'CONFIRMED',
        vehicleStatus: 'ACCEPTED',
        customerAcceptedAt: new Date(),
        confirmedAt: new Date(),
        modifiedBy: customer.id,
      }, { transaction });
      await this.addHistory(visit.id, from, 'CONFIRMED', 'Customer accepted assigned vehicle', customer.id, transaction, {
        action: 'VEHICLE_ACCEPTED', actorRole: customer.role,
      });
      await this.logActivity('SiteVisit', visit.id, 'VEHICLE_ACCEPTED', visit.vehicleNumber, customer.id, transaction);
    });
    const formatted = await this.getById(visit.id);
    await notificationService.create({
      userId: customer.id,
      userRole: ROLES.CUSTOMER,
      titleEn: 'Vehicle Accepted',
      messageEn: `You accepted vehicle ${visit.vehicleNumber}. Your site visit is confirmed.`,
      notificationType: 'site_visit_vehicle_accepted',
      referenceType: 'site_visit',
      referenceId: visit.id,
      linkPath: siteVisitLink(ROLES.CUSTOMER, visit.id),
      createdBy: customer.id,
      allowSelfNotification: true,
    });
    await notificationService.notifyAdmins({
      titleEn: 'Customer Accepted Vehicle',
      messageEn: `Customer accepted the vehicle for site visit #${visit.id}.`,
      notificationType: 'site_visit_vehicle_accepted_admin',
      referenceType: 'site_visit',
      referenceId: visit.id,
      linkPath: siteVisitLink(ROLES.ADMIN, visit.id),
      createdBy: customer.id,
    });
    await this.notifyVisitAgent(visit, {
      titleEn: 'Customer Accepted Vehicle',
      messageEn: `The customer accepted the company vehicle for site visit #${visit.id}.`,
      notificationType: 'site_visit_vehicle_accepted_agent',
      createdBy: customer.id,
    });
    this.publish(visit, formatted, 'vehicle-accepted');
    return formatted;
  }

  async requestVehicleChange(id, customer, body = {}) {
    const visit = await SiteVisit.findByPk(Number(id));
    if (!visit) {
      const err = new Error('Site visit not found.');
      err.status = 404;
      throw err;
    }
    if (customer.role !== ROLES.CUSTOMER || visit.customerId !== customer.id) {
      const err = new Error('Only the visit customer can request a vehicle change.');
      err.status = 403;
      throw err;
    }
    if (!visit.vehicleNumber) {
      const err = new Error('No vehicle has been assigned.');
      err.status = 409;
      throw err;
    }
    const reason = String(body.reason || body.remarks || '').trim();
    if (!reason) {
      const err = new Error('Vehicle change reason is required.');
      err.status = 400;
      throw err;
    }
    const from = visit.status;
    await sequelize.transaction(async (transaction) => {
      await visit.update({
        status: 'VEHICLE_CHANGE_REQUESTED',
        vehicleStatus: 'CHANGE_REQUESTED',
        customerVehicleChangeRequest: reason,
        customerAcceptedAt: null,
        confirmedAt: null,
        modifiedBy: customer.id,
      }, { transaction });
      await this.addHistory(visit.id, from, 'VEHICLE_CHANGE_REQUESTED', reason, customer.id, transaction, {
        action: 'VEHICLE_CHANGE_REQUESTED', actorRole: customer.role,
      });
      await this.logActivity('SiteVisit', visit.id, 'VEHICLE_CHANGE_REQUESTED', reason, customer.id, transaction);
    });
    const formatted = await this.getById(visit.id);
    await notificationService.notifyAdmins({
      titleEn: 'Vehicle Change Requested',
      messageEn: `Customer requested a vehicle change for visit #${visit.id}. Reason: ${reason}`,
      notificationType: 'site_visit_vehicle_change_requested',
      referenceType: 'site_visit',
      referenceId: visit.id,
      linkPath: siteVisitLink(ROLES.ADMIN, visit.id),
      createdBy: customer.id,
    });
    await this.notifyVisitAgent(visit, {
      titleEn: 'Vehicle Change Requested',
      messageEn: `The customer requested a vehicle change for site visit #${visit.id}.`,
      notificationType: 'site_visit_vehicle_change_agent',
      createdBy: customer.id,
    });
    this.publish(visit, formatted, 'vehicle-change-requested');
    return formatted;
  }

  async requestReschedule(id, customer, body = {}) {
    const visit = await SiteVisit.findByPk(Number(id));
    if (!visit) {
      const err = new Error('Site visit not found.');
      err.status = 404;
      throw err;
    }
    if (customer.role !== ROLES.CUSTOMER || visit.customerId !== customer.id) {
      const err = new Error('Only the visit customer can request rescheduling.');
      err.status = 403;
      throw err;
    }
    if (TERMINAL_STATUSES.includes(visit.status) || ['COMPLETED', 'PURCHASE_INTEREST', 'STARTED'].includes(visit.status)) {
      const err = new Error('This site visit cannot be rescheduled.');
      err.status = 400;
      throw err;
    }
    const newVisitDate = this.parseVisitDate(body.visitDate || body.preferredDate);
    const newVisitTime = this.parseVisitTime(body.visitTime || body.preferredTime);
    const reason = String(body.reason || body.rescheduleReason || body.remarks || '').trim();
    const newScheduledAt = this.scheduledDateTime(newVisitDate, newVisitTime);
    if (!newVisitDate || !newVisitTime || !newScheduledAt || newScheduledAt.getTime() <= Date.now()) {
      const err = new Error('A valid future visit date and time are required.');
      err.status = 400;
      throw err;
    }
    const request = {
      visitDate: newVisitDate,
      visitTime: newVisitTime,
      scheduledAt: newScheduledAt.toISOString(),
      reason: reason || 'Customer requested reschedule',
      requestedById: customer.id,
      requestedAt: new Date().toISOString(),
    };
    const from = visit.status;
    await sequelize.transaction(async (transaction) => {
      await SiteVisitRescheduleHistory.create({
        siteVisitId: visit.id,
        oldVisitDate: visit.visitDate,
        oldVisitTime: visit.visitTime,
        oldScheduledAt: visit.scheduledAt,
        newVisitDate,
        newVisitTime,
        newScheduledAt,
        reason: request.reason,
        status: 'REQUESTED',
        requestedById: customer.id,
        metadata: {},
      }, { transaction });
      await visit.update({
        status: 'RESCHEDULE_REQUESTED',
        rescheduleRequest: request,
        rescheduleReason: request.reason,
        modifiedBy: customer.id,
      }, { transaction });
      await this.addHistory(visit.id, from, 'RESCHEDULE_REQUESTED', request.reason, customer.id, transaction, {
        action: 'RESCHEDULE_REQUESTED',
        actorRole: customer.role,
        metadata: { requestedSchedule: request },
      });
      await this.logActivity('SiteVisit', visit.id, 'RESCHEDULE_REQUESTED', request.reason, customer.id, transaction);
    });
    const formatted = await this.getById(visit.id);
    await notificationService.notifyAdmins({
      titleEn: 'Site Visit Reschedule Requested',
      messageEn: `Customer requested ${newVisitDate} at ${newVisitTime} for visit #${visit.id}.`,
      notificationType: 'site_visit_reschedule_requested',
      referenceType: 'site_visit',
      referenceId: visit.id,
      linkPath: siteVisitLink(ROLES.ADMIN, visit.id),
      createdBy: customer.id,
    });
    await this.notifyVisitAgent(visit, {
      titleEn: 'Site Visit Reschedule Requested',
      messageEn: `The customer requested ${newVisitDate} at ${newVisitTime} for site visit #${visit.id}.`,
      notificationType: 'site_visit_reschedule_requested_agent',
      createdBy: customer.id,
    });
    this.publish(visit, formatted, 'reschedule-requested');
    return formatted;
  }

  async addRemarks(id, actor, body = {}) {
    const visit = await SiteVisit.findByPk(Number(id));
    if (!visit) {
      const err = new Error('Site visit not found.');
      err.status = 404;
      throw err;
    }
    this.assertParticipantAccess(visit, actor, { customer: true });
    const remarks = String(body.remarks || body.remark || body.note || '').trim();
    if (!remarks) {
      const err = new Error('Remarks are required.');
      err.status = 400;
      throw err;
    }
    const updates = { modifiedBy: actor.id };
    if (actor.role === ROLES.AGENT) updates.agentRemarks = remarks;
    else if ([ROLES.ADMIN, ROLES.SALES_MEMBER, ROLES.EMPLOYEE].includes(actor.role)) updates.internalRemarks = remarks;
    else updates.remarks = remarks;
    await sequelize.transaction(async (transaction) => {
      await visit.update(updates, { transaction });
      await this.addHistory(visit.id, visit.status, visit.status, remarks, actor.id, transaction, {
        action: 'REMARK_ADDED', actorRole: actor.role, remarks,
      });
      await this.logActivity('SiteVisit', visit.id, 'REMARK_ADDED', remarks, actor.id, transaction);
    });
    const formatted = await this.getById(visit.id, { actor });
    await notificationService.notifyAdmins({
      titleEn: 'Site Visit Remarks Updated',
      messageEn: `${actor.name || actor.role} added remarks to site visit #${visit.id}.`,
      notificationType: 'site_visit_remarks_updated',
      referenceType: 'site_visit',
      referenceId: visit.id,
      linkPath: siteVisitLink(ROLES.ADMIN, visit.id),
      createdBy: actor.id,
    });
    this.publish(visit, formatted, 'remarks-updated');
    return formatted;
  }

  async reschedule(id, actor, body = {}) {
    const visit = await SiteVisit.findByPk(Number(id));
    if (!visit) {
      const err = new Error('Site visit not found.');
      err.status = 404;
      throw err;
    }
    if (![ROLES.ADMIN, ROLES.SALES_MEMBER].includes(actor.role)) {
      const err = new Error('Only admin or sales staff can apply a new visit schedule.');
      err.status = 403;
      throw err;
    }
    if (TERMINAL_STATUSES.includes(visit.status) || ['COMPLETED', 'PURCHASE_INTEREST'].includes(visit.status)) {
      const err = new Error('This site visit cannot be rescheduled in its current status.');
      err.status = 400;
      err.code = 'INVALID_SITE_VISIT_TRANSITION';
      throw err;
    }

    const visitDate = this.parseVisitDate(body.visitDate || body.preferredDate);
    const visitTime = this.parseVisitTime(body.visitTime || body.preferredTime);
    const requestedReason = visit.rescheduleRequest?.reason;
    const requestedById = visit.rescheduleRequest?.requestedById || null;
    const reason = String(
      body.reason || body.rescheduleReason || body.remarks || requestedReason || 'Rescheduled by admin'
    ).trim();
    if (!visitDate || !visitTime || !reason) {
      const err = new Error('New visit date, visit time, and reschedule reason are required.');
      err.status = 400;
      throw err;
    }
    const scheduledAt = this.scheduledDateTime(visitDate, visitTime);
    if (!scheduledAt || scheduledAt.getTime() <= Date.now()) {
      const err = new Error('The new site visit schedule must be in the future.');
      err.status = 400;
      throw err;
    }

    const from = visit.status;
    const nextStatus = visit.assignedAgentId ? 'ASSIGNED' : 'APPROVED';
    const previousSchedule = Array.isArray(visit.previousSchedule) ? [...visit.previousSchedule] : [];
    previousSchedule.push({
      visitDate: visit.visitDate,
      visitTime: visit.visitTime,
      scheduledAt: visit.scheduledAt,
      reason,
      changedBy: actor.id,
      changedAt: new Date().toISOString(),
    });

    await sequelize.transaction(async (transaction) => {
      await visit.update({
        visitDate,
        visitTime,
        scheduledAt,
        status: nextStatus,
        rescheduleReason: reason,
        previousSchedule,
        rescheduledAt: new Date(),
        rescheduleRequest: null,
        reminderFlags: {},
        modifiedBy: actor.id,
      }, { transaction });
      await this.addHistory(
        visit.id,
        from,
        nextStatus,
        `Rescheduled to ${visitDate} ${visitTime}. ${reason}`,
        actor.id,
        transaction,
        {
          action: 'RESCHEDULED',
          actorRole: actor.role,
          metadata: {
            oldSchedule: previousSchedule[previousSchedule.length - 1],
            newSchedule: { visitDate, visitTime, scheduledAt: scheduledAt.toISOString() },
          },
        }
      );
      await SiteVisitRescheduleHistory.create({
        siteVisitId: visit.id,
        oldVisitDate: previousSchedule[previousSchedule.length - 1].visitDate,
        oldVisitTime: previousSchedule[previousSchedule.length - 1].visitTime,
        oldScheduledAt: previousSchedule[previousSchedule.length - 1].scheduledAt,
        newVisitDate: visitDate,
        newVisitTime: visitTime,
        newScheduledAt: scheduledAt,
        reason,
        status: 'APPLIED',
        requestedById,
        appliedById: actor.id,
        metadata: {},
      }, { transaction });
      await this.logActivity('SiteVisit', visit.id, 'RESCHEDULED', reason, actor.id, transaction);
    });

    const formatted = await this.getById(visit.id);
    const title = formatted.propertyName || `Property #${visit.propertyId}`;
    await notificationService.notifyAdmins({
      titleEn: 'Site Visit Rescheduled',
      messageEn: `Site visit #${visit.id} for "${title}" is scheduled for ${visitDate} at ${visitTime}. Reason: ${reason}`,
      notificationType: 'site_visit_rescheduled',
      referenceType: 'site_visit',
      referenceId: visit.id,
      linkPath: siteVisitLink(ROLES.ADMIN, visit.id),
      createdBy: actor.id,
    });
    if (actor.id !== visit.customerId) {
      await notificationService.create({
        userId: visit.customerId,
        userRole: ROLES.CUSTOMER,
        titleEn: 'Site Visit Rescheduled',
        messageEn: `Your site visit for "${title}" is now scheduled for ${visitDate} at ${visitTime}.`,
        notificationType: 'site_visit_rescheduled',
        referenceType: 'site_visit',
        referenceId: visit.id,
        linkPath: siteVisitLink(ROLES.CUSTOMER, visit.id),
        createdBy: actor.id,
      });
    }
    await this.notifyVisitAgent(visit, {
      titleEn: 'Site Visit Rescheduled',
      messageEn: `Site visit #${visit.id} is now scheduled for ${visitDate} at ${visitTime}.`,
      notificationType: 'site_visit_rescheduled_agent',
      createdBy: actor.id,
    });
    this.publish(visit, formatted, 'rescheduled');
    return formatted;
  }

  async cancel(id, actor, body = {}) {
    const visit = await SiteVisit.findByPk(Number(id));
    if (!visit) {
      const err = new Error('Site visit not found.');
      err.status = 404;
      throw err;
    }
    this.assertParticipantAccess(visit, actor, { customer: true });
    if (TERMINAL_STATUSES.includes(visit.status) || ['COMPLETED', 'PURCHASE_INTEREST'].includes(visit.status)) {
      const err = new Error('This site visit cannot be cancelled in its current status.');
      err.status = 400;
      err.code = 'INVALID_SITE_VISIT_TRANSITION';
      throw err;
    }
    const reason = String(body.reason || body.cancellationReason || body.remarks || '').trim();
    if (!reason) {
      const err = new Error('Cancellation reason is required.');
      err.status = 400;
      throw err;
    }
    const from = visit.status;
    await sequelize.transaction(async (transaction) => {
      await visit.update({
        status: 'CANCELLED',
        cancellationReason: reason,
        cancelledAt: new Date(),
        cancelledById: actor.id,
        vehicleStatus: visit.vehicleRequired ? 'CANCELLED' : visit.vehicleStatus,
        modifiedBy: actor.id,
      }, { transaction });
      await this.addHistory(visit.id, from, 'CANCELLED', reason, actor.id, transaction);
      await this.logActivity('SiteVisit', visit.id, 'CANCELLED', reason, actor.id, transaction);
    });
    const formatted = await this.getById(visit.id);
    await notificationService.notifyAdmins({
      titleEn: 'Site Visit Cancelled',
      messageEn: `Site visit #${visit.id} was cancelled. Reason: ${reason}`,
      notificationType: 'site_visit_cancelled',
      referenceType: 'site_visit',
      referenceId: visit.id,
      linkPath: siteVisitLink(ROLES.ADMIN, visit.id),
      createdBy: actor.id,
    });
    if (actor.id !== visit.customerId) {
      await notificationService.create({
        userId: visit.customerId,
        userRole: ROLES.CUSTOMER,
        titleEn: 'Site Visit Cancelled',
        messageEn: `Your site visit was cancelled. Reason: ${reason}`,
        notificationType: 'site_visit_cancelled',
        referenceType: 'site_visit',
        referenceId: visit.id,
        linkPath: siteVisitLink(ROLES.CUSTOMER, visit.id),
        createdBy: actor.id,
      });
    }
    await this.notifyVisitAgent(visit, {
      titleEn: 'Site Visit Cancelled',
      messageEn: `Site visit #${visit.id} was cancelled. Reason: ${reason}`,
      notificationType: 'site_visit_cancelled_agent',
      createdBy: actor.id,
    });
    this.publish(visit, formatted, 'cancelled');
    return formatted;
  }

  async markNoShow(id, actor, body = {}) {
    const visit = await SiteVisit.findByPk(Number(id));
    if (!visit) {
      const err = new Error('Site visit not found.');
      err.status = 404;
      throw err;
    }
    this.assertParticipantAccess(visit, actor);
    if (!ACTIVE_VISIT_STATUSES.includes(visit.status)) {
      const err = new Error('Only an active site visit can be marked no-show.');
      err.status = 400;
      throw err;
    }
    if (
      !['IN_PROGRESS', 'STARTED'].includes(visit.status)
      && !this.visitDateTimePassed(visit.visitDate, visit.visitTime)
    ) {
      const err = new Error('A site visit can only be marked no-show after its scheduled time.');
      err.status = 400;
      throw err;
    }
    const note = String(body.reason || body.remarks || 'Customer did not attend the scheduled visit').trim();
    const from = visit.status;
    await sequelize.transaction(async (transaction) => {
      await visit.update({
        status: 'NO_SHOW',
        noShowAt: new Date(),
        noShowById: actor.id,
        employeeOutcome: 'NO_SHOW',
        modifiedBy: actor.id,
      }, { transaction });
      await this.addHistory(visit.id, from, 'NO_SHOW', note, actor.id, transaction);
      await this.logActivity('SiteVisit', visit.id, 'NO_SHOW', note, actor.id, transaction);
    });
    const formatted = await this.getById(visit.id);
    await notificationService.create({
      userId: visit.customerId,
      userRole: ROLES.CUSTOMER,
      titleEn: 'Site Visit Marked No-show',
      messageEn: `Your scheduled site visit was marked as no-show. Contact us if you want to reschedule.`,
      notificationType: 'site_visit_no_show',
      referenceType: 'site_visit',
      referenceId: visit.id,
      linkPath: siteVisitLink(ROLES.CUSTOMER, visit.id),
      createdBy: actor.id,
    });
    await notificationService.notifyAdmins({
      titleEn: 'Site Visit Marked No-show',
      messageEn: `Site visit #${visit.id} was marked no-show. ${note}`,
      notificationType: 'site_visit_no_show_admin',
      referenceType: 'site_visit',
      referenceId: visit.id,
      linkPath: siteVisitLink(ROLES.ADMIN, visit.id),
      createdBy: actor.id,
    });
    await this.notifyVisitAgent(visit, {
      titleEn: 'Site Visit Marked No-show',
      messageEn: `Site visit #${visit.id} was marked no-show. ${note}`,
      notificationType: 'site_visit_no_show_agent',
      createdBy: actor.id,
    });
    this.publish(visit, formatted, 'no-show');
    return formatted;
  }

  async start(id, actor, body = {}) {
    const visit = await SiteVisit.findByPk(Number(id));
    if (!visit) {
      const err = new Error('Site visit not found.');
      err.status = 404;
      throw err;
    }
    this.assertParticipantAccess(visit, actor);
    if (['STARTED', 'IN_PROGRESS'].includes(visit.status)) return this.getById(visit.id);
    if (visit.status !== 'CONFIRMED') {
      const err = new Error('Only a confirmed site visit can be started.');
      err.status = 400;
      err.code = 'INVALID_SITE_VISIT_TRANSITION';
      throw err;
    }
    const scheduledAt = visit.scheduledAt || this.scheduledDateTime(visit.visitDate, visit.visitTime);
    const overrideEarlyStart = actor.role === ROLES.ADMIN && body.overrideEarlyStart === true;
    if (scheduledAt && scheduledAt.getTime() > Date.now() && !overrideEarlyStart) {
      const err = new Error('The site visit cannot be started before its scheduled time.');
      err.status = 409;
      err.code = 'EARLY_START_NOT_ALLOWED';
      throw err;
    }
    const note = String(body.note || body.remarks || 'Site visit started').trim();
    const from = visit.status;
    await sequelize.transaction(async (transaction) => {
      await visit.update({
        status: 'STARTED',
        startedAt: new Date(),
        startedById: actor.id,
        employeeVisitStatus: 'in_progress',
        modifiedBy: actor.id,
      }, { transaction });
      await this.addHistory(visit.id, from, 'STARTED', note, actor.id, transaction, {
        action: 'STARTED',
        actorRole: actor.role,
        metadata: { overrideEarlyStart },
      });
      await this.logActivity('SiteVisit', visit.id, 'STARTED', note, actor.id, transaction);
    });
    const formatted = await this.getById(visit.id);
    await notificationService.create({
      userId: visit.customerId,
      userRole: ROLES.CUSTOMER,
      titleEn: 'Site Visit Started',
      messageEn: `Your site visit for "${formatted.propertyName}" has started.`,
      notificationType: 'site_visit_started',
      referenceType: 'site_visit',
      referenceId: visit.id,
      linkPath: siteVisitLink(ROLES.CUSTOMER, visit.id),
      createdBy: actor.id,
    });
    await notificationService.notifyAdmins({
      titleEn: 'Site Visit Started',
      messageEn: `Site visit #${visit.id} for "${formatted.propertyName}" has started.`,
      notificationType: 'site_visit_started_admin',
      referenceType: 'site_visit',
      referenceId: visit.id,
      linkPath: siteVisitLink(ROLES.ADMIN, visit.id),
      createdBy: actor.id,
    });
    await this.notifyVisitAgent(visit, {
      titleEn: 'Site Visit Started',
      messageEn: `Site visit #${visit.id} for "${formatted.propertyName}" has started.`,
      notificationType: 'site_visit_started_agent',
      createdBy: actor.id,
    });
    this.publish(visit, formatted, 'started');
    return formatted;
  }

  async updateVehicle(id, actor, body = {}, { assign = false } = {}) {
    const visit = await SiteVisit.findByPk(Number(id));
    if (!visit) {
      const err = new Error('Site visit not found.');
      err.status = 404;
      throw err;
    }
    if (assign && ![ROLES.ADMIN, ROLES.SALES_MEMBER].includes(actor.role)) {
      const err = new Error('Only admin or sales staff can assign a vehicle.');
      err.status = 403;
      throw err;
    }
    this.assertParticipantAccess(visit, actor, { customer: true });
    if (TERMINAL_STATUSES.includes(visit.status)) {
      const err = new Error('Vehicle details cannot be changed for a closed site visit.');
      err.status = 400;
      throw err;
    }

    const updates = { modifiedBy: actor.id };
    let nextVehicleStatus = String(body.vehicleStatus || body.status || '').trim().toUpperCase();
    if (assign) nextVehicleStatus = nextVehicleStatus || 'ASSIGNED';
    if (!nextVehicleStatus && (body.vehicleRequired === true || body.pickupAddress)) {
      nextVehicleStatus = 'REQUESTED';
    }
    if (nextVehicleStatus && !VEHICLE_STATUSES.includes(nextVehicleStatus)) {
      const err = new Error(`Invalid vehicle status. Allowed: ${VEHICLE_STATUSES.join(', ')}.`);
      err.status = 400;
      throw err;
    }
    if (
      actor.role === ROLES.CUSTOMER
      && nextVehicleStatus
      && !['REQUESTED', 'NOT_REQUIRED', 'CANCELLED'].includes(nextVehicleStatus)
    ) {
      const err = new Error('Customers may only request or cancel vehicle assistance.');
      err.status = 403;
      throw err;
    }
    if (
      actor.role === ROLES.CUSTOMER
      && ['vehicleType', 'vehicleNumber', 'driverName', 'driverMobile'].some(
        (field) => body[field] !== undefined
      )
    ) {
      const err = new Error('Vehicle and driver assignment fields are staff-managed.');
      err.status = 403;
      throw err;
    }
    if (nextVehicleStatus) updates.vehicleStatus = nextVehicleStatus;
    if (body.vehicleRequired !== undefined) {
      updates.vehicleRequired = body.vehicleRequired === true || body.vehicleRequired === 1
        || ['true', '1', 'yes'].includes(String(body.vehicleRequired).toLowerCase());
    }
    if (nextVehicleStatus && nextVehicleStatus !== 'NOT_REQUIRED') updates.vehicleRequired = true;
    for (const field of ['vehicleType', 'vehicleNumber', 'driverName', 'driverMobile', 'pickupAddress']) {
      if (body[field] !== undefined) updates[field] = String(body[field] || '').trim() || null;
    }
    if (body.pickupAt !== undefined) {
      const pickupAt = body.pickupAt ? new Date(body.pickupAt) : null;
      if (pickupAt && Number.isNaN(pickupAt.getTime())) {
        const err = new Error('Invalid pickupAt.');
        err.status = 400;
        throw err;
      }
      updates.pickupAt = pickupAt;
    }
    if (assign || nextVehicleStatus === 'ASSIGNED') {
      if (!updates.vehicleNumber && !visit.vehicleNumber && !updates.driverName && !visit.driverName) {
        const err = new Error('Vehicle number or driver name is required for assignment.');
        err.status = 400;
        throw err;
      }
      updates.vehicleAssignedAt = new Date();
      updates.vehicleAssignedById = actor.id;
    }

    await visit.update(updates);
    if (['vehicleNumber', 'driverName', 'driverMobile', 'driverPhone'].some((field) => body[field] !== undefined)) {
      const snapshot = this.vehicleAssignmentPayload(visit, body, actor.id);
      snapshot.vehicleStatus = updates.vehicleStatus || visit.vehicleStatus;
      await SiteVisitVehicleAssignment.create(snapshot);
    }
    const note = `Vehicle workflow: ${updates.vehicleStatus || visit.vehicleStatus}`;
    await this.addHistory(visit.id, visit.status, visit.status, note, actor.id);
    await this.logActivity('SiteVisit', visit.id, 'VEHICLE_UPDATED', note, actor.id);
    const formatted = await this.getById(visit.id);
    if (actor.id !== visit.customerId) {
      await notificationService.create({
        userId: visit.customerId,
        userRole: ROLES.CUSTOMER,
        titleEn: 'Site Visit Vehicle Updated',
        messageEn: updates.vehicleStatus === 'ASSIGNED'
          ? `Vehicle details are assigned for your site visit${formatted.vehicleNumber ? ` (${formatted.vehicleNumber})` : ''}.`
          : `Vehicle status for your site visit is now ${formatted.vehicleStatus}.`,
        notificationType: 'site_visit_vehicle_updated',
        referenceType: 'site_visit',
        referenceId: visit.id,
        linkPath: siteVisitLink(ROLES.CUSTOMER, visit.id),
        createdBy: actor.id,
      });
    }
    if (updates.vehicleStatus === 'REQUESTED') {
      await notificationService.notifyAdmins({
        titleEn: 'Site Visit Vehicle Requested',
        messageEn: `Transport was requested for site visit #${visit.id}.`,
        notificationType: 'site_visit_vehicle_requested',
        referenceType: 'site_visit',
        referenceId: visit.id,
        linkPath: siteVisitLink(ROLES.ADMIN, visit.id),
        createdBy: actor.id,
      });
    }
    this.publish(visit, formatted, 'vehicle-updated');
    return formatted;
  }

  async addFollowUp(id, actor, body = {}) {
    const visit = await SiteVisit.findByPk(Number(id));
    if (!visit) {
      const err = new Error('Site visit not found.');
      err.status = 404;
      throw err;
    }
    this.assertParticipantAccess(visit, actor);
    const remarks = String(body.remarks || body.remark || body.note || '').trim();
    if (!remarks) {
      const err = new Error('Follow-up remarks are required.');
      err.status = 400;
      throw err;
    }
    const status = String(body.status || body.followUpStatus || 'PENDING').trim().toUpperCase();
    const nextFollowUpAt = body.nextFollowUpAt ? new Date(body.nextFollowUpAt) : null;
    if (nextFollowUpAt && Number.isNaN(nextFollowUpAt.getTime())) {
      const err = new Error('Invalid nextFollowUpAt.');
      err.status = 400;
      throw err;
    }
    await sequelize.transaction(async (transaction) => {
      await SiteVisitFollowUp.create({
        siteVisitId: visit.id,
        status,
        remarks,
        nextFollowUpAt,
        createdBy: actor.id,
        modifiedBy: actor.id,
      }, { transaction });
      await visit.update({ nextFollowUpAt, modifiedBy: actor.id }, { transaction });
      await this.addHistory(
        visit.id,
        visit.status,
        visit.status,
        `Follow-up (${status}): ${remarks}`,
        actor.id,
        transaction
      );
      await this.logActivity('SiteVisit', visit.id, 'FOLLOW_UP', remarks, actor.id, transaction);
    });
    const formatted = await this.getById(visit.id);
    this.publish(visit, formatted, 'follow-up');
    return formatted;
  }

  async submitPostVisitPurchase(id, customer, body = {}) {
    const visit = await SiteVisit.findByPk(Number(id));
    if (!visit) {
      const err = new Error('Site visit not found.');
      err.status = 404;
      throw err;
    }
    if (visit.customerId !== customer.id) {
      const err = new Error('You can only purchase from your own site visit.');
      err.status = 403;
      throw err;
    }
    const eligible = visit.expressInterestId
      ? ['COMPLETED', 'PURCHASE_INTEREST'].includes(visit.status)
      : (
          visit.status === 'COMPLETED'
          || (['APPROVED', 'ASSIGNED', 'SCHEDULED', 'CONFIRMED', 'STARTED', 'IN_PROGRESS'].includes(visit.status)
            && this.visitDateTimePassed(visit.visitDate, visit.visitTime))
        );
    if (!eligible && visit.status !== 'PURCHASE_INTEREST') {
      const err = new Error('Complete the site visit before submitting a purchase request.');
      err.status = 400;
      throw err;
    }
    if (visit.purchaseRequestId) {
      return {
        siteVisit: await this.getById(visit.id),
        purchase: await interestDecisionService.getPurchaseById(visit.purchaseRequestId, { actor: customer }),
      };
    }

    let interest = visit.expressInterestId
      ? await ExpressInterest.findByPk(visit.expressInterestId)
      : null;
    if (!interest) {
      interest = await ExpressInterest.findOne({
        where: {
          customerId: customer.id,
          propertyId: visit.propertyId,
          status: { [Op.in]: ['APPROVED', 'ASSIGNED', 'PENDING_APPROVAL'] },
        },
        order: [['createdAt', 'DESC']],
      });
    }

    if (interest?.status === 'PENDING_APPROVAL') {
      await sequelize.transaction(async (transaction) => {
        await interest.update({
          status: 'APPROVED',
          assignedAgentId: interest.assignedAgentId || visit.assignedAgentId || visit.referralAgentId,
          assignedEmployeeId: interest.assignedEmployeeId || visit.assignedEmployeeId,
          approvedById: visit.approvedById,
          approvedAt: new Date(),
          modifiedBy: customer.id,
        }, { transaction });
        await ExpressInterestHistory.create({
          interestId: interest.id,
          fromStatus: 'PENDING_APPROVAL',
          toStatus: 'APPROVED',
          note: `Approved from completed Site Visit #${visit.id} for post-visit purchase`,
          createdBy: customer.id,
        }, { transaction });
        await this.logActivity(
          'ExpressInterest',
          interest.id,
          'APPROVED_FROM_SITE_VISIT',
          `Site Visit #${visit.id}`,
          customer.id,
          transaction
        );
      });
    }

    if (!interest) {
      await sequelize.transaction(async (transaction) => {
        interest = await ExpressInterest.create({
          customerId: customer.id,
          propertyId: visit.propertyId,
          referralAgentId: visit.referralAgentId,
          assignedAgentId: visit.assignedAgentId,
          assignedEmployeeId: visit.assignedEmployeeId,
          status: 'APPROVED',
          remarks: `Created from completed Site Visit #${visit.id}`,
          followUpStatus: 'COMPLETED',
          approvedById: visit.approvedById,
          approvedAt: new Date(),
          createdBy: customer.id,
          modifiedBy: customer.id,
        }, { transaction });
        await ExpressInterestHistory.create({
          interestId: interest.id,
          fromStatus: null,
          toStatus: 'APPROVED',
          note: `Auto-created from completed Site Visit #${visit.id}`,
          createdBy: customer.id,
        }, { transaction });
        await this.logActivity(
          'ExpressInterest',
          interest.id,
          'CREATED_FROM_SITE_VISIT',
          `Site Visit #${visit.id}`,
          customer.id,
          transaction
        );
      });
    }

    const existingPurchase = await PurchaseRequest.findOne({
      where: { expressInterestId: interest.id },
    });
    if (existingPurchase) {
      await visit.update({
        expressInterestId: interest.id,
        purchaseRequestId: existingPurchase.id,
        status: 'PURCHASE_INTEREST',
        customerDecision: 'INTERESTED',
        customerDecisionAt: visit.customerDecisionAt || new Date(),
        modifiedBy: customer.id,
      });
      return {
        siteVisit: await this.getById(visit.id),
        purchase: await interestDecisionService.getPurchaseById(existingPurchase.id, { actor: customer }),
      };
    }

    if (!['APPROVED', 'ASSIGNED'].includes(interest.status) || interest.customerDecision) {
      const err = new Error('The linked express interest is not eligible for purchase.');
      err.status = 409;
      throw err;
    }

    let purchase;
    try {
      purchase = await interestDecisionService.submitPurchase(interest.id, customer, {
        ...body,
        remarks: String(body.remarks || `Purchase requested after Site Visit #${visit.id}`).trim(),
      });
    } catch (error) {
      if (error.name !== 'SequelizeUniqueConstraintError') throw error;
      const racedPurchase = await PurchaseRequest.findOne({
        where: { expressInterestId: interest.id },
      });
      if (!racedPurchase) throw error;
      purchase = await interestDecisionService.getPurchaseById(racedPurchase.id, { actor: customer });
    }
    const from = visit.status;
    await sequelize.transaction(async (transaction) => {
      await visit.update({
        expressInterestId: interest.id,
        purchaseRequestId: purchase.id,
        status: 'PURCHASE_INTEREST',
        customerDecision: 'INTERESTED',
        customerDecisionAt: new Date(),
        completedAt: visit.completedAt || new Date(),
        completedById: visit.completedById || customer.id,
        modifiedBy: customer.id,
      }, { transaction });
      await this.addHistory(
        visit.id,
        from,
        'PURCHASE_INTEREST',
        `Purchase Request #${purchase.id} created after site visit`,
        customer.id,
        transaction
      );
      await this.logActivity(
        'SiteVisit',
        visit.id,
        'PURCHASE_REQUEST_CREATED',
        `Purchase Request #${purchase.id}; Express Interest #${interest.id}`,
        customer.id,
        transaction
      );
    });
    const formatted = await this.getById(visit.id);
    await notificationService.create({
      userId: customer.id,
      userRole: ROLES.CUSTOMER,
      titleEn: 'Post-visit Purchase Submitted',
      messageEn: `Your purchase request #${purchase.id} was submitted after site visit #${visit.id}.`,
      notificationType: 'site_visit_purchase_acknowledgement',
      referenceType: 'purchase_request',
      referenceId: purchase.id,
      linkPath: siteVisitLink(ROLES.CUSTOMER, visit.id),
      createdBy: customer.id,
      allowSelfNotification: true,
    });
    this.publish(visit, formatted, 'purchase-requested');
    return { siteVisit: formatted, purchase };
  }

  async processReminders() {
    const visits = await SiteVisit.findAll({
      where: { status: { [Op.in]: ACTIVE_VISIT_STATUSES } },
      include: [{ model: Property, as: 'property', attributes: ['id', 'titleEn'] }],
    });
    const now = Date.now();
    let visitReminders = 0;
    for (const visit of visits) {
      const when = visit.scheduledAt || this.scheduledDateTime(visit.visitDate, visit.visitTime);
      if (!when) continue;
      const remaining = when.getTime() - now;
      const flags = { ...(visit.reminderFlags || {}) };
      let key = null;
      let label = null;
      if (remaining <= 0 && remaining >= -2 * 60 * 60 * 1000 && !flags.atTime) {
        key = 'atTime';
        label = 'now';
      } else if (remaining <= 0) {
        continue;
      } else if (remaining <= 2 * 60 * 60 * 1000 && !flags.h2) {
        key = 'h2';
        label = '2 hours';
      } else if (remaining <= 24 * 60 * 60 * 1000 && !flags.h24) {
        key = 'h24';
        label = '24 hours';
      }
      if (!key) continue;
      const title = visit.property?.titleEn || `Property #${visit.propertyId}`;
      await notificationService.create({
        userId: visit.customerId,
        userRole: ROLES.CUSTOMER,
        titleEn: 'Site Visit Reminder',
        messageEn: `Your site visit for "${title}" starts ${label === 'now' ? 'now' : `in ${label}`}.`,
        notificationType: `site_visit_reminder_${key}`,
        referenceType: 'site_visit',
        referenceId: visit.id,
        linkPath: siteVisitLink(ROLES.CUSTOMER, visit.id),
      });
      const agentId = visit.assignedAgentId || visit.referralAgentId;
      if (agentId) {
        await notificationService.create({
          userId: agentId,
          userRole: ROLES.AGENT,
          titleEn: 'Site Visit Reminder',
          messageEn: `Site visit #${visit.id} for "${title}" starts ${label === 'now' ? 'now' : `in ${label}`}.`,
          notificationType: `site_visit_reminder_agent_${key}`,
          referenceType: 'site_visit',
          referenceId: visit.id,
          linkPath: siteVisitLink(ROLES.AGENT, visit.id),
        });
      }
      if (visit.assignedEmployeeId) {
        await notificationService.create({
          userId: visit.assignedEmployeeId,
          userRole: ROLES.EMPLOYEE,
          titleEn: 'Site Visit Reminder',
          messageEn: `Assigned site visit #${visit.id} starts in ${label}.`,
          notificationType: `site_visit_reminder_employee_${key}`,
          referenceType: 'site_visit',
          referenceId: visit.id,
          linkPath: siteVisitLink(ROLES.EMPLOYEE, visit.id),
        });
      }
      if (key === 'atTime') {
        await notificationService.notifyAdmins({
          titleEn: 'Site Visit Scheduled Time',
          messageEn: `Site visit #${visit.id} for "${title}" is scheduled to start now.`,
          notificationType: 'site_visit_reminder_admin_at_time',
          referenceType: 'site_visit',
          referenceId: visit.id,
          linkPath: siteVisitLink(ROLES.ADMIN, visit.id),
        });
      }
      flags[key] = true;
      await visit.update({ reminderFlags: flags });
      visitReminders += 1;
    }

    const dueFollowUps = await SiteVisitFollowUp.findAll({
      where: {
        nextFollowUpAt: { [Op.lte]: new Date() },
        status: { [Op.notIn]: ['COMPLETED', 'CANCELLED', 'REMINDED'] },
      },
      include: [{ model: SiteVisit, as: 'siteVisit' }],
    });
    let followUpReminders = 0;
    for (const followUp of dueFollowUps) {
      const visit = followUp.siteVisit;
      if (!visit || TERMINAL_STATUSES.includes(visit.status)) continue;
      await notificationService.notifyAdmins({
        titleEn: 'Site Visit Follow-up Due',
        messageEn: `Follow-up is due for site visit #${visit.id}: ${followUp.remarks}`,
        notificationType: 'site_visit_followup_due',
        referenceType: 'site_visit',
        referenceId: visit.id,
        linkPath: siteVisitLink(ROLES.ADMIN, visit.id),
      });
      await followUp.update({ status: 'REMINDED' });
      followUpReminders += 1;
    }
    return { checked: visits.length, visitReminders, followUpReminders };
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
    if (TERMINAL_STATUSES.includes(visit.status)) {
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
    const formatted = await this.getById(visit.id);
    await notificationService.create({
      userId: employee.id,
      userRole: ROLES.EMPLOYEE,
      titleEn: 'Site Visit Assigned',
      messageEn: `You were assigned site visit #${visit.id} for ${formatted.propertyName || `Property #${visit.propertyId}`}.`,
      notificationType: 'site_visit_employee_assigned',
      referenceType: 'site_visit',
      referenceId: visit.id,
      linkPath: siteVisitLink(ROLES.EMPLOYEE, visit.id),
      createdBy: adminUser.id,
    });
    this.publish(visit, formatted, 'employee-assigned');
    return formatted;
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
    const completing = String(body.employeeVisitStatus || body.status || '').trim().toLowerCase() === 'completed';
    if (completing && !['APPROVED', 'ASSIGNED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED'].includes(visit.status)) {
      const err = new Error('The site visit pipeline is not ready to be completed.');
      err.status = 400;
      throw err;
    }

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

    if (completing) {
      return this.markCompleted(visit.id, actor, { note: 'Completed by employee' });
    }

    const formatted = await this.getById(visit.id, { actor });
    this.publish(visit, formatted, 'employee-updated');
    return formatted;
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
    const formatted = await this.getById(visit.id);
    this.publish(visit, formatted, 'closed');
    return formatted;
  }
}

module.exports = new SiteVisitService();
module.exports.DROP_REASONS = DROP_REASONS;
module.exports.OPEN_STATUSES = OPEN_STATUSES;
module.exports.ACTIVE_VISIT_STATUSES = ACTIVE_VISIT_STATUSES;
module.exports.TERMINAL_STATUSES = TERMINAL_STATUSES;
module.exports.VEHICLE_STATUSES = VEHICLE_STATUSES;
