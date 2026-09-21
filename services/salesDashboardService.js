'use strict';

const { Op } = require('sequelize');
const {
  User,
  Property,
  ExpressInterest,
  BookingRequest,
  PurchaseRequest,
  ClosedDeal,
  BookingFollowUp,
} = require('../models');
const { ROLES, USER_STATUSES } = require('../constants/roles');

class SalesDashboardService {
  async getStats() {
    const now = new Date();
    const [
      customers,
      activeCustomers,
      agents,
      activeAgents,
      openProperties,
      reservedProperties,
      soldProperties,
      activeBookings,
      purchaseRequests,
      closedDeals,
      activeLeads,
      upcomingFollowUps,
      missedFollowUps,
      totalFollowUps,
    ] = await Promise.all([
      User.count({ where: { role: ROLES.CUSTOMER } }),
      User.count({ where: { role: ROLES.CUSTOMER, status: USER_STATUSES.ACTIVE } }),
      User.count({ where: { role: ROLES.AGENT } }),
      User.count({ where: { role: ROLES.AGENT, status: USER_STATUSES.ACTIVE } }),
      Property.count({ where: { status: 'ACTIVE' } }),
      Property.count({ where: { status: 'BOOKED' } }),
      Property.count({ where: { status: 'SOLD' } }),
      BookingRequest.count({
        where: {
          status: {
            [Op.notIn]: ['CANCELLED', 'REJECTED', 'BOOKING_EXPIRED', 'CONVERTED_TO_PURCHASE'],
          },
        },
      }),
      PurchaseRequest.count(),
      ClosedDeal.count(),
      ExpressInterest.count({
        where: {
          status: {
            [Op.notIn]: ['REJECTED', 'CLOSED', 'COMPLETED', 'CONVERTED'],
          },
        },
      }),
      BookingFollowUp.count({
        where: {
          nextFollowUpAt: { [Op.gte]: now },
          status: { [Op.ne]: 'COMPLETED' },
        },
      }).catch(() => 0),
      BookingFollowUp.count({
        where: {
          nextFollowUpAt: { [Op.lt]: now },
          status: { [Op.ne]: 'COMPLETED' },
        },
      }).catch(() => 0),
      BookingFollowUp.count().catch(() => 0),
    ]);

    return {
      customers: { total: customers, active: activeCustomers },
      agents: { total: agents, active: activeAgents },
      properties: {
        open: openProperties,
        reserved: reservedProperties,
        sold: soldProperties,
      },
      deals: {
        activeLeads,
        activeBookings,
        purchaseRequests,
        closedDeals,
      },
      followUps: {
        upcoming: upcomingFollowUps || 0,
        missed: missedFollowUps || 0,
        total: totalFollowUps || 0,
      },
    };
  }
}

module.exports = new SalesDashboardService();
