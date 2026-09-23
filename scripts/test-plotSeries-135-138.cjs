'use strict';

/**
 * Regression guard for the toSeriesPlotNo() 135-138 boundary bug.
 *
 * Anne Enclave Phase 2 series numbers 135-272 overlap the legacy internal
 * range 1-138 at 135-138. toSeriesPlotNo() must treat an input already in
 * the series range as-is, never re-offset it by +134.
 *
 * Usage: node scripts/test-plotSeries-135-138.cjs
 */
const assert = require('assert');
const { toSeriesPlotNo, toInternalPlotNo } = require('../utils/plotSeries');

const cases = [
  // [phase, input, expectedSeries]
  [1, 1, '1'],
  [1, 50, '50'],
  [1, 134, '134'],
  [2, 1, '135'],
  [2, 50, '184'],
  [2, 134, '268'],
  [2, 135, '135'], // boundary: must stay 135, not become 269
  [2, 136, '136'], // boundary: must stay 136, not become 270
  [2, 137, '137'], // boundary: must stay 137, not become 271
  [2, 138, '138'], // boundary: must stay 138, not become 272
  [2, 139, '139'],
  [2, 200, '200'],
  [2, 272, '272'],
];

let failures = 0;
for (const [phase, input, expected] of cases) {
  const actual = toSeriesPlotNo(phase, input);
  const ok = actual === expected;
  if (!ok) failures += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'} toSeriesPlotNo(${phase}, ${input}) = ${actual} (expected ${expected})`);
}

// toInternalPlotNo was already correctly ordered; confirm the fix left it alone.
const internalCases = [
  [2, 135, '1'],
  [2, 136, '2'],
  [2, 137, '3'],
  [2, 138, '4'],
  [2, 272, '138'],
];
for (const [phase, input, expected] of internalCases) {
  const actual = toInternalPlotNo(phase, input);
  const ok = actual === expected;
  if (!ok) failures += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'} toInternalPlotNo(${phase}, ${input}) = ${actual} (expected ${expected})`);
}

if (failures > 0) {
  console.error(`\n${failures} case(s) FAILED.`);
  process.exit(1);
}
console.log('\nAll cases PASSED.');
