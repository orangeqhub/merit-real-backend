'use strict';
// Step 8 stand-in: exercise mapBookingService.book()/release() directly
// (documented substitute for driving the full customer booking UI flow).
// Uses a SAFE sibling plot (sri-lakshmi id 468, plotNo 22 — not one of the
// 12 approved targets, not contaminated, currently 'available') rather than
// any of the 12 target plots, because all 12 targets were already set to
// 'booked' by the Excel import test and mapBookingService.book() requires
// status === 'available'. Verifies identity fields are preserved through
// book() and that release() cleanly restores 'available' with no leftover
// customer/booking fields, then confirms via direct DB query.
const path = require('path');
process.chdir(path.join(__dirname, '..'));
const mapBookingService = require('../services/mapBookingService');
const { MapPlot } = require('../models');
const fs = require('fs');

const OUT_DIR = 'D:/merit/merit-real-frontend-main/merit-real-frontend-main/phase4-acceptance-results';
const TARGET_ID = 468; // sri-lakshmi, plotNo 22, sibling/non-target/non-contaminated

(async () => {
  const before = await MapPlot.findByPk(TARGET_ID);
  const log = { targetId: TARGET_ID, layoutKey: before.layoutKey, plotNo: before.plotNo, phase: before.phase, externalId: before.externalId };
  log.before = before.toJSON();

  const booked = await mapBookingService.book(TARGET_ID, { customerName: 'PH4-QA-booking-callback-standin' }, null, { layout: 'sri-lakshmi' });
  log.afterBook = booked;
  log.identityPreservedAfterBook =
    booked.layoutKey === log.layoutKey && String(booked.phase) === String(log.phase) && booked.externalId === log.externalId;

  const released = await mapBookingService.release(TARGET_ID, { layout: 'sri-lakshmi' });
  log.afterRelease = released;

  const after = await MapPlot.findByPk(TARGET_ID);
  log.after = after.toJSON();
  log.fullyRestored = after.status === 'available' && after.customerName === null && after.customerId === null && after.bookingRequestId === null && after.bookedAt === null;

  fs.writeFileSync(`${OUT_DIR}/booking-callback-standin-log.json`, JSON.stringify(log, null, 2));
  console.log(JSON.stringify({
    identityPreservedAfterBook: log.identityPreservedAfterBook,
    fullyRestored: log.fullyRestored,
    afterBookStatus: booked.status,
    afterReleaseStatus: after.status,
  }, null, 2));
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
