// The criteria dry-run validator: executed and measured against real
// historical data during this project's diagnostic work (33% of criteria
// under the OLD schema were vacuous -- already true on baseline, testing
// nothing), but never actually committed to the codebase before tonight.
// BUILD-WORLD.md says "keep" it; grounding against the actual repo found
// it didn't exist yet to keep -- so this is that validator, built for
// real, adapted to the new restricted criterion kinds (src/criteria.ts).
//
// What "vacuous" means changed with the schema. Under the old numeric
// criteria, vacuous meant "the exact computed value already matches on
// baseline." Under existence/structural criteria, it means the asserted
// condition (a field exists, a type holds, a count is met) is ALREADY true
// on the unmodified baseline -- so the criterion can never distinguish
// "the change worked" from "nothing happened at all."
import { STATIONS, ENTITY_TYPES } from "./worldStructure";
import type { ProposedCriterion } from "./criteria";

export type DryRunVerdict = { verdict: "valid"; reason: string } | { verdict: "invalid"; reason: string };

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

/**
 * Runs one criterion's EXISTENCE/STRUCTURAL condition against the baseline
 * source and classifies it. Baseline functions are passed in directly
 * (Record<string, Function>) -- callers get these from the sandbox or, for
 * local/dev use, a plain Node import of the baseline module (see
 * test/criteriaDryRun.test.ts for both).
 */
export function dryRunCriterion(criterion: ProposedCriterion, baselineFns: Record<string, (...args: unknown[]) => unknown>): DryRunVerdict {
  switch (criterion.kind) {
    case "existence": {
      const fn = baselineFns[criterion.fn];
      if (typeof fn !== "function") {
        // The function doesn't exist on baseline at all -- expected and
        // fine when the plan is about to ADD it; that's what makes this a
        // real assertion about new behaviour, not a defect. See
        // criteria.ts's own note: unlike the old schema, this isn't
        // rejected as malformed, because existence criteria exist
        // specifically to describe things baseline doesn't have yet.
        return { verdict: "valid", reason: `fn "${criterion.fn}" does not exist on baseline -- a real assertion about new behaviour` };
      }
      let result: unknown;
      try {
        result = fn(...criterion.args);
      } catch (e) {
        return { verdict: "invalid", reason: `malformed: throws when called against baseline (${String((e as Error)?.message ?? e)})` };
      }
      if (criterion.field === null) {
        return { verdict: "invalid", reason: `fn "${criterion.fn}" already exists and is callable on baseline -- tests nothing` };
      }
      const { present } = getField(result, criterion.field);
      return present
        ? { verdict: "invalid", reason: `field "${criterion.field}" already present on baseline's result -- tests nothing` }
        : { verdict: "valid", reason: `field "${criterion.field}" is absent on baseline -- a real assertion about new behaviour` };
    }

    case "structural": {
      const fn = baselineFns[criterion.fn];
      if (typeof fn !== "function") return { verdict: "valid", reason: `fn "${criterion.fn}" does not exist on baseline -- a real assertion about new behaviour` };
      let result: unknown;
      try {
        result = fn(...criterion.args);
      } catch (e) {
        return { verdict: "invalid", reason: `malformed: throws when called against baseline (${String((e as Error)?.message ?? e)})` };
      }
      const { present, value } = getField(result, criterion.field);
      if (criterion.check === "type") {
        const holds = present && typeMatches(value, criterion.expectedType!);
        return holds
          ? { verdict: "invalid", reason: `field "${criterion.field}" already has type "${criterion.expectedType}" on baseline -- tests nothing` }
          : { verdict: "valid", reason: `field "${criterion.field}" does not already have type "${criterion.expectedType}" on baseline -- a real assertion` };
      }
      // minCount
      const count = Array.isArray(value) ? value.length : present ? 1 : 0;
      const holds = count >= (criterion.minCount ?? 0);
      return holds
        ? { verdict: "invalid", reason: `field "${criterion.field}" already has count ${count} >= ${criterion.minCount} on baseline -- tests nothing` }
        : { verdict: "valid", reason: `field "${criterion.field}" has count ${count} < ${criterion.minCount} on baseline -- a real assertion` };
    }

    case "non-regression": {
      const fn = baselineFns[criterion.fn];
      if (typeof fn !== "function") return { verdict: "invalid", reason: `malformed: fn "${criterion.fn}" does not exist on baseline -- a non-regression check needs baseline behaviour to compare against` };
      try {
        let actual: unknown = criterion.args[0];
        const rest = criterion.args.slice(1);
        const times = criterion.repeat && criterion.repeat > 0 ? criterion.repeat : 1;
        for (let i = 0; i < times; i++) actual = fn(actual, ...rest);
      } catch (e) {
        return { verdict: "invalid", reason: `malformed: throws when called against baseline (${String((e as Error)?.message ?? e)})` };
      }
      return { verdict: "valid", reason: "runs cleanly against baseline -- its expected value will be computed by running baseline again at verification time, never model-supplied" };
    }

    case "render": {
      const known = [...STATIONS.map((s) => s.key), ...ENTITY_TYPES];
      if (!known.includes(criterion.stationOrEntityKey)) {
        // Not vacuous -- a render criterion about something that doesn't
        // exist yet is exactly the expected shape for a plan adding a new
        // station/entity. Flagged as informational, not rejected.
        return { verdict: "valid", reason: `"${criterion.stationOrEntityKey}" is not a known station/entity yet -- a real assertion the renderer must support it after this change` };
      }
      return { verdict: "valid", reason: `"${criterion.stationOrEntityKey}" is an existing station/entity -- a legitimate render-regression check, not vacuous by construction` };
    }
  }
}

export function dryRunCriteria(
  criteria: ProposedCriterion[],
  baselineFns: Record<string, (...args: unknown[]) => unknown>,
): { criterion: ProposedCriterion; verdict: DryRunVerdict }[] {
  return criteria.map((criterion) => ({ criterion, verdict: dryRunCriterion(criterion, baselineFns) }));
}
