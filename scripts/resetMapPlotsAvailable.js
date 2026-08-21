'use strict';

/**
 * Reset every MapPlot to status 'available' and clear booking links.
 * Usage: node scripts/resetMapPlotsAvailable.js
 */
const { MapPlot } = require('../models');

async function main() {
  const [count] = await MapPlot.update(
    {
      status: 'available',
      customerId: null,
      customerName: null,
      bookingRequestId: null,
      bookedAt: null,
    },
    { where: {} }
  );
  console.log(`Reset ${count} map plot(s) to 'available'.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
