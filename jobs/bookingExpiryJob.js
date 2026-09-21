'use strict';

const bookingManagementService = require('../services/bookingManagementService');

const INTERVAL_MS = Number(process.env.BOOKING_JOB_INTERVAL_MS) || 60 * 60 * 1000; // hourly

let timer = null;

async function runOnce() {
  try {
    const result = await bookingManagementService.processExpiriesAndReminders();
    if (result.expired || result.reminded) {
      console.log(
        `[booking-job] checked=${result.checked} expired=${result.expired} reminded=${result.reminded}`
      );
    }
  } catch (err) {
    console.error('[booking-job] Failed:', err.message);
  }
}

function startBookingExpiryJob() {
  if (timer) return;
  // Run shortly after boot, then on interval
  setTimeout(runOnce, 15 * 1000);
  timer = setInterval(runOnce, INTERVAL_MS);
  if (typeof timer.unref === 'function') timer.unref();
  console.log(`[booking-job] Scheduled every ${Math.round(INTERVAL_MS / 60000)} minute(s).`);
}

module.exports = {
  startBookingExpiryJob,
  runOnce,
};
