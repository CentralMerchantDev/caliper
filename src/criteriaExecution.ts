// Turns a validated ProposedCriterion (src/criteria.ts) into a TestResult
// (src/types.ts) -- the same result shape the hand-authored regression
// suite already produces, so the rest of the pipeline (describeFailure,
// decideStillFailing, the event stream, the UI) needs no changes to
// consume criteria results.
//
// Split from the sandbox on purpose: this file never touches
// src/simSandbox.ts's Worker-Loader module string generation (the riskiest,
// least-testable-tonight part of the system). Instead it depends on a
// `ProbeRunner` -- "call this function with these args against some source,
// tell me what came back" -- injected by the caller. In production that's a
// thin wrapper around the existing, already-tested runSimTests. In tests
// it's a plain function. Same split as grounding.ts: the LOGIC is fully
// covered without a live sandbox; only the real runner needs one.
import type { TestResult } from "./types";
import type { ProposedCriterion } from "./criteria";
import { ENTITY_TYPES, objectTypeKeysFor } from "./worldStructure";

export interface ProbeResult {
  actual?: unknown;
  error?: string;
  stack?: string;
}

/** fn/args/repeat in, whatever the sandbox actually returns out -- no
 * pass/fail judgement here, that's this file's job, not the runner's. */
export type ProbeRunner = (fn: string, args: unknown[], repeat: number | null) => Promise<ProbeResult>;

function getField(obj: unknown, path: string): { present: boolean; value: unknown } {
  let cur: unknown = obj;
  for (const key of path.split(".")) {
    if (cur === null || typeof cur !== "object") return { present: false, value: undefined };
    const rec = cur as Record<string, unknown>;
    if (!(key in rec)) return { present: false, value: undefined };
    cur = rec[key];
  }
  return { present: cur !== undefined, value: cur };
}

function typeMatches(value: unknown, expected: string): boolean {
  if (expected === "array") return Array.isArray(value);
  if (expected === "object") return value !== null && typeof value === "object" && !Array.isArray(value);
  return typeof value === expected;
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (a === null || b === null || a === undefined || b === undefined) return false;
  if (typeof a !== typeof b) return false;
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((v, i) => deepEqual(v, (b as unknown[])[i]));
  }
  if (typeof a === "object") {
    const ak = Object.keys(a as object), bk = Object.keys(b as object);
    if (ak.length !== bk.length) return false;
    return ak.every((k) => deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
  }
  return false;
}

const NOT_DEFINED_MARKER = "is not defined in this source";

/**
 * Evaluates one criterion for real, against a candidate implementation
 * (via probeCandidate) and -- for "non-regression" only -- the baseline
 * (via probeBaseline), so the comparison value is computed by actually
 * RUNNING the baseline, never supplied by a model. "render" criteria are
 * checked structurally against worldStructure.ts only -- whether the
 * renderer actually draws without throwing is a client-side check (the
 * same weaker-evidence class as the existing DOM interaction checks;
 * genuinely wiring that is future work, noted honestly rather than faked
 * here).
 */
