'use strict';

/**
 * Assigns each plot to Phase 1 or Phase 2.
 *
 * If the mapping JSON already carries a `phase` field (1 or 2) — derived from
 * the official PDF layout — those values are used directly.  Otherwise the
 * function falls back to the original X-coordinate heuristic (west → Phase 1,
 * east → Phase 2).
 */
function assignPlotPhases(plots) {
  const hasExplicitPhases = (plots || []).some(
    (p) => p.phase === 1 || p.phase === 2
  );

  if (hasExplicitPhases) {
    return (plots || [])
      .filter((p) => p.phase === 1 || p.phase === 2)
      .map((p) => ({ ...p, phase: p.phase }))
      .sort((a, b) => {
        if (a.phase !== b.phase) return a.phase - b.phase;
        return Number(a.plotNumber) - Number(b.plotNumber);
      });
  }

  const byNumber = new Map();
  for (const plot of plots || []) {
    const num = Number(plot.plotNumber);
    if (!Number.isFinite(num) || num < 1) continue;
    const list = byNumber.get(num) || [];
    list.push(plot);
    byNumber.set(num, list);
  }

  const phase1 = [];
  const phase2 = [];
  const singles = [];

  for (const list of byNumber.values()) {
    const sorted = [...list].sort((a, b) => {
      const dx = Number(a.center?.x) - Number(b.center?.x);
      if (dx !== 0) return dx;
      return Number(a.center?.y) - Number(b.center?.y);
    });
    if (sorted.length >= 2) {
      phase1.push(sorted[0]);
      phase2.push(sorted[sorted.length - 1]);
    } else if (sorted[0]) {
      singles.push(sorted[0]);
    }
  }

  const medX =
    phase1.length > 0
      ? [...phase1.map((p) => Number(p.center?.x) || 0)].sort((a, b) => a - b)[
          Math.floor(phase1.length / 2)
        ]
      : 0;

  for (const plot of singles) {
    const x = Number(plot.center?.x) || 0;
    if (x <= medX) phase1.push(plot);
    else phase2.push(plot);
  }

  return [
    ...phase1.map((p) => ({ ...p, phase: 1 })),
    ...phase2.map((p) => ({ ...p, phase: 2 })),
  ];
}

module.exports = { assignPlotPhases };
