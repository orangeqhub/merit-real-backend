'use strict';

const { Op } = require('sequelize');
const { User, AgentCategory } = require('../models');
const authService = require('./authService');
const { generateMemberId } = require('../utils/memberId');
const {
  ROLES,
  ROLE_LABELS,
  USER_STATUSES,
  AGENT_GRADE_LIST,
  AGENT_GRADE_LABELS,
} = require('../constants/roles');
const { normalizeEmployeePermissions } = require('../constants/employeePermissions');

const STATUS_UI_TO_API = {
  pending: USER_STATUSES.PENDING,
  approved: USER_STATUSES.ACTIVE,
  active: USER_STATUSES.ACTIVE,
  rejected: USER_STATUSES.REJECTED,
  inactive: USER_STATUSES.INACTIVE,
  suspended: USER_STATUSES.SUSPENDED,
};

class AdminUserService {
  userInclude() {
    return [{ model: AgentCategory, as: 'agentCategory' }];
  }

  normalizeStatus(status) {
    if (!status) return null;
    const raw = String(status).trim();
    const upper = raw.toUpperCase();
    if (Object.values(USER_STATUSES).includes(upper)) return upper;
    return STATUS_UI_TO_API[raw.toLowerCase()] || null;
  }

  normalizeGrade(grade) {
    if (grade == null || grade === '') return null;
    const normalized = String(grade).trim().toUpperCase();
    return AGENT_GRADE_LIST.includes(normalized) ? normalized : null;
  }

  async list(role, filters = {}, req = null) {
    const where = { role };

    const status = this.normalizeStatus(filters.status);
    if (status) where.status = status;

    if (filters.search) {
      const q = `%${String(filters.search).trim()}%`;
      where[Op.or] = [
        { name: { [Op.iLike]: q } },
        { email: { [Op.iLike]: q } },
        { mobile: { [Op.iLike]: q } },
        { memberId: { [Op.iLike]: q } },
      ];
    }

    const page = Math.max(1, Number(filters.page) || 1);
    const pageSize = Math.min(200, Math.max(1, Number(filters.pageSize) || 10));
    const offset = (page - 1) * pageSize;

    const sortBy = ['name', 'email', 'mobile', 'createdAt', 'status', 'memberId'].includes(filters.sortBy)
      ? filters.sortBy
      : 'createdAt';
    const sortDir = String(filters.sortDir || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const { rows, count } = await User.findAndCountAll({
      where,
      include: this.userInclude(),
      order: [[sortBy, sortDir]],
      limit: pageSize,
      offset,
    });

    return {
      items: rows.map((row) => authService.formatAuthUser(row, req)),
      total: count,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(count / pageSize)),
    };
  }

  async getById(role, id, req = null) {
    const user = await User.findOne({
      where: { id: Number(id), role },
      include: this.userInclude(),
    });
    if (!user) {
      const err = new Error(`${ROLE_LABELS[role] || role} not found.`);
      err.status = 404;
      err.code = 'USER_NOT_FOUND';
      throw err;
    }
    return authService.formatAuthUser(user, req);
  }

