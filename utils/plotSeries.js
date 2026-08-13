'use strict';

/** Phase 1 uses plot numbers 1–134; Phase 2 uses 135–272 (138 plots). */
const PHASE1_MAX = 134;
const PHASE2_OFFSET = 134;
const PHASE2_SERIES_MIN = 135;
const PHASE2_SERIES_MAX = 272;
const PHASE2_INTERNAL_MAX = 138;

function parsePlotNumber(value) {
  const n = Number(String(value ?? '').replace(/[^\d.]/g, ''));
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
    if (n >= 1 && n <= PHASE2_INTERNAL_MAX) return String(n + PHASE2_OFFSET);
    if (n >= PHASE2_SERIES_MIN && n <= PHASE2_SERIES_MAX) return String(n);
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
};
