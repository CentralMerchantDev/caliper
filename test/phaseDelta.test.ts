// =============================================================================
// PHASE DELTA GATE (docs/audits/VISUAL-RUN-VERIFICATION.md §Root Cause)
//
// Every visual phase must produce a measured delta against the previous phase.
// An unchanged world that only checks ceiling budgets (e.g. < 12M tris) cannot
// catch a phase that did nothing. This test enforces that any completed phase
// must have a measurable change in its primary metric, measured directly from
// live code and assets rather than hand-typed literals.
// =============================================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { FACADE_FAMILIES, generateFacadeAtlas } from "../public/facade-textures.js";
// public/prop-models.js quarantined, 2026-09-13, board takedown (Mark's
// ruling: "the b1-board board code is not a foundation... it comes out";
// _TO-DELETE/b1-board/) -- measureLiveProps below needed propGeometry/
// disposePropGeometry; see the BLOCKED test that used to call it.

export interface PhaseMeasurement {
  phase: string;
  status: string;
  distinctTris?: number;
  drawnTris?: number;
  textureCount?: number;
  propTris?: number;
}

/**
 * Committed baseline measurements from PART 0 (2026-09-06 baseline).
 */
export const BASELINE_V0: PhaseMeasurement = {
  phase: "V0",
  status: "BASELINE",
  distinctTris: 153060,
  drawnTris: 6886892,
  textureCount: 0,
  propTris: 200, // Baseline: ~12-40 tri boxes per prop (~200 tris total)
};

// public/city-plan.js, public/layout.js and public/layout-fits.js are
// quarantined, 2026-09-13, Phase 1 "take it all down"
// (docs/specs/PHASE1-TAKEDOWN-PLAN-2026-09-13.md) -- measureLiveLayoutGeometry
// below needed generateWorld/planCity/makeFits/groupByVariant; see the
// BLOCKED test that used to call it.

// measureLiveProps (and its only caller, the V2 test below) removed,
// 2026-09-13, board takedown -- it called propGeometry/disposePropGeometry
// from public/prop-models.js, now quarantined, and nothing outside this
// file imported it either.

/**
 * Measures live texture atlas count and PBR map validity directly from facade-textures.js.
 */
export function measureLiveTextures(): number {
  const families = Object.keys(FACADE_FAMILIES);
  let validAtlases = 0;
  for (const fam of families) {
    const atlas = generateFacadeAtlas(fam, 256);
    if (atlas.map && atlas.normalMap && atlas.roughnessMap && atlas.emissiveMap) {
      validAtlases++;
    }
  }
  return validAtlases;
}

// measureLiveLayoutGeometry (and measureLiveGeometry/measureLiveDrawn, which
// only ever called it) removed, 2026-09-13, Phase 1 "take it all down"
// (docs/specs/PHASE1-TAKEDOWN-PLAN-2026-09-13.md) -- it called
// generateWorld/planCity/makeFits/groupByVariant, all quarantined, and
// nothing outside this file imported any of the three. See the BLOCKED
// test below, which used to call measureLiveLayoutGeometry directly.

/**
 * Validates that a phase claiming progress actually produced a non-zero delta
 * in measured geometry or assets compared to the baseline.
 */
