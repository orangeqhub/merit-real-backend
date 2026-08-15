'use strict';

const siteVisitService = require('../services/siteVisitService');

const INTERVAL_MS = Number(process.env.SITE_VISIT_JOB_INTERVAL_MS) || 30 * 60 * 1000;
let timer = null;

async function runOnce() {
  try {
    const result = await siteVisitService.processReminders();
    if (result.visitReminders || result.followUpReminders) {
      console.log(
        `[site-visit-job] checked=${result.checked} visitReminders=${result.visitReminders} followUpReminders=${result.followUpReminders}`
      );
    }
    return result;
  } catch (err) {
    console.error('[site-visit-job] Failed:', err.message);
    return null;
  }
}

function startSiteVisitReminderJob() {
  if (timer) return;
  const firstRun = setTimeout(runOnce, 20 * 1000);
  if (typeof firstRun.unref === 'function') firstRun.unref();
  timer = setInterval(runOnce, INTERVAL_MS);
  if (typeof timer.unref === 'function') timer.unref();
  console.log(`[site-visit-job] Scheduled every ${Math.round(INTERVAL_MS / 60000)} minute(s).`);
}

module.exports = {
  startSiteVisitReminderJob,
  runOnce,
};
