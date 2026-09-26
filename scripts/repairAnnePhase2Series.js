'use strict';

/**
 * Repair Anne Enclave Phase 2 rows corrupted by the old toSeriesPlotNo()
 * 135-138 boundary bug (see scripts/test-plotSeries-135-138.cjs).
 *
 * Symptom (seen in production): Phase 2 plots 135-138 are missing and
 * 269-272 each appear twice. The verified Anne geometry
 * (frontend src/maps/anne-enclave/layouts/anne-enclave/plotNumberMapping.json)
 * gives Phase 2 internal plot numbers 1-4 to p-8..p-11 (series 135-138) and
 * internal 135-138 to p-268..p-271 (series 269-272). So p-8..p-11 are the
 * rows that were wrongly re-offset by +134.
 *
 * Only plotNo is changed; status, customer, pricing and bookings are kept.
 * A row is only touched when ALL of these hold:
 *   - layoutKey 'anne-enclave', phase 2, externalId in the map below,
 *   - its plotNo is exactly the corrupted value,
 *   - another Phase 2 row still holds that same plotNo (the true owner),
 *   - no Phase 2 row already holds the target plotNo.
 *
 * Usage:
 *   node scripts/repairAnnePhase2Series.js           # dry run (default)
 *   node scripts/repairAnnePhase2Series.js --apply   # write, in one transaction
 */
const { Op } = require('sequelize');
const { MapPlot, sequelize } = require('../models');

const LAYOUT_KEY = 'anne-enclave';
const REPAIRS = [
  { externalId: 'p-8', from: '269', to: '135' },
  { externalId: 'p-9', from: '270', to: '136' },
  { externalId: 'p-10', from: '271', to: '137' },
  { externalId: 'p-11', from: '272', to: '138' },
];

async function main() {
  const apply = process.argv.includes('--apply');
  console.log(`[repair-anne-p2] mode=${apply ? 'APPLY' : 'dry-run'}`);

  const changed = await sequelize.transaction(async (transaction) => {
    let count = 0;
    for (const fix of REPAIRS) {
      const row = await MapPlot.findOne({
        where: { layoutKey: LAYOUT_KEY, phase: 2, externalId: fix.externalId },
        transaction,
      });
      if (!row) {
        console.log(`  ${fix.externalId}: not found -- skip`);
        continue;
      }
      if (String(row.plotNo) !== fix.from) {
        console.log(`  ${fix.externalId}: plotNo is ${row.plotNo} (expected ${fix.from}) -- already fine, skip`);
        continue;
      }
      const owner = await MapPlot.findOne({
        where: { layoutKey: LAYOUT_KEY, phase: 2, plotNo: fix.from, id: { [Op.ne]: row.id } },
        transaction,
      });
      if (!owner) {
        console.log(`  ${fix.externalId}: no duplicate ${fix.from} exists -- not the known corruption, skip`);
        continue;
      }
      const taken = await MapPlot.findOne({
        where: { layoutKey: LAYOUT_KEY, phase: 2, plotNo: fix.to },
        transaction,
      });
      if (taken) {
        console.log(`  ${fix.externalId}: target ${fix.to} already used by ${taken.externalId} -- skip`);
        continue;
      }
      console.log(
        `  ${fix.externalId} (id ${row.id}, status ${row.status}): plotNo ${fix.from} -> ${fix.to}` +
          ` (true ${fix.from} stays on ${owner.externalId})`
      );
      if (apply) await row.update({ plotNo: fix.to }, { transaction });
      count += 1;
    }
    return count;
  });

  console.log(`[repair-anne-p2] ${apply ? 'updated' : 'would update'} ${changed} row(s).`);
  await sequelize.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
