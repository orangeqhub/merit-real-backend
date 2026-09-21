'use strict';
/* eslint-disable */
//
// Rebuild sri-lakshmi MapPlots to EXACTLY mirror getGenuinePlots() — the
// single authoritative plot identity used by the map apps (rendering,
// hover, click, counts, search).
//
// Root cause found end-to-end:
//   - plotNumberMapping.json carries 299 digitized polygons (ids p-N +
//     missing-p*) covering 20 duplicate-polygon artifacts and 279 genuine
//     plots labelled 1..279 (labels corrected via plotNumberMapping.verified.json).
//   - The DB had 279 rows, but they were the WRONG 279: 20 rows were
//     shadow/duplicate-polygon rows (e.g. sl-p-1->1, sl-p-22->22, ...),
//     12 rows had the raw un-verified label kept instead of the corrected
//     one (labels 40/68/76/85/92/99/146/150/196/201), and the genuine rows
//     for labels 1..19 and 37 (geometry ids missing-p1..missing-p19,
//     missing-p37) were MISSING — they were deleted earlier as "junk".
//   - Net effect: 18 duplicated plotNos + labels 2..19 absent -> Excel
//     upload could never land real values on every map plot.
//
// Fix (delete shadows, insert missing genuine rows) keeps row ids stable for
// the 259 already-correct rows, then the real Excel upload re-prices every
// label. No bookings/express-interests reference these rows.
//
const fs = require('fs');
const { Op } = require('sequelize');
const { MapPlot, Property } = require('../models');
const mapBookingService = require('../services/mapBookingService');
const { toSeriesPlotNo } = require('../utils/plotSeries');

const DIR = 'D:/merit/merit-srilakshmi/src/layouts/sri-lakshmi';
const mapping = JSON.parse(fs.readFileSync(`${DIR}/plotNumberMapping.json`, 'utf8'));
const audit = JSON.parse(fs.readFileSync(`${DIR}/layoutGeometryAudit.json`, 'utf8'));
const verified = JSON.parse(fs.readFileSync(`${DIR}/plotNumberMapping.verified.json`, 'utf8'));

const auditById = new Map(audit.map((e) => [e.geometryId, e]));
const isDup = (id) => auditById.get(id)?.geometryType === 'duplicate-polygon';

// Replicate getGenuinePlots() exactly (merit-srilakshmi/src/utils/plotIdentity.ts).
const genuine = mapping
  .filter((p) => !isDup(p.id))
  .map((p) => {
    const v = verified[p.id];
    if (v && v.plotNumber && String(v.plotNumber) !== String(p.plotNumber)) {
      return { ...p, plotNumber: String(v.plotNumber) };
    }
    return p;
  });

const labels = genuine.map((p) => String(p.plotNumber).trim());
if (genuine.length !== 279 || new Set(labels).size !== 279) {
  throw new Error(`Genuine list unexpected: ${genuine.length} entries / ${new Set(labels).size} distinct labels`);
}

(async () => {
  const property = await Property.findByPk(3);
  if (!property) throw new Error('sri layout property (id 3) not found');

  const rows = await MapPlot.findAll({ where: { layoutKey: 'sri-lakshmi' } });
  if (rows.length !== 279) throw new Error(`Expected 279 sri rows, found ${rows.length}`);

  const genuineExt = new Set(genuine.map((p) => `sl-${p.id}`));
  const toDelete = rows.filter((r) => !genuineExt.has(r.externalId));
  const rowByExt = new Map(rows.map((r) => [r.externalId, r]));
  const toInsert = genuine.filter((p) => !rowByExt.has(`sl-${p.id}`));

  console.log(`existing rows     = ${rows.length}`);
  console.log(`shadow rows delete= ${toDelete.length}`);
  console.log(`genuine rows add  = ${toInsert.length}`);

  if (toDelete.length) {
    await MapPlot.destroy({
      where: { layoutKey: 'sri-lakshmi', externalId: { [Op.in]: toDelete.map((r) => r.externalId) } },
    });
    console.log('deleted:', toDelete.map((r) => `${r.externalId}(plotNo ${r.plotNo})`).join(', '));
  }

  if (toInsert.length) {
    const items = toInsert.map((p) => ({
      externalId: `sl-${p.id}`,
      plotNo: toSeriesPlotNo(1, p.plotNumber),
      phase: 1,
      plotArea:
        p.plotArea != null ? Math.round(Number(p.plotArea) * 100) / 100
        : p.area != null ? Math.round(Number(p.area) * 100) / 100
        : null,
      status: 'available',
      plotType: 'residential',
      propertyId: property.id,
    }));
    const result = await mapBookingService.seedPlots(items, { layout: 'sri-lakshmi' });
    console.log('inserted via seedPlots:', JSON.stringify(result));
  }

  // Post-condition: 279 rows, unique plotNos covering 1..279, plotNo == label.
  const after = await MapPlot.findAll({ where: { layoutKey: 'sri-lakshmi' } });
  const nos = after.map((r) => String(r.plotNo).trim());
  const missing = [];
  for (let i = 1; i <= 279; i++) if (!nos.includes(String(i))) missing.push(i);
  const dupNos = [...new Set(nos)].filter((n) => nos.filter((x) => x === n).length > 1);
  const labelOk = genuine.every((p) => {
    const r = after.find((x) => x.externalId === `sl-${p.id}`);
    return r && String(r.plotNo) === String(p.plotNumber);
  });
  console.log(`\nPOST: rows=${after.length} unique=${new Set(nos).size} missing=${JSON.stringify(missing)} dup=${JSON.stringify(dupNos)} labelsMatchGenuine=${labelOk}`);
  const bad = after.filter((r) => !genuineExt.has(r.externalId));
  console.log(`rows with non-genuine externalId remaining = ${bad.length}`);
  process.exit(bad.length || missing.length || dupNos.length || !labelOk ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });