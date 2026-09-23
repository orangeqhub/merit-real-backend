'use strict';
// Reverts all anne-enclave rows that were unintentionally touched by the
// Phase 4 acceptance-test import, EXCEPT id 938 (the one legitimate,
// approved target change). This restores full pre-snapshot values
// (including updatedAt) for every other touched row, including the
// misrouted collateral-damage rows 1206/1207 and the contaminated row 946.
const { client } = require('./db.cjs');
const fs = require('fs');

const OUT_DIR = 'D:/merit/merit-real-frontend-main/merit-real-frontend-main/phase4-acceptance-results';
const KEEP_CHANGED_ID = 938; // approved, intended anne-enclave test change

const FIELDS = ['plotArea', 'ratePerSqYd', 'plotCost', 'status', 'customerName', 'customerId', 'bookingRequestId', 'bookedAt', 'facing', 'plotType', 'plotNo', 'externalId', 'updatedAt'];

(async () => {
  const pre = JSON.parse(fs.readFileSync(`${OUT_DIR}/pre-snapshot-anne-full.json`, 'utf8'));
  const post = JSON.parse(fs.readFileSync(`${OUT_DIR}/post-snapshot-anne-full.json`, 'utf8'));
  const preMap = new Map(pre.map((r) => [r.id, r]));

  const c = client();
  await c.connect();

  let reverted = 0;
  const revertedIds = [];
  for (const row of post) {
    if (row.id === KEEP_CHANGED_ID) continue;
    const p = preMap.get(row.id);
    const anyDiff = FIELDS.some((f) => String(p[f]) !== String(row[f]));
    if (!anyDiff) continue;

    await c.query(
      `UPDATE "MapPlots" SET
        "plotArea" = $1, "ratePerSqYd" = $2, "plotCost" = $3, status = $4,
        "customerName" = $5, "customerId" = $6, "bookingRequestId" = $7,
        "bookedAt" = $8, facing = $9, "plotType" = $10, "plotNo" = $11,
        "externalId" = $12, "updatedAt" = $13
      WHERE id = $14`,
      [
        p.plotArea, p.ratePerSqYd, p.plotCost, p.status,
        p.customerName, p.customerId, p.bookingRequestId,
        p.bookedAt, p.facing, p.plotType, p.plotNo,
        p.externalId, p.updatedAt, row.id,
      ]
    );
    reverted += 1;
    revertedIds.push(row.id);
  }

  console.log('Reverted', reverted, 'rows.');
  fs.writeFileSync(`${OUT_DIR}/anne-collateral-revert-log.json`, JSON.stringify({ revertedCount: reverted, revertedIds }, null, 2));

  await c.end();
})().catch((e) => { console.error(e); process.exit(1); });
