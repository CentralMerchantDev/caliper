// LAST.md item 1: "Enum value 'material' does not match declared type
// '['string', 'null']'" killed a real run four times overnight. This exact
// defect (Anthropic's structured-output validator rejects `enum` paired
// with a nullable `type` array, regardless of what the enum contains) was
// found and fixed once already in this build (src/criteria.ts's check/
// expectedType, both now anyOf) and reappeared in a second schema
// (src/worldEdit.ts's field) -- proof that finding it by hand doesn't
// work. This test walks every real schema this codebase sends to a model,
// recursively (a violation nested inside another schema, like
// CRITERION_SCHEMA embedded in PLAN_SCHEMA's criteria.items, would be
// invisible to a shallow top-level check), and makes the defect
// structurally impossible to ship again without a failing test.
import { test } from "node:test";
import assert from "node:assert/strict";

import { CODE_SCHEMA, ARTIFACT_SCHEMA, PLAN_SCHEMA, CHANGE_SCHEMA, RETROSPECTIVE_SCHEMA } from "../src/claude.ts";
import { CRITERION_SCHEMA } from "../src/criteria.ts";
import { GROUNDING_SCHEMA } from "../src/grounding.ts";
import { WORLD_EDIT_SCHEMA } from "../src/worldEdit.ts";

// Every schema this codebase actually passes as output_config.format.schema
// to a live model call -- src/openai.ts's review stage uses no schema (a
// grep for json_schema/output_config across src/ confirms these eight call
// sites and no others; re-check that grep if a new stage is ever added).
const ALL_SCHEMAS: Record<string, unknown> = {
  CODE_SCHEMA,
  ARTIFACT_SCHEMA,
  PLAN_SCHEMA,
  CHANGE_SCHEMA,
  RETROSPECTIVE_SCHEMA,
  CRITERION_SCHEMA,
  GROUNDING_SCHEMA,
  WORLD_EDIT_SCHEMA,
};

/** Recursively visits every object node in a JSON-Schema-shaped tree,
 * including ones reachable only through `items`, `properties`, `anyOf`,
 * or any other nested key -- a schema that embeds another schema (PLAN_SCHEMA
 * -> criteria.items -> CRITERION_SCHEMA) must have its nested nodes
 * checked too, not just its own top-level properties. */
function walkSchemaNodes(node: unknown, path: string, visit: (node: Record<string, unknown>, path: string) => void): void {
  if (node === null || typeof node !== "object") return;
  if (Array.isArray(node)) {
    node.forEach((item, i) => walkSchemaNodes(item, `${path}[${i}]`, visit));
    return;
  }
  const obj = node as Record<string, unknown>;
  visit(obj, path);
  for (const [key, value] of Object.entries(obj)) {
    walkSchemaNodes(value, `${path}.${key}`, visit);
  }
}

/** The actual rule: a node with an `enum` key whose `type` is an array
 * containing "null" is the exact shape Anthropic's structured-output
 * validator rejects. A nullable type array WITHOUT enum is fine (used
 * throughout these schemas for genuinely optional string/number fields);
 * a non-nullable enum (type: "string" + enum) is fine too (used for every
 * required discriminator field, e.g. WORLD_EDIT_SCHEMA's own `op`). Only
 * the combination is the defect. */
function findEnumNullableTypeArrayViolations(schema: unknown, schemaName: string): string[] {
  const violations: string[] = [];
  walkSchemaNodes(schema, schemaName, (node, path) => {
    if ("enum" in node && Array.isArray(node.type) && node.type.includes("null")) {
      violations.push(
        `${path}: enum combined with a nullable type array (type: ${JSON.stringify(node.type)}) -- ` +
          `Anthropic's structured-output validator rejects this regardless of what the enum contains. ` +
          `Use anyOf: [{ type: <the real type>, enum: [...] }, { type: "null" }] instead.`,
      );
    }
  });
  return violations;
}

test("no schema sent to a model combines enum with a nullable type array", () => {
  const allViolations: string[] = [];
  for (const [name, schema] of Object.entries(ALL_SCHEMAS)) {
    allViolations.push(...findEnumNullableTypeArrayViolations(schema, name));
  }
  assert.deepEqual(allViolations, [], `Found schema violation(s) -- this is the exact defect that killed a live run four times:\n${allViolations.join("\n")}`);
});

// The guardrail test itself needs a test: does the walker actually catch a
// real violation, or would it pass no matter what's fed to it? Planted
// directly, not discovered by re-running the pipeline -- same "prove the
// check can fail" discipline as every other guardrail test in this
// project.
test("guardrail: the walker actually fails on a planted violation, not just passing by construction", () => {
  const planted = {
    type: "object",
    properties: {
      bad: { type: ["string", "null"], enum: ["a", "b", null] },
    },
  };
  const violations = findEnumNullableTypeArrayViolations(planted, "PLANTED");
  assert.equal(violations.length, 1);
  assert.match(violations[0], /enum combined with a nullable type array/);
});

test("guardrail: a planted violation nested two levels deep (mirroring PLAN_SCHEMA -> criteria.items -> CRITERION_SCHEMA) is still caught", () => {
  const planted = {
    type: "object",
    properties: {
      outer: {
        type: "array",
        items: {
          type: "object",
          properties: {
            bad: { type: ["string", "null"], enum: ["x", "y", null] },
          },
        },
      },
    },
  };
  const violations = findEnumNullableTypeArrayViolations(planted, "PLANTED_NESTED");
  assert.equal(violations.length, 1);
  assert.match(violations[0], /PLANTED_NESTED\.properties\.outer\.items\.properties\.bad/);
});

test("control: a nullable type array WITHOUT enum is not flagged -- that shape is valid and used throughout these schemas", () => {
  const fine = { type: ["string", "null"], description: "no enum here" };
  assert.equal(findEnumNullableTypeArrayViolations(fine, "FINE").length, 0);
});

test("control: a non-nullable enum (type: 'string' + enum) is not flagged -- required discriminator fields use exactly this shape", () => {
  const fine = { type: "string", enum: ["a", "b"] };
  assert.equal(findEnumNullableTypeArrayViolations(fine, "FINE").length, 0);
});

test("control: the anyOf pattern that replaces the broken shape is not flagged", () => {
  const fine = { anyOf: [{ type: "string", enum: ["a", "b"] }, { type: "null" }] };
  assert.equal(findEnumNullableTypeArrayViolations(fine, "FINE").length, 0);
});
