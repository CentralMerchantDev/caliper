// BOARD-CONVERSION-PLAN.md P0.3 -- run verifyAllRoadKit() and report, per
// piece: does it build, is its footprint a whole number of ATOMS (whole
// metres), do its sockets sit on whole-metre positions. Every piece named,
// none silently skipped.
//
// UPDATED FOR PLACEMENT-CONTRACT.md PART 0 (Mark, 2026-09-07): the grid's
// addressing unit is the 1 m ATOM, not the old 8 m CELL. This script
// originally checked 8 m/4 m alignment and required P0.4's snapCellsOutward
// to pass; that snap is reverted (see roadkit.js), footprints are back to
// their real ROAD_STANDARDS values, and this script now checks the unit
// that actually governs placement.
//
// Run: node scripts/verify-roadkit.mjs
import * as RK from "../public/roadkit.js";

const ATOM = 1; // public/grid.js's new ATOM -- the real addressing unit (PLACEMENT-CONTRACT.md Part 0)

// One representative instance per exported piece builder, using each
// function's own defaults where sensible so this stays in sync with the
// kit rather than re-deciding parameters here. bridgeSpan and bridgeChain
// take positional geometry, not a road class, so they get concrete sample
// values matching roadkit.js's own self-test block at the bottom of the file.
const instances = [
  ["straight", () => RK.straight("FREEWAY", 1)],
  ["straight", () => RK.straight("BOULEVARD", 1)],
  ["straight", () => RK.straight("AVENUE", 1)],
  ["straight", () => RK.straight("STREET", 1)],
  ["straight", () => RK.straight("LANE", 1)],
  ["straight", () => RK.straight("ALLEY", 1)],
  ["curve", () => RK.curve("STREET", 32, 90)],
  ["junction", () => RK.junction()],
  ["roundabout", () => RK.roundabout()],
  ["rampMerge", () => RK.rampMerge("FREEWAY", "right")],
  ["rampDiverge", () => RK.rampDiverge("FREEWAY", "right")],
  ["slipLane", () => RK.slipLane("BOULEVARD", "AVENUE")],
  ["medianBreak", () => RK.medianBreak("BOULEVARD")],
  ["turningPocket", () => RK.turningPocket("AVENUE", "left")],
  ["turningHead", () => RK.turningHead("STREET", "bulb")],
  ["busBay", () => RK.busBay("STREET")],
  ["layby", () => RK.layby("AVENUE")],
  ["crossing", () => RK.crossing("zebra", "STREET")],
  ["levelCrossing", () => RK.levelCrossing("STREET")],
  ["gradeSeparation", () => RK.gradeSeparation("rail-over-road", "AVENUE")],
  ["bridgeArch", () => RK.bridgeArch("AVENUE", 64, 16)],
  ["bridgeCableStayed", () => RK.bridgeCableStayed("BOULEVARD", 160, 54)],
  ["bridgeSpan", () => RK.bridgeSpan({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 120 }, { roadClass: "AVENUE" })],
  ["bridgePier", () => RK.bridgePier(12.0, "AVENUE")],
  ["bridgeAbutment", () => RK.bridgeAbutment("AVENUE", 6.0)],
  ["bridgeDeckSpan", () => RK.bridgeDeckSpan(32, "AVENUE")],
  ["bridgeApproachRamp", () => RK.bridgeApproachRamp(6.0, "AVENUE")],
  ["causeway", () => RK.causeway("FREEWAY", 2)],
  ["railStraight", () => RK.railStraight(1)],
  ["railPlatform", () => RK.railPlatform(2)],
  ["railSwitch", () => RK.railSwitch("right")],
  ["intersection4Way", () => RK.intersection4Way("STREET", "STREET")],
  ["intersection3Way", () => RK.intersection3Way("AVENUE", "STREET", 90)],
  ["roundaboutModern", () => RK.roundaboutModern(1, "AVENUE", 4)],
];

