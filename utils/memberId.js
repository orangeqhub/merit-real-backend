'use strict';

const { Op } = require('sequelize');
const { User } = require('../models');
const { ROLES } = require('../constants/roles');

const ROLE_PREFIX = {
  [ROLES.CUSTOMER]: 'CUST',
  [ROLES.AGENT]: 'AGT',
  [ROLES.ADMIN]: 'ADM',
  [ROLES.SALES_MEMBER]: 'SM',
  [ROLES.EMPLOYEE]: 'EMP',
};

/**
 * Name + Number agent code, e.g. Venkat0026 / Karthik26001.
 * Uses first name letters + YY + 3-digit sequence.
 */
function sanitizeNamePart(name) {
  const first = String(name || '')
    .trim()
    .split(/\s+/)[0]
    .replace(/[^a-zA-Z]/g, '');
  if (!first) return 'Agent';
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

async function generateAgentCode(name) {
  const namePart = sanitizeNamePart(name);
  const yy = String(new Date().getFullYear()).slice(-2);
  const prefix = `${namePart}${yy}`;

  const latest = await User.findOne({
    where: {
      role: ROLES.AGENT,
      memberId: { [Op.like]: `${prefix}%` },
    },
    order: [['memberId', 'DESC']],
    attributes: ['memberId'],
  });

  let next = 1;
  if (latest?.memberId) {
    const suffix = String(latest.memberId).slice(prefix.length);
    const seq = Number(suffix);
    if (Number.isFinite(seq)) next = seq + 1;
  }

  return `${prefix}${String(next).padStart(3, '0')}`;
}

/**
 * Generates the next member id for a role, e.g. CUST-2026-000001.
 * Agents use Name + Number format on approval.
 */
async function generateMemberId(role, name = null) {
  if (role === ROLES.AGENT) {
    return generateAgentCode(name);
  }

  const year = new Date().getFullYear();
  const prefix = ROLE_PREFIX[role] || 'USR';
  const likePattern = `${prefix}-${year}-%`;

  const latest = await User.findOne({
    where: {
      role,
      memberId: { [Op.like]: likePattern },
    },
    order: [['memberId', 'DESC']],
    attributes: ['memberId'],
  });

  let next = 1;
  if (latest?.memberId) {
    const parts = String(latest.memberId).split('-');
    const seq = Number(parts[parts.length - 1]);
    if (Number.isFinite(seq)) next = seq + 1;
  }

  return `${prefix}-${year}-${String(next).padStart(6, '0')}`;
}

module.exports = {
  generateMemberId,
  generateAgentCode,
  sanitizeNamePart,
};
