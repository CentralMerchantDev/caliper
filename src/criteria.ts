// CALIPER world-build (BUILD-WORLD.md, chunk 6): "The change that matters
// most. Enforce it in the schema, not the prompt."
//
// Root cause, established across this project's own evidence trail: the old
// ProposedCriterion let the plan stage assert an arbitrary computed value --
// "applyAction(...) === { money: 95, hunger: 55 }" -- derived from hand-doing
// multi-step arithmetic in one shot, with no execution to check its own
// work. Eleven of sixteen historical refusals traced to exactly this: a
// criterion whose asserted number contradicted the plan's own stated
// mechanism. That defect class is now impossible to EXPRESS, not just
// discouraged: there is no field anywhere in this file's types or JSON
// Schema that can carry a model-supplied "expected value". A criterion can
// only assert that something EXISTS, has the right SHAPE, or renders
// without throwing -- never a specific number a model computed by hand.
//
// "non-regression" is the one kind that still compares a call's result to
// a value -- but that value is never model-supplied. It's computed by
// actually running the BASELINE source at verification time (see
// resolveNonRegressionExpected below) -- the same "verify by running, not
// by reading" discipline as everything else in this project, applied to
// the criteria themselves.

export type CriterionKind = "existence" | "structural" | "non-regression" | "render";

export interface ExistenceCriterion {
  kind: "existence";
  description: string;
  fn: string;
  args: unknown[];
  /** Optional: a field that must be present (not undefined/null) on the
   * result. Omit to assert only that fn exists and is callable. */
  field: string | null;
}

export interface StructuralCriterion {
  kind: "structural";
  description: string;
  fn: string;
  args: unknown[];
  field: string; // dot-path into the result, e.g. "pets" or "pets.0.hunger"
  check: "typeCheck" | "minCount";
  expectedType: "string" | "number" | "boolean" | "array" | "object" | null; // required when check === "typeCheck"
  minCount: number | null; // required when check === "minCount"
}

export interface NonRegressionCriterion {
  kind: "non-regression";
  description: string;
  fn: string;
  args: unknown[];
  /** Call fn this many times, feeding each result back in as the next
   * call's first argument. The gap found auditing history: the old schema
   * had no way to express "tick 25 times, then check" -- the natural way
   * to test "unfed for too long" -- because only the hand-authored suite
   * had repeat. */
  repeat: number | null;
}

export interface RenderCriterion {
  kind: "render";
  description: string;
  /** Must name a real key from worldStructure.ts's STATIONS, or a new one
   * the plan's willBuild says it is adding -- checked against
   * worldStructure.ts, not asserted. */
  stationOrEntityKey: string;
}

export type ProposedCriterion = ExistenceCriterion | StructuralCriterion | NonRegressionCriterion | RenderCriterion;

// ---------------------------------------------------------------------
// The JSON Schema sent to the model. Flat (one object shape, fields for
// kinds that don't apply are required-but-nullable) rather than a
// discriminated anyOf -- structured-output APIs (Anthropic's included)
// have historically been fussy about polymorphic schemas; a flat shape
// with app-level validation (below) is the same enforcement without
// betting the whole guardrail on schema-union support nobody has tested
// yet. There is, on purpose, no "expected" or "expectedJson" field
// anywhere in this object -- that is the actual enforcement, not the enum.
// ---------------------------------------------------------------------
export const CRITERION_SCHEMA = {
  type: "object",
  properties: {
    kind: {
      type: "string",
      enum: ["existence", "structural", "non-regression", "render"],
      description:
        'What this criterion checks. "existence": a function/field exists and is callable. "structural": a field has the right type or count. ' +
        '"non-regression": a call\'s result is compared against the BASELINE\'s own output for the same call, computed by running it, never supplied by you. ' +
        '"render": a station/entity type draws without throwing. There is no way to assert a specific computed number here -- see the note above the criteria field.',
    },
    description: { type: "string" },
    fn: { type: ["string", "null"], description: "Function name to call. Required for existence/structural/non-regression, null for render." },
    argsJson: { type: ["string", "null"], description: "JSON-encoded array of arguments. Required for existence/structural/non-regression, null for render." },
    field: { type: ["string", "null"], description: "Dot-path field to check. Optional for existence, required for structural, null otherwise." },
    check: { type: ["string", "null"], enum: ["typeCheck", "minCount", null], description: "structural only." },
    expectedType: { type: ["string", "null"], enum: ["string", "number", "boolean", "array", "object", null], description: 'structural only, when check is "typeCheck".' },
    minCount: { type: ["number", "null"], description: 'structural only, when check is "minCount".' },
    repeat: { type: ["number", "null"], description: "non-regression only -- call fn this many times, chaining each result into the next call." },
    stationOrEntityKey: { type: ["string", "null"], description: "render only -- must name a real station/entity key." },
  },
  required: ["kind", "description", "fn", "argsJson", "field", "check", "expectedType", "minCount", "repeat", "stationOrEntityKey"],
  additionalProperties: false,
};

