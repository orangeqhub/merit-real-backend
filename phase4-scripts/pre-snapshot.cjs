'use strict';
const { client } = require('./db.cjs');
const fs = require('fs');

const TARGET_IDS = [938, 1072, 466, 467, 1, 2, 1211, 1212, 69, 70, 745, 746];
const CONTAMINATED_IDS = [946, 1080, 68, 117, 794, 10, 1406, 556, 1210, 1259];

const COLS = `id, "layoutKey", phase, "plotNo", "externalId", "plotArea", "ratePerSqYd", "plotCost", status, "customerName", "customerId", "bookingRequestId", "bookedAt", facing, "plotType", "updatedAt"`;

const OUT_DIR = 'D:/merit/merit-real-frontend-main/merit-real-frontend-main/phase4-acceptance-results';

(async () => {
  const c = client();
  await c.connect();

  const targets = await c.query(`SELECT ${COLS} FROM "MapPlots" WHERE id = ANY($1) ORDER BY id`, [TARGET_IDS]);
  const anneAll = await c.query(`SELECT id, "plotNo", phase, "externalId", "updatedAt" FROM "MapPlots" WHERE "layoutKey"='anne-enclave' ORDER BY phase, id`);
  const anneFull = await c.query(`SELECT ${COLS} FROM "MapPlots" WHERE "layoutKey"='anne-enclave' ORDER BY phase, id`);
  const contaminated = await c.query(`SELECT ${COLS} FROM "MapPlots" WHERE id = ANY($1) ORDER BY id`, [CONTAMINATED_IDS]);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(`${OUT_DIR}/pre-snapshot-targets.json`, JSON.stringify(targets.rows, null, 2));
  fs.writeFileSync(`${OUT_DIR}/pre-snapshot-anne-all.json`, JSON.stringify(anneAll.rows, null, 2));
  fs.writeFileSync(`${OUT_DIR}/pre-snapshot-anne-full.json`, JSON.stringify(anneFull.rows, null, 2));
  fs.writeFileSync(`${OUT_DIR}/pre-snapshot-contaminated.json`, JSON.stringify(contaminated.rows, null, 2));

  console.log('targets found:', targets.rows.length, '/', TARGET_IDS.length);
  console.log('anne rows found:', anneAll.rows.length);
  console.log('contaminated found:', contaminated.rows.length);
  console.log(JSON.stringify(targets.rows, null, 2));

  await c.end();
})().catch((e) => { console.error(e); process.exit(1); });
