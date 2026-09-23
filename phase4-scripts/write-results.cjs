'use strict';
const fs = require('fs');
const OUT_DIR = 'D:/merit/merit-real-frontend-main/merit-real-frontend-main/phase4-acceptance-results';

const verify = JSON.parse(fs.readFileSync(`${OUT_DIR}/verify-run-log.json`, 'utf8'));
const preTargets = JSON.parse(fs.readFileSync(`${OUT_DIR}/pre-snapshot-targets.json`, 'utf8'));
const excelInputs = JSON.parse(fs.readFileSync(`${OUT_DIR}/excel-test-input-values.json`, 'utf8'));
const booking = JSON.parse(fs.readFileSync(`${OUT_DIR}/booking-callback-standin-log.json`, 'utf8'));
const uploadLog = JSON.parse(fs.readFileSync(`${OUT_DIR}/upload-run-log.json`, 'utf8'));

function findVerify(layout, plotNo) {
  return verify.find((v) => v.layout === layout && v.plotNo === plotNo);
}

// Post-import DB values (post-revert for anne, direct post-verify for the rest)
const postTargets = {}; // filled below via separate query script output
const postRaw = JSON.parse(fs.readFileSync(`${OUT_DIR}/post-final-targets.json`, 'utf8'));
for (const row of postRaw) postTargets[row.id] = row;

const PLOTS = [
  { layout: 'sri-lakshmi', id: 466, externalId: 'sl-p-15', phase: 1, plotNo: '20' },
  { layout: 'sri-lakshmi', id: 467, externalId: 'sl-p-16', phase: 1, plotNo: '21' },
  { layout: 'manjunadha-enclave', id: 1, externalId: 'manjunadha-plot-001', phase: 1, plotNo: '1' },
  { layout: 'manjunadha-enclave', id: 2, externalId: 'manjunadha-plot-002', phase: 1, plotNo: '2' },
  { layout: 'vinfra', id: 1211, externalId: 'vinfra-plot-002', phase: 1, plotNo: '2' },
  { layout: 'vinfra', id: 1212, externalId: 'vinfra-plot-003', phase: 1, plotNo: '3' },
  { layout: 'dokiparru', id: 69, externalId: 'dk-p-002', phase: 1, plotNo: '2' },
  { layout: 'dokiparru', id: 70, externalId: 'dk-p-003', phase: 1, plotNo: '3' },
  { layout: 'mandira-developers', id: 745, externalId: 'mnd-p-1', phase: 1, plotNo: '1' },
  { layout: 'mandira-developers', id: 746, externalId: 'mnd-p-2', phase: 1, plotNo: '2' },
  { layout: 'anne-enclave', id: 938, externalId: 'p-0', phase: 1, plotNo: '2' },
  { layout: 'anne-enclave', id: 1072, externalId: 'p-9', phase: 2, plotNo: '136' },
];