  async create(role, payload, req = null) {
    const name = String(payload.name || '').trim();
    const mobile = String(payload.mobile || '').trim();
    const email = String(payload.email || '').trim().toLowerCase();
    const password = String(payload.password || '');

    if (!name || !mobile || !email || !password) {
      const err = new Error('Name, mobile, email and password are required.');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    if (!/^\d{10}$/.test(mobile)) {
      const err = new Error('Mobile must be a 10-digit number.');
      err.status = 400;
      err.code = 'INVALID_MOBILE';
      throw err;
    }

    if (password.length < 6) {
      const err = new Error('Password must be at least 6 characters.');
      err.status = 400;
      err.code = 'INVALID_PASSWORD';
      throw err;
    }

    const existing = await User.findOne({
      where: {
        [Op.or]: [{ mobile }, { email }],
      },
    });
    if (existing) {
      const err = new Error('An account with this mobile or email already exists.');
      err.status = 409;
      err.code = 'DUPLICATE_USER';
      throw err;
    }

    let status = this.normalizeStatus(payload.status) || USER_STATUSES.ACTIVE;
    if (![USER_STATUSES.PENDING, USER_STATUSES.ACTIVE, USER_STATUSES.INACTIVE].includes(status)) {
      status = USER_STATUSES.ACTIVE;
    }

    let agentGrade = null;
    if (role === ROLES.AGENT) {
      agentGrade = this.normalizeGrade(payload.agentGrade || payload.grade);
      if (status === USER_STATUSES.ACTIVE && !agentGrade) {
        const err = new Error(
          `Active agents require a grade: ${AGENT_GRADE_LIST.map((g) => `${g} (${AGENT_GRADE_LABELS[g]})`).join(', ')}.`
        );
        err.status = 400;
        err.code = 'AGENT_GRADE_REQUIRED';
        throw err;
      }
    }

    if (role === ROLES.CUSTOMER && !String(payload.preferredPropertyType || '').trim()) {
      const err = new Error('Preferred property type is required for customers.');
      err.status = 400;
      err.code = 'PREFERRED_PROPERTY_TYPE_REQUIRED';
      throw err;
    }

    const memberId = status === USER_STATUSES.ACTIVE
      ? await generateMemberId(role, name)
      : null;

    const scoreValue = payload.score != null && payload.score !== ''
      ? Number(payload.score)
      : null;

    const created = await User.create({
      name,
      mobile,
      email,
      password,
      role,
      status,
      memberId,
      district: payload.district || null,
      city: payload.city || null,
      address: payload.address || null,
      occupation: payload.occupation ? String(payload.occupation).trim() : null,
      preferredPropertyType: role === ROLES.CUSTOMER
        ? String(payload.preferredPropertyType).trim()
        : null,
      agentGrade,
      agentCategoryId: payload.agentCategoryId ? Number(payload.agentCategoryId) : null,
      score: Number.isFinite(scoreValue) ? scoreValue : null,
      permissions: role === ROLES.EMPLOYEE
        ? normalizeEmployeePermissions(payload.permissions)
        : [],
      approvedAt: status === USER_STATUSES.ACTIVE ? new Date() : null,
    });

    const user = await User.findByPk(created.id, { include: this.userInclude() });
    return authService.formatAuthUser(user, req);
  }

  async update(role, id, payload, req = null) {
    const user = await User.findOne({
      where: { id: Number(id), role },
      include: this.userInclude(),
    });
    if (!user) {
      const err = new Error(`${ROLE_LABELS[role] || role} not found.`);
      err.status = 404;
      err.code = 'USER_NOT_FOUND';
      throw err;
    }

    const updates = {};

    if (payload.name != null) updates.name = String(payload.name).trim();
    if (payload.district !== undefined) updates.district = payload.district || null;
    if (payload.city !== undefined) updates.city = payload.city || null;
    if (payload.address !== undefined) updates.address = payload.address || null;
    if (payload.occupation !== undefined) {
      updates.occupation = payload.occupation ? String(payload.occupation).trim() : null;
    }

    if (payload.mobile != null) {
      const mobile = String(payload.mobile).trim();
      if (!/^\d{10}$/.test(mobile)) {
        const err = new Error('Mobile must be a 10-digit number.');
        err.status = 400;
        err.code = 'INVALID_MOBILE';
        throw err;
      }
      updates.mobile = mobile;
    }

    if (payload.email != null) {
      updates.email = String(payload.email).trim().toLowerCase();
    }

    if (payload.password) {
      if (String(payload.password).length < 6) {
        const err = new Error('Password must be at least 6 characters.');
        err.status = 400;
        err.code = 'INVALID_PASSWORD';
        throw err;
      }
      updates.password = String(payload.password);
    }

    if (role === ROLES.CUSTOMER && payload.preferredPropertyType !== undefined) {
      updates.preferredPropertyType = payload.preferredPropertyType
        ? String(payload.preferredPropertyType).trim()
        : null;
    }

    if (role === ROLES.AGENT && (payload.agentGrade !== undefined || payload.grade !== undefined)) {
      const grade = this.normalizeGrade(payload.agentGrade || payload.grade);
      if ((payload.agentGrade || payload.grade) && !grade) {
        const err = new Error(`Invalid grade. Use one of: ${AGENT_GRADE_LIST.join(', ')}.`);
        err.status = 400;
        err.code = 'INVALID_AGENT_GRADE';
        throw err;
      }
      updates.agentGrade = grade;
    }

    if (payload.status != null) {
      const status = this.normalizeStatus(payload.status);
      if (!status) {
        const err = new Error('Invalid status.');
        err.status = 400;
        err.code = 'INVALID_STATUS';
        throw err;
      }
      updates.status = status;
      if (status === USER_STATUSES.ACTIVE) {
        if (role === ROLES.AGENT) {
          // Ensure Name+Number agent code (e.g. Karthik26001), replace legacy AGT- ids.
          if (!user.memberId || String(user.memberId).startsWith('AGT-')) {
            updates.memberId = await generateMemberId(role, updates.name || user.name);
          }
        } else if (!user.memberId && !updates.memberId) {
          updates.memberId = await generateMemberId(role, updates.name || user.name);
        }
      }
      if (status === USER_STATUSES.ACTIVE && !user.approvedAt) {
        updates.approvedAt = new Date();
      }
      if (role === ROLES.AGENT && status === USER_STATUSES.ACTIVE) {
        const grade = updates.agentGrade !== undefined ? updates.agentGrade : user.agentGrade;
        if (!grade) {
          const err = new Error('Active agents require an assigned grade.');
          err.status = 400;
          err.code = 'AGENT_GRADE_REQUIRED';
          throw err;
        }
      }
    }

    if (payload.score !== undefined) {
      if (payload.score === null || payload.score === '') {
        updates.score = null;
      } else {
        const scoreValue = Number(payload.score);
        if (!Number.isFinite(scoreValue)) {
          const err = new Error('Score must be a valid number.');
          err.status = 400;
          err.code = 'INVALID_SCORE';
          throw err;
        }
        updates.score = scoreValue;
      }
    }

    if (role === ROLES.EMPLOYEE && payload.permissions !== undefined) {
      updates.permissions = normalizeEmployeePermissions(payload.permissions);
    }

    if (updates.mobile || updates.email) {
      const clash = await User.findOne({
        where: {
          id: { [Op.ne]: user.id },
          [Op.or]: [
            updates.mobile ? { mobile: updates.mobile } : null,
            updates.email ? { email: updates.email } : null,
          ].filter(Boolean),
        },
      });
      if (clash) {
        const err = new Error('An account with this mobile or email already exists.');
        err.status = 409;
        err.code = 'DUPLICATE_USER';
        throw err;
      }
    }

    await user.update(updates);
    await user.reload({ include: this.userInclude() });
    return authService.formatAuthUser(user, req);
  }

  async remove(role, id) {
    const user = await User.findOne({ where: { id: Number(id), role } });
    if (!user) {
      const err = new Error(`${ROLE_LABELS[role] || role} not found.`);
      err.status = 404;
      err.code = 'USER_NOT_FOUND';
      throw err;
    }
    await user.destroy();
    return { id: Number(id), deleted: true };
  }
}

module.exports = new AdminUserService();
