'use strict';

const salesDashboardService = require('../services/salesDashboardService');

class SalesController {
  async dashboardStats(req, res, next) {
    try {
      const data = await salesDashboardService.getStats();
      return res.json({
        success: true,
        message: 'Sales dashboard stats fetched.',
        data,
        errors: [],
      });
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = new SalesController();
