'use strict';

const { sequelize } = require('../models');
const serverState = require('../state');
const authService = require('../services/authService');

/**
 * Startup bootstrap — authenticate only (no sequelize.sync).
 * Admin is created dynamically from env if missing (no seed data files).
 */
async function bootstrapApplication() {
  serverState.setStep(1, 'Loading configuration');

  serverState.setStep(2, 'Connecting PostgreSQL');
  await sequelize.authenticate();
  serverState.databaseConnected = true;
  console.log('[startup] PostgreSQL database connection established successfully.');

  serverState.setStep(3, 'Ensuring admin from environment');
  await authService.ensureDefaultAdmin();

  serverState.setStep(4, 'Backend Ready');
  serverState.markReady();

  try {
    const { startBookingExpiryJob } = require('../jobs/bookingExpiryJob');
    startBookingExpiryJob();
  } catch (err) {
    console.warn('[startup] Booking expiry job not started:', err.message);
  }
}

module.exports = {
  bootstrapApplication,
};
