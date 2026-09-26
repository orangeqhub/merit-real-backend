'use strict';

/** Phase 1 uses plot numbers 1–134; Phase 2 uses 135–272 (138 plots). */
const PHASE1_MAX = 134;
const PHASE2_OFFSET = 134;
const PHASE2_SERIES_MIN = 135;
const PHASE2_SERIES_MAX = 272;
const PHASE2_INTERNAL_MAX = 138;

/**
 * Only a purely numeric plot number ("135", 135, "135.0") takes part in the
 * phase-series conversion. Composite labels such as Manjunadha's merged
 * "67&68" must pass through untouched -- stripping non-digits used to turn
 * it into "6768", a plot number that doesn't exist on the map.
 */
function parsePlotNumber(value) {
  const text = String(value ?? '').trim();
  if (!/^\d+(\.0+)?$/.test(text)) return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

function normalizePhase(phase) {
  return Number(phase) === 2 ? 2 : 1;
}

/**
 * Public / Excel plot number shown in UI and sheets.
 */
function toSeriesPlotNo(phase, plotNo) {
  const phaseNum = normalizePhase(phase);
  const n = parsePlotNumber(plotNo);
  if (n == null) return String(plotNo ?? '').trim();
  if (phaseNum === 2) {
    // 135-272 is already a valid series number; check this FIRST, since the
    // legacy internal range (1-138) overlaps it at 135-138 and would
    // otherwise wrongly re-offset an already-correct series number (e.g.
    // 136 -> 270 instead of staying 136). Mirrors toInternalPlotNo() below,
    // which already checks its series-range case first for the same reason.
    if (n >= PHASE2_SERIES_MIN && n <= PHASE2_SERIES_MAX) return String(n);
    if (n >= 1 && n <= PHASE2_INTERNAL_MAX) return String(n + PHASE2_OFFSET);
  }
  if (n >= 1 && n <= PHASE1_MAX) return String(n);
  return String(n);
}

/**
 * Legacy internal plot number stored before series renumbering (Phase 2 only).
 */
function toInternalPlotNo(phase, plotNo) {
  const phaseNum = normalizePhase(phase);
  const n = parsePlotNumber(plotNo);
  if (n == null) return String(plotNo ?? '').trim();
  if (phaseNum === 2) {
    if (n >= PHASE2_SERIES_MIN && n <= PHASE2_SERIES_MAX) return String(n - PHASE2_OFFSET);
    if (n >= 1 && n <= PHASE2_INTERNAL_MAX) return String(n);
  }
  return String(n);
}

/**
 * A Phase 2 sheet numbers its plots either 1–138 (the brochure's own
 * numbering) or 135–272 (series). 135–138 are valid in both, so a single
 * number can't tell them apart -- the sheet as a whole decides: any number
 * from 1 to 134 means the whole sheet uses 1–138 numbering.
 */
function phase2SheetUsesInternalNumbers(plotNos = []) {
  return plotNos.some((value) => {
    const n = parsePlotNumber(value);
    return n != null && n >= 1 && n <= PHASE1_MAX;
  });
}

/** Series plot number for one sheet row, given how that sheet is numbered. */
function toSeriesPlotNoInSheet(phase, plotNo, internalNumbering) {
  if (normalizePhase(phase) === 2 && internalNumbering) {
    const n = parsePlotNumber(plotNo);
    if (n != null && n >= 1 && n <= PHASE2_INTERNAL_MAX) return String(n + PHASE2_OFFSET);
  }
  return toSeriesPlotNo(phase, plotNo);
}

function seriesPlotNoCandidates(phase, plotNo) {
  const phaseNum = normalizePhase(phase);
  const raw = String(plotNo ?? '').trim();
  const series = toSeriesPlotNo(phaseNum, raw);
  const internal = toInternalPlotNo(phaseNum, raw);
  return [...new Set([raw, series, internal].filter(Boolean))];
}

module.exports = {
  PHASE1_MAX,
  PHASE2_OFFSET,
  PHASE2_SERIES_MIN,
  PHASE2_SERIES_MAX,
  toSeriesPlotNo,
  toInternalPlotNo,
  seriesPlotNoCandidates,
  phase2SheetUsesInternalNumbers,
  toSeriesPlotNoInSheet,
};
