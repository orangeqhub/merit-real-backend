'use strict';

const { User } = require('../models');
const { ROLES, AGENT_GRADES } = require('../constants/roles');

/**
 * Business Advisors must be linked to one active ABP and one active ABC so
 * commission can be auto-split (walletService.creditCommission). Resolves
 * and validates the pair, throwing a 400 with a clear message otherwise.
 */
async function resolveBusinessAdvisorLinks({ linkedAbpId, linkedAbcId }) {
  const abpId = linkedAbpId ? Number(linkedAbpId) : null;
  const abcId = linkedAbcId ? Number(linkedAbcId) : null;

  if (!abpId || !abcId) {
    const err = new Error(
      'A Business Advisor must be linked to an Area Business Partner and an Area Business Coordinator.'
    );
    err.status = 400;
    err.code = 'BUSINESS_ADVISOR_LINKS_REQUIRED';
    throw err;
  }

  const [abp, abc] = await Promise.all([
    User.findOne({ where: { id: abpId, role: ROLES.AGENT, agentGrade: AGENT_GRADES.ABP } }),
    User.findOne({ where: { id: abcId, role: ROLES.AGENT, agentGrade: AGENT_GRADES.ABC } }),
  ]);

  if (!abp) {
    const err = new Error('Selected Area Business Partner was not found.');
    err.status = 400;
    err.code = 'INVALID_LINKED_ABP';
    throw err;
  }
  if (!abc) {
    const err = new Error('Selected Area Business Coordinator was not found.');
    err.status = 400;
    err.code = 'INVALID_LINKED_ABC';
    throw err;
  }

  return { linkedAbpId: abpId, linkedAbcId: abcId };
}

module.exports = { resolveBusinessAdvisorLinks };
