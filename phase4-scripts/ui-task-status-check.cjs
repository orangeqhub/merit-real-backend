'use strict';
const { client } = require('./db.cjs');

(async () => {
  const c = client();
  await c.connect();
  const dist = await c.query(
    `SELECT status, COUNT(*)::int AS count FROM "MapPlots" GROUP BY status ORDER BY status`
  );
  const total = await c.query(`SELECT COUNT(*)::int AS count FROM "MapPlots"`);
  console.log('MapPlots status distribution (read-only SELECT, no writes):');
  console.log(JSON.stringify(dist.rows, null, 2));
  console.log('total rows:', total.rows[0].count);
  await c.end();
})().catch((e) => { console.error(e); process.exit(1); });
