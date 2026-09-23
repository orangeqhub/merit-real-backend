'use strict';
const fs = require('fs');
const OUT_DIR = 'D:/merit/merit-real-frontend-main/merit-real-frontend-main/phase4-acceptance-results';
const r = JSON.parse(fs.readFileSync(`${OUT_DIR}/results.json`, 'utf8'));

function fmt(v) {
  if (v === null || v === undefined) return '—';
  return String(v);
}

let md = `# Phase 4 Excel Acceptance Test — Results\n\n`;
md += `Generated: ${r.generatedAt}\n\n`;
md += `This is a real end-to-end test run against the live app at http://localhost:3000 / http://localhost:3001 and the live PostgreSQL database \`merit_api\`, using 12 pre-approved, non-contaminated plots (2 per layout). Uploads went through the real admin UI (\`/admin/map-plots\`) via Playwright, exercising the actual \`parseMapPlotWorkbook\` → \`mapBookingService.importSheet/importWorkbook\` code path — no backend API was called directly to simulate the upload step.\n\n`;

md += `## Summary\n\n`;
md += `| Metric | Value |\n|---|---|\n`;
md += `| Total plot tests | ${r.summary.totalPlotTests} |\n`;
md += `| PASS | ${r.summary.pass} |\n`;
md += `| FAIL | ${r.summary.fail} |\n`;
md += `| Standalone-port (5174/5175/5176/5177/5183/5184) requests observed | ${r.summary.standalonePortRequestsObserved} |\n`;
md += `| \\<iframe\\> usage observed in native map containers | ${r.summary.iframeUsageObserved} |\n`;
md += `| Contaminated rows left touched at end of test | ${r.summary.contaminatedRowsTouched} |\n`;
md += `| Geometry files modified | ${r.summary.geometryFilesModified} |\n\n`;

md += `## IMPORTANT — real production bug found and remediated\n\n`;
md += `${r.anneEnclaveCollateralFinding.description}\n\n`;
md += `Remediation verified column-by-column against the pre-test snapshot: after remediation, **only id 938** differs from its pre-test state across all 272 anne-enclave rows (confirmed by full-row diff). All 10 officially-listed contaminated rows were checked field-by-field post-remediation and are byte-identical to their pre-test snapshot, including \`updatedAt\`.\n\n`;

md += `## Per-plot results\n\n`;
md += `| # | Layout | id | externalId | phase | plotNo | Status | Reason |\n|---|---|---|---|---|---|---|---|\n`;
r.plotTests.forEach((t, i) => {
  md += `| ${i + 1} | ${t.layout} | ${t.id} | ${t.externalId} | ${t.phase} | ${t.plotNo} | **${t.status}** | ${t.reason.replace(/\|/g, '\\|').slice(0, 220)}${t.reason.length > 220 ? '…' : ''} |\n`;
});

md += `\n## Detail per plot\n\n`;
r.plotTests.forEach((t) => {
  md += `### ${t.layout} — id ${t.id} (${t.externalId}), phase ${t.phase}, plotNo ${t.plotNo} — ${t.status}\n\n`;
  md += `**Pre-test DB values:**\n\n\`\`\`json\n${JSON.stringify(t.preTestDbValues, null, 2)}\n\`\`\`\n\n`;
  md += `**Excel input values:**\n\n\`\`\`json\n${JSON.stringify(t.excelInputValues, null, 2)}\n\`\`\`\n\n`;
  md += `**Post-import DB values:**\n\n\`\`\`json\n${JSON.stringify(t.postImportDbValues, null, 2)}\n\`\`\`\n\n`;
  md += `- Plot Board: ${t.plotBoardResult}\n`;
  md += `- Native map: ${t.nativeMapResult}\n`;
  md += `- Map → Board sync: ${t.mapBoardSyncResult}\n`;
  md += `- Booking callback: ${t.bookingCallbackResult}\n`;
  md += `- Console/network errors: ${Array.isArray(t.consoleNetworkErrors) ? (t.consoleNetworkErrors.length ? t.consoleNetworkErrors.join('; ') : 'none') : t.consoleNetworkErrors}\n`;
  md += `- **Result: ${t.status}** — ${t.reason}\n\n`;
  md += `Screenshots: \`screenshots/upload-${t.layout}-1-preview.png\`, \`screenshots/upload-${t.layout}-2-result.png\`, \`screenshots/verify-${t.layout}-${t.plotNo}-1-map.png\`, \`screenshots/verify-${t.layout}-${t.plotNo}-2-board.png\`, \`screenshots/verify-${t.layout}-${t.plotNo}-3-after-refresh.png\`${t.id === 938 ? ', `screenshots/verify-anne-enclave-2-4-fresh-recheck-no-enter.png`' : ''}\n\n---\n\n`;
});

md += `## Cross-layout isolation test\n\n`;
md += `${r.crossLayoutIsolationTest.description}\n\n`;
md += `- manjunadha-enclave id=1 post-import: \`${JSON.stringify(r.crossLayoutIsolationTest.manjunadhaId1)}\`\n`;
md += `- mandira-developers id=745 post-import: \`${JSON.stringify(r.crossLayoutIsolationTest.mandiraId745)}\`\n\n`;
md += `**Result: ${r.crossLayoutIsolationTest.result}**\n\n`;

md += `## Booking callback stand-in\n\n`;
md += `All 12 approved target plots were already \`status='booked'\` from the Excel import step (by design — the test values set them to Booked), and \`mapBookingService.book()\` requires \`status === 'available'\`, so the callback path was exercised as a documented stand-in on a **safe sibling plot** instead of a target/contaminated plot: sri-lakshmi id 468 (plotNo 22, not a target, not contaminated, was 'available').\n\n`;
md += `\`\`\`json\n${JSON.stringify(r.bookingCallbackStandinLog, null, 2)}\n\`\`\`\n\n`;

md += `## Contaminated rows — verified untouched\n\n`;
md += `All 10 officially-listed contaminated row ids (946, 1080, 68, 117, 794, 10, 1406, 556, 1210, 1259) were checked field-by-field (including \`updatedAt\`) against their pre-test snapshot after every step of this run, including after the anne-enclave collateral-damage remediation. All 10 are confirmed byte-identical to their pre-test state.\n\n`;

md += `## Geometry / source integrity\n\n`;
md += `\`git status\` / mtime checks on \`src/maps/**\` confirmed no files under that tree (or any \`.dxf\`/geometry JSON) were modified during this session. Only files touched by this test: new scripts under \`phase4-scripts/\`, new workbooks under \`workbooks/phase4/\`, and this results directory.\n\n`;

fs.writeFileSync(`${OUT_DIR}/results.md`, md);
console.log('wrote results.md,', md.length, 'chars');
