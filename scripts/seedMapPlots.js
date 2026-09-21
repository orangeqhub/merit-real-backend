'use strict';

/**
 * One-time / idempotent seed of MapPlots for each map layout from its
 * plotNumberMapping.json.
 * Usage: node scripts/seedMapPlots.js [layoutKey]
 */
const fs = require('fs');
const path = require('path');
const mapBookingService = require('../services/mapBookingService');
const layoutPropertyService = require('../services/layoutPropertyService');
const { assignPlotPhases } = require('../utils/plotPhases');
const { toSeriesPlotNo } = require('../utils/plotSeries');

const LAYOUTS = [
  {
    key: 'anne-enclave',
    mappingPath: path.resolve(
      __dirname,
      '../../../merit-map-layout-main/merit-map-layout-main/src/layouts/anne-enclave/plotNumberMapping.json'
    ),
    forcePhase: null,
    idPrefix: '',
  },
  {
    key: 'sri-lakshmi',
    mappingPath: path.resolve(
      __dirname,
      '../../../merit-srilakshmi/src/layouts/sri-lakshmi/plotNumberMapping.json'
    ),
    forcePhase: 1,
    idPrefix: 'sl-',
  },
  {
    key: 'manjunadha-enclave',
    mappingPath: path.resolve(
      __dirname,
      '../../../map-manjunadha-enclave/src/layouts/manjunadha/plotNumberMapping.json'
    ),
    forcePhase: 1,
    // Source ids are already namespaced ("manjunadha-plot-024"), so no
    // extra prefix is needed to keep externalId globally unique.
    idPrefix: '',
    // Same world-unit calibration as vinfra below: the mapping's `area`
    // field is a raw world-unit^2 figure, while `areaSqYd` is the
    // source-verified square-yard figure printed on the drawing's own
    // schedule. Seeding `area` would surface absurd areas (e.g. ~540,000
    // "sq.yds") in the plot details card.
    areaField: 'areaSqYd',
  },
  {
    key: 'dokiparru',
    mappingPath: path.resolve(
      __dirname,
      '../../../merit-dokiparru/src/layouts/dokiparru/plotNumberMapping.json'
    ),
    forcePhase: 1,
    // Source ids are generic ("p-001") and would collide with other
    // layouts' ids without a prefix.
    idPrefix: 'dk-',
  },
  {
    key: 'vinfra',
    mappingPath: path.resolve(
      __dirname,
      '../../../map-vinfra/src/layouts/vinfra/plotNumberMapping.json'
    ),
    forcePhase: 1,
    // Source ids are already namespaced ("vinfra-plot-024"), so no extra
    // prefix is needed to keep externalId globally unique.
    idPrefix: '',
    // This layout's own `area` field is a raw world-unit^2 figure (world
    // units = feet * 4, so `area` is actually square feet, not the
    // "plotArea" column's expected square yards) -- `areaSqYd` is the
    // correct, source-verified square-yard figure already computed in
    // tools/generate-layout.mjs from the drawing's own printed schedule.
    // Other layouts above still use the default `area` field, unchanged.
    areaField: 'areaSqYd',
  },
  {
    key: 'mandira-developers',
    mappingPath: path.resolve(
      __dirname,
      '../../../map-mandira-developers/src/layouts/mandira/plotNumberMapping.json'
    ),
    forcePhase: 1,
    // Source ids are generic ("p-1".."p-193") and would collide with other
    // layouts' bare ids (e.g. dokiparru's "p-001") without a prefix. The
    // Mandira map app itself reports this same "mnd-" prefix on every
    // merit-map-select / merit-map-book message (see its DxfCanvas.tsx
    // EXTERNAL_ID_PREFIX), so map clicks and bookings resolve to the real
    // backend MapPlot row.
    idPrefix: 'mnd-',
    // Same world-unit calibration as vinfra (1 world unit = 0.25 ft, from
    // tools/rebuild.mjs' `areaSqYd = area / 144`): `areaSqYd` is the
    // verified square-yard figure from the drawing's printed schedule.
    areaField: 'areaSqYd',
  },
];

async function seedLayout(config) {
  if (!fs.existsSync(config.mappingPath)) {
    console.warn(`[${config.key}] mapping not found, skipping: ${config.mappingPath}`);
    return null;
  }
  // eslint-disable-next-line global-require, import/no-dynamic-require
  const mapping = require(config.mappingPath);
  if (!Array.isArray(mapping) || !mapping.length) {
    console.warn(`[${config.key}] mapping is empty, skipping.`);
    return null;
  }

  const property = await layoutPropertyService.ensureProperty(config.key);
  const phased = assignPlotPhases(mapping, config.forcePhase ? { phase: config.forcePhase } : {});
  const items = phased.map((plot) => ({
    externalId: `${config.idPrefix}${plot.id}`,
    plotNo: toSeriesPlotNo(plot.phase, plot.plotNumber),
    phase: plot.phase,
    plotArea: Math.round(Number(plot[config.areaField || 'area'] || 0) * 100) / 100,
    status: 'available',
    propertyId: property.id,
  }));

  const p1 = items.filter((i) => i.phase === 1).length;
  const p2 = items.filter((i) => i.phase === 2).length;
  console.log(`[${config.key}] Seeding ${items.length} map plots (Phase 1: ${p1}, Phase 2: ${p2})…`);
  const result = await mapBookingService.seedPlots(items, { layout: config.key });
  console.log(`[${config.key}] Done:`, result);
  return result;
}

async function main() {
  const requested = process.argv[2];
  const configs = requested
    ? LAYOUTS.filter((c) => c.key === requested)
    : LAYOUTS;
  if (!configs.length) {
    throw new Error(`Unknown layout '${requested}'. Known: ${LAYOUTS.map((c) => c.key).join(', ')}`);
  }
  for (const config of configs) {
    await seedLayout(config);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});