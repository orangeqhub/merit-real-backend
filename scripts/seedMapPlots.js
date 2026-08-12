'use strict';

/**
 * One-time / idempotent seed of MapPlots from the Omkareshwar plot mapping.
 * Usage: node scripts/seedMapPlots.js
 */
const path = require('path');
const mapBookingService = require('../services/mapBookingService');
const { assignPlotPhases } = require('../utils/plotPhases');
const { toSeriesPlotNo } = require('../utils/plotSeries');

async function main() {
  const candidates = [
    path.resolve(__dirname, '../../merit-map-layout/src/data/plotNumberMapping.json'),
    path.resolve(__dirname, '../../merit map layout/src/data/plotNumberMapping.json'),
  ];
  const mappingPath = candidates.find((p) => {
    try {
      require('fs').accessSync(p);
      return true;
    } catch {
      return false;
    }
  });
  if (!mappingPath) {
    throw new Error('plotNumberMapping.json not found next to merit-real-backend');
  }
  // eslint-disable-next-line import/no-dynamic-require, global-require
  const mapping = require(mappingPath);
  const phased = assignPlotPhases(Array.isArray(mapping) ? mapping : []);
  const items = phased.map((plot) => ({
    externalId: String(plot.id),
    plotNo: toSeriesPlotNo(plot.phase, plot.plotNumber),
    phase: plot.phase,
    plotArea: Math.round(Number(plot.area || 0) * 100) / 100,
    status: 'available',
  }));

  const p1 = items.filter((i) => i.phase === 1).length;
  const p2 = items.filter((i) => i.phase === 2).length;
  console.log(`Seeding ${items.length} map plots (Phase 1: ${p1}, Phase 2: ${p2})…`);
  const result = await mapBookingService.seedPlots(items);
  console.log('Done:', result);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
