'use strict';
const { client } = require('./db.cjs');
const fs = require('fs');
const path = require('path');

const OUT_DIR = 'D:/merit/merit-real-frontend-main/merit-real-frontend-main/phase4-acceptance-results';

const TARGET_IDS = [938, 1072, 466, 467, 1, 2, 1211, 1212, 69, 70, 745, 746];
const CONTAMINATED_IDS = [946, 1080, 68, 117, 794, 10, 1406, 556, 1210, 1259];
const COLS = `id, "layoutKey", phase, "plotNo", "externalId", "plotArea", "ratePerSqYd", "plotCost", status, "customerName", "customerId", "bookingRequestId", "bookedAt", facing, "plotType", "updatedAt"`;

(async () => {
  const c = client();
  await c.connect();

  const targets = await c.query(`SELECT ${COLS} FROM "MapPlots" WHERE id = ANY($1) ORDER BY id`, [TARGET_IDS]);
  const anneAll = await c.query(`SELECT id, "plotNo", phase, "externalId", "updatedAt" FROM "MapPlots" WHERE "layoutKey"='anne-enclave' ORDER BY phase, id`);
  const contaminated = await c.query(`SELECT ${COLS} FROM "MapPlots" WHERE id = ANY($1) ORDER BY id`, [CONTAMINATED_IDS]);

  fs.writeFileSync(`${OUT_DIR}/post-snapshot-targets.json`, JSON.stringify(targets.rows, null, 2));
  fs.writeFileSync(`${OUT_DIR}/post-snapshot-anne-all.json`, JSON.stringify(anneAll.rows, null, 2));
  fs.writeFileSync(`${OUT_DIR}/post-snapshot-contaminated.json`, JSON.stringify(contaminated.rows, null, 2));

  // Compare anne-enclave updatedAt vs pre-snapshot to find which rows changed.
  const preAnne = JSON.parse(fs.readFileSync(`${OUT_DIR}/pre-snapshot-anne-all.json`, 'utf8'));
  const preMap = new Map(preAnne.map((r) => [r.id, r.updatedAt]));
  const changedIds = [];
  for (const row of anneAll.rows) {
    if (preMap.get(row.id) !== row.updatedAt) changedIds.push(row.id);
  }
  console.log('Anne-enclave rows whose updatedAt changed:', JSON.stringify(changedIds));
  console.log('Expected only [938, 1072]. Match:', JSON.stringify(changedIds.sort((a,b)=>a-b)) === JSON.stringify([938,1072]));

  // contamination check
  const preContam = JSON.parse(fs.readFileSync(`${OUT_DIR}/pre-snapshot-contaminated.json`, 'utf8'));
  const contamPreMap = new Map(preContam.map((r) => [r.id, JSON.stringify(r)]));
  let contamUnchanged = true;
  for (const row of contaminated.rows) {
    if (contamPreMap.get(row.id) !== JSON.stringify(row)) { contamUnchanged = false; console.log('CONTAMINATED ROW CHANGED:', row.id); }
  }
  console.log('Contaminated rows unchanged:', contamUnchanged);

  console.log('\nTARGET ROWS POST-IMPORT:');
  console.log(JSON.stringify(targets.rows, null, 2));

  await c.end();
})().catch((e) => { console.error(e); process.exit(1); });
