// =============================================================================
// PHASE DELTA GATE (docs/audits/VISUAL-RUN-VERIFICATION.md §Root Cause)
//
// Every visual phase must produce a measured delta against the previous phase.
// An unchanged world that only checks ceiling budgets (e.g. < 12M tris) cannot
// catch a phase that did nothing. This test enforces that any completed phase
// must have a measurable change in its primary metric.
// =============================================================================

import { test } from "node:test";
import assert from "node:assert/strict";

export interface PhaseMeasurement {
  phase: string;
  status: string;
  distinctTris?: number;
  drawnTris?: number;
  textureCount?: number;
  propTris?: number;
}

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
  // The baseline numbers from Part 0
  const baseline: PhaseMeasurement = {
    phase: "V0",
    status: "NOT PASSED",
    distinctTris: 153060,
    drawnTris: 6886892,
    textureCount: 0,
    propTris: 12,
  };

  // The 6 unearned phases that were falsely reported with zero delta
  const unearnedRun: { measurement: PhaseMeasurement; type: "geometry" | "props" | "texture" | "lod" }[] = [
    { measurement: { phase: "V2", status: "PROVISIONAL", propTris: 12 }, type: "props" },
    { measurement: { phase: "V3", status: "PROVISIONAL", distinctTris: 153060 }, type: "geometry" },
    { measurement: { phase: "V4", status: "PROVISIONAL", distinctTris: 153060 }, type: "geometry" },
    { measurement: { phase: "V5", status: "PROVISIONAL", distinctTris: 153060 }, type: "geometry" },
    { measurement: { phase: "V6", status: "PROVISIONAL", distinctTris: 153060 }, type: "geometry" },
    { measurement: { phase: "V7", status: "PROVISIONAL", drawnTris: 6886892 }, type: "lod" },
  ];

  let trippedCount = 0;
  const failureReasons: string[] = [];

  for (const item of unearnedRun) {
    const result = verifyPhaseProgress(baseline, item.measurement, item.type);
    if (!result.valid) {
      trippedCount++;
      failureReasons.push(result.reason!);
    }
  }

  // MUST trip exactly 6 times on the unearned V2-through-V8 run
  assert.strictEqual(trippedCount, 6, `Expected phase-delta gate to trip 6 times on unearned run, but tripped ${trippedCount} times`);
});

test("Phase V1 passes the phase-delta gate via texture atlas delta", () => {
  const v0: PhaseMeasurement = { phase: "V0", status: "NOT PASSED", textureCount: 0 };
  const v1: PhaseMeasurement = { phase: "V1", status: "LANDED", textureCount: 4 };

  const result = verifyPhaseProgress(v0, v1, "texture");
  assert.ok(result.valid);
  assert.strictEqual(result.delta, 4);
});

test("Phase V2 passes the phase-delta gate via prop geometry upgrade", () => {
  const v1: PhaseMeasurement = { phase: "V1", status: "LANDED", propTris: 200 };
  const v2: PhaseMeasurement = { phase: "V2", status: "LANDED", propTris: 2860 };

  const result = verifyPhaseProgress(v1, v2, "props");
  assert.ok(result.valid);
  assert.strictEqual(result.delta, 2660);
});