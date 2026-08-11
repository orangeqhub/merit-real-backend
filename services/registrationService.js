'use strict';

const { Op } = require('sequelize');
const { User, AgentCategory } = require('../models');
const authService = require('./authService');
const { generateMemberId } = require('../utils/memberId');
const {
  ROLES,
  PUBLIC_ROLES,
  USER_STATUSES,
  AGENT_GRADE_LIST,
  AGENT_GRADE_LABELS,
} = require('../constants/roles');

class RegistrationService {
  userInclude() {
    return [{ model: AgentCategory, as: 'agentCategory' }];
  }

  normalizeGrade(grade) {
    if (grade == null || grade === '') return null;
    const normalized = String(grade).trim().toUpperCase();
    return AGENT_GRADE_LIST.includes(normalized) ? normalized : null;
  }

  async list(filters = {}, req = null) {
    const where = {
      role: { [Op.in]: PUBLIC_ROLES },
    };

    if (filters.status) {
      where.status = String(filters.status).toUpperCase();
    }

    if (filters.role) {
      where.role = String(filters.role).toUpperCase();
    }

    const rows = await User.findAll({
      where,
      include: this.userInclude(),
      order: [['createdAt', 'DESC']],
    });

    return rows.map((row) => authService.formatAuthUser(row, req));
  }

  async listPending(req = null) {
    return this.list({ status: USER_STATUSES.PENDING }, req);
  }

  async getById(id, req = null) {
    const user = await User.findOne({
      where: {
        id: Number(id),
        role: { [Op.in]: PUBLIC_ROLES },
      },
      include: this.userInclude(),
    });

    if (!user) {
      const err = new Error('Registration not found.');
      err.status = 404;
      err.code = 'REGISTRATION_NOT_FOUND';
      throw err;
    }

    return authService.formatAuthUser(user, req);
  }

  async approve(id, adminUser, options = {}, req = null) {
    const user = await User.findOne({
      where: {
        id: Number(id),
        role: { [Op.in]: PUBLIC_ROLES },
      },
      include: this.userInclude(),
    });

    if (!user) {
      const err = new Error('Registration not found.');
      err.status = 404;
      err.code = 'REGISTRATION_NOT_FOUND';
      throw err;
    }

    if (user.status !== USER_STATUSES.PENDING) {
      const err = new Error('Only pending registrations can be approved.');
      err.status = 400;
      err.code = 'INVALID_STATUS';
      throw err;
    }

    const updates = {
      status: USER_STATUSES.ACTIVE,
      // Agents always get Name+Number code on approval (e.g. Karthik26001).
      memberId: user.role === ROLES.AGENT
        ? await generateMemberId(user.role, user.name)
        : (user.memberId || await generateMemberId(user.role, user.name)),
      rejectionReason: null,
      approvedById: adminUser?.id || null,
      approvedAt: new Date(),
    };

    if (user.role === ROLES.AGENT) {
      const grade = this.normalizeGrade(options.grade || options.agentGrade);
      if (!grade) {
        const err = new Error(
          `Agent approval requires a grade: ${AGENT_GRADE_LIST.map((g) => `${g} (${AGENT_GRADE_LABELS[g]})`).join(', ')}.`
        );
        err.status = 400;
        err.code = 'AGENT_GRADE_REQUIRED';
        throw err;
      }
      updates.agentGrade = grade;
    }

    await user.update(updates);
    await user.reload({ include: this.userInclude() });

    try {
      const notificationService = require('./notificationService');
      await notificationService.create({
        userId: user.id,
        userRole: user.role,
        titleEn: 'Registration Approved',
        messageEn: 'Your registration has been approved. You can now sign in and use your account.',
        notificationType: 'registration_approved',
        referenceType: 'user',
        referenceId: user.id,
        linkPath: user.role === ROLES.AGENT ? '/mediator/dashboard' : '/buyer/dashboard',
        createdBy: adminUser?.id || null,
      });
    } catch {
      // non-blocking
    }

    return authService.formatAuthUser(user, req);
  }

  async reject(id, reason, adminUser, req = null) {
    const trimmedReason = String(reason || '').trim();
    if (!trimmedReason) {
      const err = new Error('Rejection reason is required.');
      err.status = 400;
      err.code = 'REJECTION_REASON_REQUIRED';
      throw err;
    }

    const user = await User.findOne({
      where: {
        id: Number(id),
        role: { [Op.in]: PUBLIC_ROLES },
      },
      include: this.userInclude(),
    });

    if (!user) {
      const err = new Error('Registration not found.');
      err.status = 404;
      err.code = 'REGISTRATION_NOT_FOUND';
      throw err;
    }

    if (user.status !== USER_STATUSES.PENDING) {
      const err = new Error('Only pending registrations can be rejected.');
      err.status = 400;
      err.code = 'INVALID_STATUS';
      throw err;
    }

    await user.update({
      status: USER_STATUSES.REJECTED,
      rejectionReason: trimmedReason,
      approvedById: adminUser?.id || null,
      approvedAt: new Date(),
    });

    await user.reload({ include: this.userInclude() });

    try {
      const notificationService = require('./notificationService');
      await notificationService.create({
        userId: user.id,
        userRole: user.role,
        titleEn: 'Registration Rejected',
        messageEn: `Your registration was rejected. Reason: ${trimmedReason}`,
        notificationType: 'registration_rejected',
        referenceType: 'user',
        referenceId: user.id,
        linkPath: '/application-status',
        createdBy: adminUser?.id || null,
      });
    } catch {
      // non-blocking
    }

    return authService.formatAuthUser(user, req);
  }
}

module.exports = new RegistrationService();