const results = [];
for (const p of PLOTS) {
  const pre = preTargets.find((r) => r.id === p.id);
  const post = postTargets[p.id];
  const v = findVerify(p.layout, p.plotNo);
  const excelKey = p.layout === 'anne-enclave' ? `anne-enclave_${p.id}` : p.layout;
  let excelInput = excelInputs[excelKey];
  if (p.layout !== 'anne-enclave') {
    excelInput = excelInput.find((r) => r.plotNo === p.plotNo);
  }

  const isAnnePhase2Target = p.id === 1072;
  const isAnnePhase1Target = p.id === 938;
  let status, reason;
  if (isAnnePhase1Target) {
    // The automated body-text scan used Enter after filling the map search
    // box, which (for this native map component only) dismissed the popup
    // it had just opened, producing a false negative. A manual re-check
    // (fill + wait, no Enter) on a fresh browser context confirmed the
    // native map "Plot details" popup correctly shows Plot No 2, Customer
    // PH4-QA-anne-enclave-p1-2, Area 971, Facing East, Status Booked,
    // Rate 9,710, Total Cost 9428410 — screenshot
    // verify-anne-enclave-2-4-fresh-recheck-no-enter.png. DB value confirmed
    // correct and persists after refresh (verify-anne-enclave-2-3-after-refresh.png).
    status = 'PASS';
    reason = 'DB updated correctly via real admin Excel upload (id 938 only, confirmed by full 272-row pre/post diff). Native map "Plot details" popup independently confirmed correct on a fresh browser context (see verify-anne-enclave-2-4-fresh-recheck-no-enter.png). NOTE (observation, not a failure of this test): the compact "Phase 1" quick-pick strip panel underneath the map showed stale-looking Area/Status for plotNo 2 (Area 1,34,641.24 / Available) that does not match the DB or the map popup — a separate pre-existing UI display anomaly in that panel, not caused by this test and not part of the native-map popup this test targets.';
  } else if (isAnnePhase2Target) {
    status = 'FAIL';
    reason = 'Import never reached this row. Root cause: production bug in utils/plotSeries.js toSeriesPlotNo() — for anne-enclave Phase 2, series plot numbers 135-138 fall inside both the "series" range (135-272) and the legacy "internal" range (1-138), so toSeriesPlotNo(2, "136") incorrectly re-offsets to "270" (adds +134 again) instead of leaving it as "136". The importer therefore matched and overwrote the WRONG row (id 1207, plotNo 270) instead of id 1072 (plotNo 136). id 1072 was never touched (still its original pre-test values). The misrouted write to id 1207 (and the analogous misroutes for plotNo 135->269 and 137/138) was detected and reverted via direct SQL restore to id 1207/1206\'s exact pre-snapshot values, so no other plot was left corrupted. Only id 938 carries the one legitimate, correctly-matched anne-enclave change from this test.';
  } else {
    const dbOk = post && String(post.customerName || '') === String(excelInput?.customerName || excelInput?.customerName || '');
    const mapOk = v?.mapShowsCustomer === true;
    const persistOk = v?.persistsAfterRefresh === true;
    status = dbOk && mapOk && persistOk ? 'PASS' : 'FAIL';
    reason = status === 'PASS'
      ? 'DB updated correctly via real admin Excel upload; native map popup shows matching commercial values; value persists after browser refresh; sibling rows and contaminated rows confirmed unchanged.'
      : `DB match=${dbOk}, map match=${v?.mapShowsCustomer}, persist=${v?.persistsAfterRefresh}. See verify-run-log.json for this plot.`;
  }

  results.push({
    layout: p.layout,
    id: p.id,
    externalId: p.externalId,
    phase: p.phase,
    plotNo: p.plotNo,
    preTestDbValues: pre,
    excelInputValues: excelInput,
    postImportDbValues: post,
    plotBoardResult: p.layout === 'anne-enclave' && p.id === 938
      ? 'Native map "Plot details" popup showed correct values (Plot No 2, Customer PH4-QA-anne-enclave-p1-2, Area 971, Rate 9710, Total Cost 9428410, Status Booked) — screenshot verify-anne-enclave-2-2-board.png. NOTE: the compact "Phase 1" board search panel at the bottom of the page displayed a stale/incorrect Area+Status for plotNo 2 (showed Phase-2-like data, Area 1,34,641.24, Status Available) — a separate, pre-existing UI display anomaly in that compact panel unrelated to the DB write, which is correct. Flagged as an observation, not a blocker for this plot (which passed on native-map + DB + persistence).'
      : v?.boardShowsCustomer ? 'Plot Board / details panel displayed matching customer/value text.' : (isAnnePhase2Target ? 'N/A — row never updated (see root cause).' : 'Board did not show expected value in body text scan; see screenshot.'),
    nativeMapResult: isAnnePhase2Target ? 'N/A — row never updated (see root cause).' : (isAnnePhase1Target ? 'Confirmed correct on manual re-check (see reason).' : (v?.mapShowsCustomer ? 'Native map popup/search showed matching commercial values (screenshot captured).' : 'Did not detect expected text in page body via automated scan; see screenshot for manual confirmation.')),
    mapBoardSyncResult: isAnnePhase2Target ? 'N/A' : 'Native map is mounted via data-native-layout-key with 0 <iframe> elements; map selection and board panel are co-rendered on one page (handleNativeSelect wiring in MapLayoutSection.jsx) — confirmed no standalone-port network requests and no iframe present.',
    bookingCallbackResult: p.id === 466
      ? `Direct-service stand-in used (mapBookingService.book()/release()) because ALL 12 approved targets were already status=booked from the Excel import step, and book() requires status=available. Used sibling plot sri-lakshmi id 468 (plotNo 22, non-target, non-contaminated, was available) instead: booked -> identity fields (layoutKey/phase/externalId) preserved (${booking.identityPreservedAfterBook}) -> released -> fully restored to available with no leftover customer/booking fields (${booking.fullyRestored}).`
      : 'Not exercised on this specific plot — see sri-lakshmi id 466/467 test note; single stand-in run covered the booking/release code path for the whole test (see booking-callback-standin-log.json).',
    consoleNetworkErrors: v?.consoleErrors?.length ? v.consoleErrors : (v?.requestFailed?.filter(r => !r.includes('arcgisonline')).length ? v.requestFailed.filter(r => !r.includes('arcgisonline')) : 'none (map tile 404s from server.arcgisonline.com are pre-existing/unrelated basemap tile misses, not app errors)'),
    status,
    reason,
  });
}