export function verifyPhaseProgress(
  baseline: PhaseMeasurement,
  current: PhaseMeasurement,
  phaseType: "geometry" | "props" | "texture" | "lod"
): { valid: boolean; delta: number; reason?: string } {
  if (current.status.toLowerCase().includes("not started") || current.status.toLowerCase().includes("not passed")) {
    return { valid: true, delta: 0, reason: "Phase not claimed completed" };
  }

  let delta = 0;
  if (phaseType === "geometry") {
    const prev = baseline.distinctTris ?? 0;
    const now = current.distinctTris ?? 0;
    delta = Math.abs(now - prev);
    if (delta === 0) {
      return { valid: false, delta: 0, reason: `Phase ${current.phase} claims completion but distinctTris did not move (${prev} -> ${now})` };
    }
  } else if (phaseType === "props") {
    const prev = baseline.propTris ?? 0;
    const now = current.propTris ?? 0;
    delta = Math.abs(now - prev);
    if (delta === 0) {
      return { valid: false, delta: 0, reason: `Phase ${current.phase} claims completion but propTris did not move (${prev} -> ${now})` };
    }
  } else if (phaseType === "texture") {
    const prev = baseline.textureCount ?? 0;
    const now = current.textureCount ?? 0;
    delta = Math.abs(now - prev);
    if (delta === 0) {
      return { valid: false, delta: 0, reason: `Phase ${current.phase} claims completion but textureCount did not move (${prev} -> ${now})` };
    }
  } else if (phaseType === "lod") {
    const prev = baseline.drawnTris ?? 0;
    const now = current.drawnTris ?? 0;
    delta = Math.abs(now - prev);
    if (delta === 0) {
      return { valid: false, delta: 0, reason: `Phase ${current.phase} claims completion but drawnTris did not move (${prev} -> ${now})` };
    }
  }

  return { valid: true, delta };
}

test("GATE DELIVERABLE: phase-delta gate trips on fake V2-through-V8 run state", () => {
  // The 6 unearned phases that were falsely reported with zero delta
  const unearnedRun: { measurement: PhaseMeasurement; type: "geometry" | "props" | "texture" | "lod" }[] = [
    { measurement: { phase: "V2", status: "PROVISIONAL", propTris: 200 }, type: "props" },
    { measurement: { phase: "V3", status: "PROVISIONAL", distinctTris: 153060 }, type: "geometry" },
    { measurement: { phase: "V4", status: "PROVISIONAL", distinctTris: 153060 }, type: "geometry" },
    { measurement: { phase: "V5", status: "PROVISIONAL", distinctTris: 153060 }, type: "geometry" },
    { measurement: { phase: "V6", status: "PROVISIONAL", distinctTris: 153060 }, type: "geometry" },
    { measurement: { phase: "V7", status: "PROVISIONAL", drawnTris: 6886892 }, type: "lod" },
  ];

  let trippedCount = 0;
  const failureReasons: string[] = [];

  for (const item of unearnedRun) {
    const result = verifyPhaseProgress(BASELINE_V0, item.measurement, item.type);
    if (!result.valid) {
      trippedCount++;
      failureReasons.push(result.reason!);
    }
  }

  // MUST trip exactly 6 times on the unearned V2-through-V8 run
  assert.strictEqual(trippedCount, 6, `Expected phase-delta gate to trip 6 times on unearned run, but tripped ${trippedCount} times`);
});

test("LIVE WORLD GATE: Phase V1 passes by measuring real live facade texture atlases", () => {
  const liveTextures = measureLiveTextures();
  assert.ok(liveTextures >= 4, `Live textures only measured ${liveTextures} atlases -- expected >= 4`);

  const result = verifyPhaseProgress(
    BASELINE_V0,
    { phase: "V1", status: "LANDED", textureCount: liveTextures },
    "texture"
  );
  assert.ok(result.valid, result.reason);
  assert.strictEqual(result.delta, liveTextures - BASELINE_V0.textureCount!);
});

// BLOCKED, 2026-09-13, board takedown (Mark's ruling: "the b1-board board
// code is not a foundation... it comes out"). measureLiveProps needed
// propGeometry/disposePropGeometry from public/prop-models.js, now
// quarantined to _TO-DELETE/b1-board/, and is removed (see comment above).
test("LIVE WORLD GATE: Phase V2 passes by measuring real live prop geometry", { skip: "BLOCKED: measureLiveProps needed public/prop-models.js, quarantined (see comment above)" }, () => {});

test("LIVE WORLD GATE: measureLiveGeometry and measureLiveDrawn measure real city building meshes", { skip: "BLOCKED: measureLiveLayoutGeometry needed generateWorld/planCity/groupByVariant, all quarantined (see comment above)" }, () => {});