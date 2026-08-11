'use strict';

/**
 * One-time / idempotent seed of MapPlots from the Omkareshwar plot mapping.
 * Usage: node scripts/seedMapPlots.js
 */
const path = require('path');
const mapBookingService = require('../services/mapBookingService');

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
  const items = (Array.isArray(mapping) ? mapping : []).map((plot) => ({
    externalId: String(plot.id),
    plotNo: String(plot.plotNumber),
    plotArea: Math.round(Number(plot.area || 0) * 100) / 100,
    status: 'available',
  }));

  console.log(`Seeding ${items.length} map plots…`);
  const result = await mapBookingService.seedPlots(items);
  console.log('Done:', result);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