type RawCriterion = {
  kind?: unknown;
  description?: unknown;
  fn?: unknown;
  argsJson?: unknown;
  field?: unknown;
  check?: unknown;
  expectedType?: unknown;
  minCount?: unknown;
  repeat?: unknown;
  stationOrEntityKey?: unknown;
};

export type CriterionValidation = { valid: true; criterion: ProposedCriterion } | { valid: false; reason: string };

/**
 * The real enforcement -- schema-level rejection with a clear reason, per
 * BUILD-WORLD.md chunk 6. Never trusts the API's own schema adherence
 * alone (validate-before-consume): checks kind-specific shape, and
 * explicitly rejects anything that looks like it's trying to smuggle a
 * computed value in through a field this schema doesn't have (a `value`,
 * `expected`, or `result` key on the raw object, which the JSON Schema's
 * additionalProperties:false should already block at the API layer, but
 * this function doesn't assume that layer held).
 */
// Exact field names only -- NOT a prefix match. "expectedType" and
// "expected" both start with "expected", but only the latter is the old
// schema's computed-value field; a prefix match would reject every
// structural criterion for using its own legitimate field. Found the hard
// way: the first version of this check did exactly that (see test/
// criteria.test.ts's "does not false-positive on the real 'expectedType'
// field" guardrail, which failed against the prefix-match version).
const SMUGGLED_FIELD_NAMES = new Set(["expected", "expectedJson", "value", "result", "computed"]);