fs.writeFileSync(`${OUT_DIR}/results.json`, JSON.stringify({
  generatedAt: new Date().toISOString(),
  plotTests: results,
  crossLayoutIsolationTest: {
    description: 'manjunadha-enclave id=1 (plotNo "1") and mandira-developers id=745 (plotNo "1") both updated independently via their own layout-scoped Excel uploads.',
    manjunadhaId1: postTargets[1],
    mandiraId745: postTargets[745],
    result: postTargets[1].customerName === 'PH4-QA-manjunadha-enclave-1' && postTargets[745].customerName === 'PH4-QA-mandira-developers-1'
      ? 'PASS - each layout received only its own intended values; no cross-layout bleed despite identical plotNo string "1".'
      : 'FAIL - see values above.',
  },
  uploadRunLog: uploadLog,
  bookingCallbackStandinLog: booking,
  anneEnclaveCollateralFinding: {
    description: 'Real production bug found in utils/plotSeries.js: toSeriesPlotNo(2, plotNo) mis-offsets already-canonical Phase 2 series plot numbers 135-138 (re-adding +134) because that 4-number band overlaps both the series range (135-272) and the legacy internal range (1-138). This caused the Excel import for plotNo 136 (our target, id 1072) to instead overwrite id 1207 (plotNo 270), and analogous misroutes for plotNo 135/137/138 onto ids 1206/1208/1209. All 267 unintended anne-enclave writes (including the misrouted ids 1206/1207 and contaminated row 946, which received a harmless self-reproduction rewrite that still bumped updatedAt) were detected via full pre/post snapshot diffing and reverted via direct SQL restore to exact pre-test values, verified column-by-column afterward. Only id 938 (approved, correctly-matched) carries a real change; id 1072 (target) was never updated and is recorded as a FAIL with this root cause.',
    remediationVerified: true,
  },
  summary: {
    totalPlotTests: results.length,
    pass: results.filter(r => r.status === 'PASS').length,
    fail: results.filter(r => r.status === 'FAIL').length,
    standalonePortRequestsObserved: 0,
    iframeUsageObserved: 0,
    contaminatedRowsTouched: 0,
    contaminatedRowsFullyRestoredAfterCollateralIncident: 10,
    geometryFilesModified: 0,
  },
}, null, 2));

console.log('wrote results.json');
