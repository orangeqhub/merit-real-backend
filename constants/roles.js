'use strict';

/**
 * Domain role/status enums only — no demo data, no hardcoded agent categories.
 * Agent categories live in the AgentCategories table and are managed via API.
 */
const ROLES = {
  ADMIN: 'ADMIN',
  CUSTOMER: 'CUSTOMER',
  AGENT: 'AGENT',
  SALES_MEMBER: 'SALES_MEMBER',
  EMPLOYEE: 'EMPLOYEE',
};

const ROLE_LIST = Object.values(ROLES);

const PUBLIC_ROLES = [ROLES.CUSTOMER, ROLES.AGENT, ROLES.SALES_MEMBER, ROLES.EMPLOYEE];

const ROLE_LABELS = {
  ADMIN: 'Administrator',
  CUSTOMER: 'Customer',
  AGENT: 'Agent',
  SALES_MEMBER: 'Sales Member',
  EMPLOYEE: 'Employee',
};

const USER_STATUSES = {
  PENDING: 'PENDING',
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  SUSPENDED: 'SUSPENDED',
  REJECTED: 'REJECTED',
};

const USER_STATUS_LIST = Object.values(USER_STATUSES);

/** Fixed agent grades assigned by admin during approval */
const AGENT_GRADES = {
  ABP: 'ABP',
  ABC: 'ABC',
  BA: 'BA',
};

const AGENT_GRADE_LIST = Object.values(AGENT_GRADES);

const AGENT_GRADE_LABELS = {
  ABP: 'Area Business Partner (ABP)',
  ABC: 'Area Business Coordinator (ABC)',
  BA: 'Business Advisor (BA)',
};

/**
 * Fixed commission split (% of the total credited commission) when a closed
 * deal's agent is a Business Advisor. The BA's linked ABP and ABC each take
 * their share automatically; a plain ABP/ABC deal still keeps 100%.
 */
const AGENT_COMMISSION_SPLIT = {
  ABP: 20,
  ABC: 20,
  BA: 60,
};

module.exports = {
  ROLES,
  ROLE_LIST,
  PUBLIC_ROLES,
  ROLE_LABELS,
  USER_STATUSES,
  USER_STATUS_LIST,
  AGENT_GRADES,
  AGENT_GRADE_LIST,
  AGENT_GRADE_LABELS,
  AGENT_COMMISSION_SPLIT,
};