export async function evaluateCriterion(criterion: ProposedCriterion, probeCandidate: ProbeRunner, probeBaseline: ProbeRunner, candidateSource?: string): Promise<TestResult> {
  switch (criterion.kind) {
    case "existence": {
      const r = await probeCandidate(criterion.fn, criterion.args, null);
      if (r.error && r.error.includes(NOT_DEFINED_MARKER)) {
        return { name: criterion.description, pass: false, fn: criterion.fn, args: criterion.args, error: r.error };
      }
      if (r.error) return { name: criterion.description, pass: false, fn: criterion.fn, args: criterion.args, error: r.error, stack: r.stack };
      if (criterion.field === null) {
        return { name: criterion.description, pass: true, fn: criterion.fn, args: criterion.args, actual: r.actual, expected: `function "${criterion.fn}" exists and is callable` };
      }
      const { present } = getField(r.actual, criterion.field);
      return {
        name: criterion.description,
        pass: present,
        fn: criterion.fn,
        args: criterion.args,
        actual: r.actual,
        expected: `field "${criterion.field}" present on the result`,
      };
    }

    case "structural": {
      const r = await probeCandidate(criterion.fn, criterion.args, null);
      if (r.error) return { name: criterion.description, pass: false, fn: criterion.fn, args: criterion.args, error: r.error, stack: r.stack };
      const { present, value } = getField(r.actual, criterion.field);
      if (criterion.check === "typeCheck") {
        const pass = present && typeMatches(value, criterion.expectedType!);
        return { name: criterion.description, pass, fn: criterion.fn, args: criterion.args, actual: r.actual, expected: `field "${criterion.field}" has type "${criterion.expectedType}"` };
      }
      const count = Array.isArray(value) ? value.length : present ? 1 : 0;
      const pass = count >= (criterion.minCount ?? 1)   // `?? 0` was vacuously true, and now contradicts criteria.ts's minCount >= 1 rule;
      return { name: criterion.description, pass, fn: criterion.fn, args: criterion.args, actual: r.actual, expected: `field "${criterion.field}" has count >= ${criterion.minCount}` };
    }

    case "non-regression": {
      // Each probe is a Dynamic Worker invocation in production. Workers
      // permits only a small number of concurrent dynamic invocations per
      // request, so keep even the candidate/baseline pair sequential.
      const candidate = await probeCandidate(criterion.fn, criterion.args, criterion.repeat);
      const baseline = await probeBaseline(criterion.fn, criterion.args, criterion.repeat);
      if (candidate.error) return { name: criterion.description, pass: false, fn: criterion.fn, args: criterion.args, repeat: criterion.repeat ?? undefined, error: candidate.error, stack: candidate.stack };
      // The baseline itself failing to run means there is nothing real to
      // compare against -- fail closed, never treat "couldn't establish
      // the baseline" as "matches the baseline".
      if (baseline.error) {
        return { name: criterion.description, pass: false, fn: criterion.fn, args: criterion.args, repeat: criterion.repeat ?? undefined, error: `baseline comparison could not run: ${baseline.error}` };
      }
      return {
        name: criterion.description,
        pass: deepEqual(candidate.actual, baseline.actual),
        fn: criterion.fn,
        args: criterion.args,
        repeat: criterion.repeat ?? undefined,
        actual: candidate.actual,
        expected: baseline.actual,
      };
    }

    case "render": {
      // FOUNDATION.md item 1 found this checking only STATIONS + ENTITY_TYPES
      // -- an outdoor type like "lampPost" (no station, so never in
      // STATIONS) failed this check even though it's a perfectly real
      // registry type. OBJECT_TYPE_KEYS is the single list that answers
      // "can a placement of this type exist" -- stations and outdoor props
      // together, derived from the same real registry, so this can't drift
      // from what the renderer actually supports the way two separately
      // maintained lists could.
      // ...and judged against the CANDIDATE's registry, not the baseline's.
      // OBJECT_TYPE_KEYS is frozen at module load from the original world, so a
      // criterion naming a type this very change had just added failed, and one
      // naming a type it had just removed passed. Both are the check being
      // wrong about the thing it is checking.
      const known = [...objectTypeKeysFor(candidateSource), ...(ENTITY_TYPES as readonly string[])];
      const pass = known.includes(criterion.stationOrEntityKey);
      return {
        name: criterion.description + " (structural check only -- whether it actually draws without throwing is a client-side check, not run here)",
        pass,
        expected: `"${criterion.stationOrEntityKey}" is a known station/entity in worldStructure.ts`,
        actual: pass ? criterion.stationOrEntityKey : `not found among: ${known.join(", ")}`,
      };
    }
  }
}

export async function evaluateCriteria(criteria: ProposedCriterion[], probeCandidate: ProbeRunner, probeBaseline: ProbeRunner, candidateSource?: string): Promise<TestResult[]> {
  const results: TestResult[] = [];
  for (const criterion of criteria) {
    results.push(await evaluateCriterion(criterion, probeCandidate, probeBaseline, candidateSource));
  }
  return results;
}
