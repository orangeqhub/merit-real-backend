'use strict';
/* eslint-disable */
const fs = require('fs');

const DIR = 'D:/merit/merit-srilakshmi/src/layouts/sri-lakshmi';
const mapping = JSON.parse(fs.readFileSync(`${DIR}/plotNumberMapping.json`, 'utf8'));
const audit = JSON.parse(fs.readFileSync(`${DIR}/layoutGeometryAudit.json`, 'utf8'));
const verified = JSON.parse(fs.readFileSync(`${DIR}/plotNumberMapping.verified.json`, 'utf8'));

const auditById = new Map(audit.map((e) => [e.geometryId, e]));
const isDup = (id) => auditById.get(id)?.geometryType === 'duplicate-polygon';

// Replicate getGenuinePlots() exactly.
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
console.log('mapping entries =', mapping.length);
console.log('audit entries   =', audit.length);
console.log('dup polygons    =', audit.filter((e) => e.geometryType === 'duplicate-polygon').length);
console.log('genuine entries =', genuine.length);
console.log('distinct labels =', new Set(labels).size);
console.log('dup labels among genuine =', JSON.stringify([...new Set(labels)].filter((l) => labels.filter((x) => x === l).length > 1)));

const genByLabel = new Map();
for (const p of genuine) genByLabel.set(String(p.plotNumber).trim(), p);
const missing = [];
for (let i = 1; i <= 279; i++) if (!labels.includes(String(i))) missing.push(i);
console.log('labels missing 1..279 =', JSON.stringify(missing));
console.log('genuine sample:', genuine.slice(0, 8).map((p) => `${p.id}=>${p.plotNumber}`).join(', '));

// Which geometry ids does each label map to, and which is the FIRST in mapping order (what the map renders implicitly by dedupe?)
const seen = new Set();
const keptByMappingOrder = [];
for (const p of mapping) {
  const l = String(p.plotNumber).trim();
  if (!seen.has(l)) { seen.add(l); keptByMappingOrder.push(p); }
}
const byLabelFirst = new Map(keptByMappingOrder.map((p) => [String(p.plotNumber).trim(), p.id]));
console.log('\nlabels where getGenuinePlots keeps a DIFFERENT id than raw first-seen:');
let diff = 0;
for (const p of genuine) {
  const firstId = byLabelFirst.get(String(p.plotNumber).trim());
  if (firstId !== p.id) { diff += 1; if (diff <= 12) console.log(`  label ${p.plotNumber}: genuine=${p.id} rawFirst=${firstId}`); }
}
console.log('count differing =', diff);

// Current DB rows from the API.
const { MapPlot, ExpressInterest, BookingRequest } = require('../models');
(async () => {
  const rows = await MapPlot.findAll({ where: { layoutKey: 'sri-lakshmi' } });
  console.log('\ncurrent DB sri rows =', rows.length);
  const rowByExt = new Map(rows.map((r) => [r.externalId, r]));
  const genuineExt = new Set(genuine.map((p) => `sl-${p.id}`));
  const extra = rows.filter((r) => !genuineExt.has(r.externalId));
  const missingRows = genuine.filter((p) => !rowByExt.has(`sl-${p.id}`));
  const labelMisaligned = genuine.filter((p) => {
    const r = rowByExt.get(`sl-${p.id}`);
    return r && String(r.plotNo) !== String(p.plotNumber);
  });
  console.log('rows whose externalId is NOT a genuine id (to delete) =', extra.length, extra.map((r) => `${r.externalId}->${r.plotNo}`).join(', '));
  console.log('genuine entries with NO row (to insert) =', missingRows.length, missingRows.map((p) => `${p.id}=>${p.plotNumber}`).join(', '));
  console.log('rows whose plotNo != genuine label (to fix) =', labelMisaligned.length, labelMisaligned.slice(0, 10).map((p) => `sl-${p.id}:${rowByExt.get('sl-'+p.id)?.plotNo}->${p.plotNumber}`).join(', '));

  // Row ids of all current sri plots.
  const ids = rows.map((r) => r.id);
  const [expr, book] = await Promise.all([
    ExpressInterest.count({ where: { mapPlotId: { [require('sequelize').Op.in]: ids } } }),
    BookingRequest.count({ where: { mapPlotId: { [require('sequelize').Op.in]: ids } } }),
  ]);
  console.log('express interests referencing sri plots =', expr);
  console.log('booking requests referencing sri plots  =', book);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });