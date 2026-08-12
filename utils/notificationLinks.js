'use strict';

const { ROLES } = require('../constants/roles');

function withOpenParam(path, entityId) {
  if (!entityId) return path;
  const id = Number(entityId);
  if (!Number.isFinite(id)) return path;
  const sep = String(path).includes('?') ? '&' : '?';
  return `${path}${sep}open=${id}`;
}

function expressInterestLink(role, interestId) {
  switch (String(role || '').toUpperCase()) {
    case ROLES.AGENT:
      return withOpenParam('/mediator/leads', interestId);
    case ROLES.ADMIN:
      return withOpenParam('/admin/express-interests', interestId);
    case ROLES.SALES_MEMBER:
      return withOpenParam('/sales/leads', interestId);
    case ROLES.CUSTOMER:
    default:
      return withOpenParam('/buyer/interests', interestId);
  }
}

function bookingLink(role, bookingId) {
  const id = Number(bookingId);
  if (!Number.isFinite(id)) {
    return String(role || '').toUpperCase() === ROLES.ADMIN ? '/admin/bookings' : '/buyer/bookings';
  }
  switch (String(role || '').toUpperCase()) {
    case ROLES.AGENT:
      return withOpenParam('/mediator/bookings', id);
    case ROLES.ADMIN:
      return withOpenParam('/admin/bookings', id);
    case ROLES.SALES_MEMBER:
      return withOpenParam('/sales/bookings', id);
    case ROLES.CUSTOMER:
    default:
      return `/buyer/bookings/${id}`;
  }
}

function purchaseLink(role, purchaseId) {
  const id = Number(purchaseId);
  if (!Number.isFinite(id)) return '/buyer/purchases';
  switch (String(role || '').toUpperCase()) {
    case ROLES.AGENT:
      return withOpenParam('/mediator/purchases', id);
    case ROLES.ADMIN:
      return withOpenParam('/admin/purchases', id);
    case ROLES.SALES_MEMBER:
      return withOpenParam('/sales/purchases', id);
    default:
      return withOpenParam('/buyer/purchases', id);
  }
}

module.exports = {
  withOpenParam,
  expressInterestLink,
  bookingLink,
  purchaseLink,
};