export function validateProposedCriterion(raw: RawCriterion & Record<string, unknown>): CriterionValidation {
  const smuggled = Object.keys(raw).find((k) => SMUGGLED_FIELD_NAMES.has(k));
  if (smuggled) return { valid: false, reason: `criterion has a field "${smuggled}" -- computed/expected values are not permitted in any criterion; describe existence, structure, or non-regression instead` };

  if (typeof raw.description !== "string" || raw.description.length === 0) return { valid: false, reason: "description is missing or empty" };
  const KNOWN_KINDS = ["existence", "structural", "non-regression", "render"];
  if (typeof raw.kind !== "string" || !KNOWN_KINDS.includes(raw.kind)) {
    return { valid: false, reason: `unknown kind "${String(raw.kind)}" -- must be one of ${KNOWN_KINDS.join(", ")}` };
  }

  let args: unknown[] = [];
  if (raw.kind !== "render") {
    if (typeof raw.fn !== "string" || raw.fn.length === 0) return { valid: false, reason: `criterion "${raw.description}": fn is required for kind "${raw.kind}"` };
    if (typeof raw.argsJson !== "string") return { valid: false, reason: `criterion "${raw.description}": argsJson is required for kind "${raw.kind}"` };
    try {
      args = JSON.parse(raw.argsJson);
    } catch (e) {
      return { valid: false, reason: `criterion "${raw.description}": argsJson is not valid JSON (${String(e)})` };
    }
    if (!Array.isArray(args)) return { valid: false, reason: `criterion "${raw.description}": argsJson must decode to an array` };
  }

  switch (raw.kind) {
    case "existence":
      return { valid: true, criterion: { kind: "existence", description: raw.description, fn: raw.fn as string, args, field: (raw.field as string) ?? null } };

    case "structural": {
      if (typeof raw.field !== "string" || raw.field.length === 0) return { valid: false, reason: `criterion "${raw.description}": structural requires a non-empty field` };
      if (raw.check !== "typeCheck" && raw.check !== "minCount") return { valid: false, reason: `criterion "${raw.description}": structural requires check to be "typeCheck" or "minCount"` };
      if (raw.check === "typeCheck") {
        const validTypes = ["string", "number", "boolean", "array", "object"];
        if (typeof raw.expectedType !== "string" || !validTypes.includes(raw.expectedType)) {
          return { valid: false, reason: `criterion "${raw.description}": structural check "typeCheck" requires expectedType to be one of ${validTypes.join(", ")}` };
        }
      }
      if (raw.check === "minCount") {
        if (typeof raw.minCount !== "number" || raw.minCount < 0) return { valid: false, reason: `criterion "${raw.description}": structural check "minCount" requires a non-negative minCount` };
      }
      return {
        valid: true,
        criterion: {
          kind: "structural",
          description: raw.description,
          fn: raw.fn as string,
          args,
          field: raw.field,
          check: raw.check,
          expectedType: raw.check === "typeCheck" ? (raw.expectedType as StructuralCriterion["expectedType"]) : null,
          minCount: raw.check === "minCount" ? (raw.minCount as number) : null,
        },
      };
    }

    case "non-regression": {
      if (raw.repeat !== null && raw.repeat !== undefined && (typeof raw.repeat !== "number" || raw.repeat < 1)) {
        return { valid: false, reason: `criterion "${raw.description}": repeat, if given, must be a positive number` };
      }
      return { valid: true, criterion: { kind: "non-regression", description: raw.description, fn: raw.fn as string, args, repeat: (raw.repeat as number) ?? null } };
    }

    case "render": {
      if (typeof raw.stationOrEntityKey !== "string" || raw.stationOrEntityKey.length === 0) {
        return { valid: false, reason: `criterion "${raw.description}": render requires a non-empty stationOrEntityKey` };
      }
      return { valid: true, criterion: { kind: "render", description: raw.description, stationOrEntityKey: raw.stationOrEntityKey } };
    }

    default:
      return { valid: false, reason: `criterion "${raw.description}": unknown kind "${String(raw.kind)}" -- must be existence, structural, non-regression, or render` };
  }
}

/** Human-readable rendering of one criterion, independent of its kind --
 * used everywhere a criterion needs to appear in a prompt or a UI (the
 * implement/fix prompts, Gate 1's conversation). Never prints a computed
 * value, because there isn't one to print. */
export function describeCriterion(c: ProposedCriterion): string {
  const call = (fn: string, args: unknown[]) => `${fn}(${args.map((a) => JSON.stringify(a)).join(", ")})`;
  switch (c.kind) {
    case "existence":
      return c.field
        ? `${c.description}: ${call(c.fn, c.args)} must have a present field "${c.field}"`
        : `${c.description}: ${call(c.fn, c.args)} -- ${c.fn} must exist and be callable`;
    case "structural":
      return c.check === "typeCheck"
        ? `${c.description}: ${call(c.fn, c.args)}.${c.field} must have type "${c.expectedType}"`
        : `${c.description}: ${call(c.fn, c.args)}.${c.field} must have count >= ${c.minCount}`;
    case "non-regression":
      return `${c.description}: ${call(c.fn, c.args)}${c.repeat ? ` repeated ${c.repeat}x` : ""} must match what the SAME call returns against the current baseline (computed by running it, not asserted)`;
    case "render":
      return `${c.description}: the renderer must draw "${c.stationOrEntityKey}" without throwing`;
  }
}

/** Validates a whole proposed criteria array, splitting into what passed
 * and what didn't with reasons -- the plan stage re-emits only the
 * rejected ones (BUILD-WORLD.md chunk 6: "Reject at schema validation with
 * a clear reason, and say so in the plan prompt"). */
export function validateProposedCriteria(raw: unknown[]): { accepted: ProposedCriterion[]; rejected: { raw: unknown; reason: string }[] } {
  const accepted: ProposedCriterion[] = [];
  const rejected: { raw: unknown; reason: string }[] = [];
  for (const r of raw) {
    const result = validateProposedCriterion(r as RawCriterion);
    if (result.valid) accepted.push(result.criterion);
    else rejected.push({ raw: r, reason: result.reason });
  }
  return { accepted, rejected };
}
