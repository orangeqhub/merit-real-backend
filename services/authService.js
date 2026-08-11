'use strict';

const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const { User, AgentCategory } = require('../models');
const agentCategoryService = require('./agentCategoryService');
const { resolveMediaUrl } = require('../utils/mediaUrl');
const {
  ROLES,
  ROLE_LABELS,
  PUBLIC_ROLES,
  USER_STATUSES,
  AGENT_GRADE_LABELS,
} = require('../constants/roles');

class AuthService {
  passwordVersion(user) {
    if (!user?.passwordChangedAt) return 0;
    const value = user.passwordChangedAt instanceof Date
      ? user.passwordChangedAt.getTime()
      : new Date(user.passwordChangedAt).getTime();
    return Number.isNaN(value) ? 0 : value;
  }

  formatAuthUser(user, req = null) {
    const category = user.agentCategory || null;
    const referral = user.referralAgent || null;
    return {
      id: user.id,
      memberId: user.memberId,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      role: user.role,
      roleLabel: ROLE_LABELS[user.role] || user.role,
      agentCategoryId: user.agentCategoryId || null,
      agentCategory: category
        ? {
            id: category.id,
            code: category.code,
            name: category.name,
          }
        : null,
      agentGrade: user.agentGrade || null,
      agentGradeLabel: user.agentGrade
        ? (AGENT_GRADE_LABELS[user.agentGrade] || user.agentGrade)
        : null,
      score: user.score != null ? Number(user.score) : null,
      referralAgentId: user.referralAgentId || null,
      referralAgent: referral
        ? {
            id: referral.id,
            name: referral.name,
            memberId: referral.memberId,
            mobile: referral.mobile,
          }
        : null,
      status: user.status,
      district: user.district,
      city: user.city,
      address: user.address,
      preferredPropertyType: user.preferredPropertyType,
      occupation: user.occupation || null,
      profilePhoto: resolveMediaUrl(req, user.profilePhoto),
      identityProof: resolveMediaUrl(req, user.identityProof),
      addressProof: resolveMediaUrl(req, user.addressProof),
      aadhaarNumber: user.aadhaarNumber || null,
      panNumber: user.panNumber || null,
      aadhaarProofPath: resolveMediaUrl(req, user.aadhaarProofPath || user.identityProof),
      panProofPath: resolveMediaUrl(req, user.panProofPath || user.addressProof),
      rejectionReason: user.rejectionReason || null,
      approvedAt: user.approvedAt || null,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      permissions: Array.isArray(user.permissions) ? user.permissions : [],
    };
  }