function nearMultiple(v, step, eps = 1e-6) {
  const r = v / step;
  return Math.abs(r - Math.round(r)) < eps;
}

// STILL OPEN AT 1 M: railSwitch's diverging-route socket sits at a genuine
// 3.2 m track-gauge-derived offset -- not a whole metre either. rampMerge
// and rampDiverge's own angled sockets DO land exactly at 1 m (their
// offset is half the sum of two whole-metre ROAD_STANDARDS values) and are
// no longer listed here -- see roadkit.js's own comments at each. Named
// directly in roadkit.js at the point of definition; listed here too so
// this report doesn't read it as an unexplained regression. Not silently
// skipped -- still printed, just not counted as a build-breaking failure.
const KNOWN_OPEN_SOCKET_FINDINGS = new Set(["rail-switch-right"]);

const rows = [];
for (const [family, make] of instances) {
  let model;
  let buildError = null;
  try {
    model = make();
    if (model && model.ok === false) {
      buildError = `refused: ${model.refusal}`;
    }
  } catch (e) {
    buildError = e.message;
  }

  if (buildError) {
    rows.push({ family, id: "(build failed)", builds: false, buildError, footprintOk: null, footprint: null, socketsOk: null, badSockets: null });
    continue;
  }

  let geomError = null;
  try {
    for (const l of model.lod) l.createGeometry(RK.THREE || undefined);
  } catch (e) {
    // createGeometry's default T=THREE param needs the module's own THREE if
    // not supplied -- re-try letting the function use its own default.
    try {
      for (const l of model.lod) l.createGeometry();
    } catch (e2) {
      geomError = e2.message;
    }
  }

  const footprintOk = nearMultiple(model.footprint.w, ATOM) && nearMultiple(model.footprint.d, ATOM);

  const badSockets = (model.sockets || []).filter(
    (s) => !nearMultiple(s.at[0], ATOM) || !nearMultiple(s.at[2], ATOM)
  );

  rows.push({
    family,
    id: model.id,
    builds: !geomError,
    buildError: geomError,
    footprintOk,
    footprint: model.footprint,
    socketsOk: badSockets.length === 0,
    badSockets: badSockets.map((s) => `[${s.at[0]}, ${s.at[2]}]`),
  });
}

console.log(`${"id".padEnd(42)} builds  footprint(m, whole atoms?)  sockets`);
console.log("-".repeat(100));
let failCount = 0;
let openCount = 0;
for (const r of rows) {
  const isKnownOpen = KNOWN_OPEN_SOCKET_FINDINGS.has(r.id) && r.builds && r.footprintOk !== false;
  const buildsCol = r.builds ? "yes" : "NO";
  const footCol = r.footprintOk === null ? "-" : r.footprintOk ? `yes (${r.footprint.w}x${r.footprint.d})` : `NO (${r.footprint.w}x${r.footprint.d}m)`;
  const sockCol = r.socketsOk === null ? "-" : r.socketsOk ? "yes" : `${isKnownOpen ? "OPEN" : "NO"} (${r.badSockets.join(", ")})`;
  const failed = !r.builds || r.footprintOk === false || (r.socketsOk === false && !isKnownOpen);
  if (failed) failCount++;
  else if (isKnownOpen && r.socketsOk === false) openCount++;
  const mark = failed ? "✗ " : isKnownOpen && r.socketsOk === false ? "○ " : "✓ ";
  console.log(`${mark + r.id.padEnd(40)} ${buildsCol.padEnd(7)} ${footCol.padEnd(22)} ${sockCol}`);
  if (r.buildError) console.log(`    error: ${r.buildError}`);
}
console.log("-".repeat(100));
console.log(`${rows.length} pieces checked, ${failCount} failing, ${openCount} named open findings (angled connector sockets -- see roadkit.js).`);
console.log(`\nNote: bridgeChain() is excluded -- it returns a chain PLAN of abutment/pier/span`);
console.log(`references (type/at/length), not a single model with its own footprint/sockets.`);
process.exit(failCount ? 1 : 0);