  signToken(user) {
    return jwt.sign(
      {
        id: user.id,
        role: user.role,
        agentCategoryId: user.agentCategoryId || null,
        passwordVersion: this.passwordVersion(user),
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
  }

  userInclude() {
    return [
      { model: AgentCategory, as: 'agentCategory' },
      {
        model: User,
        as: 'referralAgent',
        attributes: ['id', 'name', 'memberId', 'mobile', 'email', 'status', 'role'],
        required: false,
      },
    ];
  }

  async findUserByIdentifier(identifier) {
    const normalized = String(identifier).trim();
    return User.findOne({
      where: {
        [Op.or]: [
          { mobile: normalized },
          { email: normalized.toLowerCase() },
          { memberId: normalized },
        ],
      },
      include: this.userInclude(),
    });
  }

  async register({
    name,
    mobile,
    email,
    password,
    role,
    agentCategoryId,
    district,
    city,
    address,
    preferredPropertyType,
    occupation,
    profilePhoto,
    identityProof,
    addressProof,
    aadhaarNumber,
    panNumber,
    aadhaarProofPath,
    panProofPath,
    referralAgentCode,
    agentReferralCode,
  }, req = null) {
    const normalizedRole = String(role || '').toUpperCase();
    if (!PUBLIC_ROLES.includes(normalizedRole)) {
      const err = new Error('Invalid registration role. Use customer, agent, or sales_member.');
      err.status = 400;
      err.code = 'INVALID_ROLE';
      throw err;
    }

    if (normalizedRole === ROLES.CUSTOMER) {
      const preferred = String(preferredPropertyType || '').trim();
      if (!preferred) {
        const err = new Error('Preferred property type is required for customer registration.');
        err.status = 400;
        err.code = 'PREFERRED_PROPERTY_TYPE_REQUIRED';
        throw err;
      }
    }

    const aadhaar = String(aadhaarNumber || '').trim();
    if (!/^\d{12}$/.test(aadhaar)) {
      const err = new Error('Aadhaar number must be exactly 12 digits.');
      err.status = 400;
      err.code = 'INVALID_AADHAAR';
      throw err;
    }

    const occupationValue = String(occupation || '').trim();
    if (!occupationValue) {
      const err = new Error('Occupation is required.');
      err.status = 400;
      err.code = 'OCCUPATION_REQUIRED';
      throw err;
    }

    const pan = String(panNumber || '').trim().toUpperCase();
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) {
      const err = new Error('PAN number must follow the format ABCDE1234F.');
      err.status = 400;
      err.code = 'INVALID_PAN';
      throw err;
    }

    const aadhaarProof = aadhaarProofPath || identityProof;
    const panProof = panProofPath || addressProof;

    if (!aadhaarProof) {
      const err = new Error('Aadhaar proof document is required.');
      err.status = 400;
      err.code = 'AADHAAR_PROOF_REQUIRED';
      throw err;
    }

    if (!panProof) {
      const err = new Error('PAN proof document is required.');
      err.status = 400;
      err.code = 'PAN_PROOF_REQUIRED';
      throw err;
    }

    let resolvedCategoryId = null;
    if (normalizedRole === ROLES.AGENT && agentCategoryId) {
      const category = await agentCategoryService.findActiveById(Number(agentCategoryId));
      if (!category) {
        const err = new Error('Selected agent category is invalid or inactive.');
        err.status = 400;
        err.code = 'INVALID_AGENT_CATEGORY';
        throw err;
      }
      resolvedCategoryId = category.id;
    }

    let referralAgentId = null;
    if (normalizedRole === ROLES.CUSTOMER) {
      const code = String(referralAgentCode || agentReferralCode || '').trim();
      if (code) {
        const expressInterestService = require('./expressInterestService');
        const agent = await expressInterestService.findAgentByCode(code);
        if (!agent) {
          const err = new Error('Invalid Agent Referral Code.');
          err.status = 400;
          err.code = 'INVALID_REFERRAL_AGENT';
          throw err;
        }
        referralAgentId = agent.id;
      }
    }

    const existing = await User.findOne({
      where: {
        [Op.or]: [
          { mobile: String(mobile).trim() },
          { email: String(email).trim().toLowerCase() },
        ],
      },
    });

    if (existing) {
      const err = new Error('An account with this mobile or email already exists.');
      err.status = 409;
      err.code = 'DUPLICATE_USER';
      throw err;
    }

    const created = await User.create({
      name: String(name).trim(),
      mobile: String(mobile).trim(),
      email: String(email).trim().toLowerCase(),
      password,
      role: normalizedRole,
      agentCategoryId: resolvedCategoryId,
      status: USER_STATUSES.PENDING,
      district: district || null,
      city: city || null,
      address: address || null,
      occupation: occupationValue,
      preferredPropertyType: normalizedRole === ROLES.CUSTOMER
        ? String(preferredPropertyType).trim()
        : null,
      profilePhoto: profilePhoto || null,
      identityProof: aadhaarProof,
      addressProof: panProof,
      aadhaarNumber: aadhaar,
      panNumber: pan,
      aadhaarProofPath: aadhaarProof,
      panProofPath: panProof,
      referralAgentId,
    });

    const user = await User.findByPk(created.id, { include: this.userInclude() });

    try {
      const notificationService = require('./notificationService');
      const isAgent = normalizedRole === ROLES.AGENT;
      const isSales = normalizedRole === ROLES.SALES_MEMBER;
      await notificationService.notifyAdmins({
        titleEn: isSales
          ? 'New Sales Member Registration'
          : (isAgent ? 'New Agent Registration' : 'New Customer Registration'),
        messageEn: `${user.name} registered as ${normalizedRole} and is pending approval.`,
        notificationType: isSales
          ? 'sales_member_registration'
          : (isAgent ? 'agent_registration' : 'customer_registration'),
        referenceType: 'user',
        referenceId: user.id,
        linkPath: '/admin/registrations',
        createdBy: user.id,
      }, { includeSalesMembers: !isSales });
    } catch {
      // non-blocking
    }

    return {
      user: this.formatAuthUser(user, req),
      message: 'Registration submitted. Your application is pending approval.',
    };
  }

  async login(identifier, password, allowedRoles = PUBLIC_ROLES, req = null) {
    const user = await this.findUserByIdentifier(identifier);

    if (!user) {
      const err = new Error('Invalid credentials.');
      err.status = 401;
      err.code = 'INVALID_CREDENTIALS';
      throw err;
    }

    if (!allowedRoles.includes(user.role)) {
      const err = new Error('Access denied for this portal.');
      err.status = 403;
      err.code = 'ROLE_NOT_ALLOWED';
      throw err;
    }

    if (user.status === USER_STATUSES.PENDING) {
      const err = new Error('Account pending approval.');
      err.status = 403;
      err.code = 'ACCOUNT_PENDING';
      err.errors = [{ mobile: user.mobile || null, email: user.email || null }];
      err.meta = { mobile: user.mobile || null, email: user.email || null };
      throw err;
    }

    if ([USER_STATUSES.INACTIVE, USER_STATUSES.SUSPENDED, USER_STATUSES.REJECTED].includes(user.status)) {
      const err = new Error('Account is not active.');
      err.status = 403;
      err.code = 'ACCOUNT_INACTIVE';
      throw err;
    }

    if (user.accountLockedUntil && new Date(user.accountLockedUntil) > new Date()) {
      const err = new Error('Account is temporarily locked. Try again later.');
      err.status = 403;
      err.code = 'ACCOUNT_LOCKED';
      throw err;
    }

    const isMatch = await user.checkPassword(password);
    if (!isMatch) {
      await user.update({ failedLoginAttempts: (user.failedLoginAttempts || 0) + 1 });
      const err = new Error('Invalid credentials.');
      err.status = 401;
      err.code = 'INVALID_CREDENTIALS';
      throw err;
    }

    await user.update({
      failedLoginAttempts: 0,
      lastLoginAt: new Date(),
      accountLockedUntil: null,
    });

    return {
      token: this.signToken(user),
      user: this.formatAuthUser(user, req),
    };
  }

  async getProfile(userId, req = null) {
    const user = await User.findByPk(userId, { include: this.userInclude() });
    if (!user) {
      const err = new Error('User not found.');
      err.status = 404;
      err.code = 'USER_NOT_FOUND';
      throw err;
    }
    return this.formatAuthUser(user, req);
  }

  async updateProfile(userId, payload = {}, req = null) {
    const user = await User.findByPk(userId, { include: this.userInclude() });
    if (!user) {
      const err = new Error('User not found.');
      err.status = 404;
      err.code = 'USER_NOT_FOUND';
      throw err;
    }

    const updates = {};

    if (payload.name != null) {
      const name = String(payload.name).trim();
      if (!name) {
        const err = new Error('Name is required.');
        err.status = 400;
        err.code = 'VALIDATION_ERROR';
        throw err;
      }
      updates.name = name;
    }

    if (payload.email != null) {
      const email = String(payload.email).trim().toLowerCase();
      if (!email) {
        const err = new Error('Valid email is required.');
        err.status = 400;
        err.code = 'VALIDATION_ERROR';
        throw err;
      }
      const existingEmail = await User.findOne({
        where: {
          email,
          id: { [Op.ne]: user.id },
        },
      });
      if (existingEmail) {
        const err = new Error('An account with this email already exists.');
        err.status = 409;
        err.code = 'DUPLICATE_USER';
        throw err;
      }
      updates.email = email;
    }

    if (payload.address !== undefined) {
      updates.address = payload.address ? String(payload.address).trim() : null;
    }

    if (payload.occupation !== undefined) {
      const occupation = String(payload.occupation || '').trim();
      if (!occupation) {
        const err = new Error('Occupation is required.');
        err.status = 400;
        err.code = 'OCCUPATION_REQUIRED';
        throw err;
      }
      updates.occupation = occupation;
    }

    if (
      user.role === ROLES.CUSTOMER
      && (payload.referralAgentCode !== undefined
        || payload.agentReferralCode !== undefined
        || payload.referralAgentId !== undefined
        || payload.clearReferralAgent)
    ) {
      if (payload.clearReferralAgent || payload.referralAgentId === null) {
        updates.referralAgentId = null;
      } else {
        const code = String(payload.referralAgentCode || payload.agentReferralCode || '').trim();
        if (code) {
          const expressInterestService = require('./expressInterestService');
          const agent = await expressInterestService.findAgentByCode(code);
          if (!agent) {
            const err = new Error('Invalid Agent Referral Code.');
            err.status = 400;
            err.code = 'INVALID_REFERRAL_AGENT';
            throw err;
          }
          updates.referralAgentId = agent.id;
        } else if (payload.referralAgentId != null) {
          const agent = await User.findOne({
            where: {
              id: Number(payload.referralAgentId),
              role: ROLES.AGENT,
              status: USER_STATUSES.ACTIVE,
            },
          });
          if (!agent) {
            const err = new Error('Invalid referral agent.');
            err.status = 400;
            err.code = 'INVALID_REFERRAL_AGENT';
            throw err;
          }
          updates.referralAgentId = agent.id;
        }
      }
    }

    if (Object.keys(updates).length > 0) {
      await user.update(updates);
    }

    const refreshed = await User.findByPk(userId, { include: this.userInclude() });
    return this.formatAuthUser(refreshed, req);
  }

  async getApplicationStatus(mobile) {
    const user = await User.findOne({ where: { mobile: String(mobile).trim() } });
    if (!user) {
      const err = new Error('No application found for this mobile number.');
      err.status = 404;
      err.code = 'APPLICATION_NOT_FOUND';
      throw err;
    }
    return {
      mobile: user.mobile,
      name: user.name,
      role: user.role,
      status: user.status,
      memberId: user.memberId,
      rejectionReason: user.rejectionReason || null,
      createdAt: user.createdAt,
    };
  }

  /**
   * Creates the first admin from env if none exists.
   * Credentials come from ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_MOBILE — not seeded files.
   */
  async ensureDefaultAdmin() {
    const existingAdmin = await User.findOne({ where: { role: ROLES.ADMIN } });
    if (existingAdmin) return { created: false };

    const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD || '';
    const mobile = (process.env.ADMIN_MOBILE || '9000000001').trim();
    const name = (process.env.ADMIN_NAME || 'System Administrator').trim();

    if (!email || !password) {
      console.warn('[startup] ADMIN_EMAIL / ADMIN_PASSWORD not set — skipping admin bootstrap.');
      return { created: false, skipped: true };
    }

    await User.create({
      name,
      email,
      mobile,
      password,
      role: ROLES.ADMIN,
      status: USER_STATUSES.ACTIVE,
      agentCategoryId: null,
    });

    console.log(`[startup] Default admin created from env (${email}). Change password after first login.`);
    return { created: true };
  }
}

module.exports = new AuthService();
