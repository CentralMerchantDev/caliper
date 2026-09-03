// A KEY WRITTEN TWICE IS A DECLARATION THAT LOST AN ARGUMENT WITH ITSELF.
//
// Three models in props.js -- satellite-dish, playground-swings and flagpole --
// carried their whole declaration block twice:
//
//     sweep: { w: 1.2, d: 1.4 },
//     height: 1.4,
//     clearance: 0.2,
//     origin: "base-centre",
//     standsOn: ["plot", "open"],
//     sweep: { w: 1.2, d: 1.4 },        <- again, verbatim
//     height: 1.4,
//     ...
//
// Measured: the pairs were byte-identical, so nothing rendered differently and
// no test could have failed. That is exactly why it needs a check of its own.
//
// WHY IT MATTERS ANYWAY, TWICE OVER
//
// 1. It printed about forty-five warning lines on every build and every test
//    run. A suite that shouts warnings nobody needs to read is how a warning
//    that DOES matter gets scrolled past. The cost was never the duplicate
//    key; it was the noise around it.
//
// 2. Identical today is not identical tomorrow. The next edit to one of those
//    models touches one copy, JavaScript silently keeps the LAST one, and a
//    model then declares a footprint its geometry was not built to. That is the
//    same class of defect as the bench drawn 2.2 m over a 1.8 m claim -- a
//    declaration and a reality quietly disagreeing -- and this file exists so
//    that one cannot arrive by accident.
//
// It is checked across every module rather than just props.js, because the
// pattern is a copy-paste one and copy-paste is not confined to one file.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import * as acorn from "acorn";

const PUBLIC = join(dirname(fileURLToPath(import.meta.url)), "..", "public");

/** Every hand-written module. vendor/ is other people's code, minified. */
function ourModules() {
  return readdirSync(PUBLIC)
    .filter((f) => f.endsWith(".js"))
    .filter((f) => !f.endsWith(".generated.js"))
    .sort();
}

/**
 * Duplicate non-computed data keys in one object literal.
 *
 * Deliberately NOT flagged:
 *   - computed keys `[expr]`, whose value is not known statically
 *   - spread `...x`, which is meant to overwrite
 *   - a getter and a setter of the same name, which is the legal way to write
 *     an accessor pair and would otherwise be a false positive on every one
 */
function duplicateKeysIn(source: string, file: string) {
  const found: string[] = [];
  const ast = acorn.parse(source, { ecmaVersion: 2023, sourceType: "module", locations: true });

  const walk = (node: any) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) { for (const n of node) walk(n); return; }
    if (node.type === "ObjectExpression") {
      const seen = new Map<string, { line: number; kind: string }>();
      for (const p of node.properties) {
        if (p.type !== "Property" || p.computed) continue;
        const name = p.key.type === "Identifier" ? p.key.name
          : p.key.type === "Literal" ? String(p.key.value)
          : null;
        if (name === null) continue;
        const prev = seen.get(name);
        if (prev) {
          const accessorPair = prev.kind !== "init" && p.kind !== "init" && prev.kind !== p.kind;
          if (!accessorPair) {
            found.push(`${file}:${p.loc.start.line} — "${name}" was already set at line ${prev.line}`);
          }
        }
        seen.set(name, { line: p.loc.start.line, kind: p.kind });
      }
    }
    for (const k of Object.keys(node)) {
      if (k === "loc" || k === "start" || k === "end") continue;
      walk(node[k]);
    }
  };
  walk(ast);
  return found;
}

test("no object literal sets the same key twice", () => {
  const all: string[] = [];
  for (const f of ourModules()) {
    all.push(...duplicateKeysIn(readFileSync(join(PUBLIC, f), "utf8"), f));
  }
  assert.deepEqual(
    all, [],
    "a key set twice keeps only the last value, and the two will not stay identical:\n  " + all.join("\n  "),
  );
});

test("guardrail: the walker actually catches one, rather than passing by construction", () => {
  // The check above passes on a clean tree, which is also what a walker that
  // never descends into anything would do. This plants one and demands it be
  // found -- nested inside an array inside a property, where the real ones were.
  const planted = `
    export const MODELS = {
      "thing": {
        id: "thing",
        lod: [ { level: 0, opts: { height: 1, width: 2, height: 3 } } ],
      },
    };
  `;
  const hits = duplicateKeysIn(planted, "planted.js");
  assert.equal(hits.length, 1, `expected one duplicate, found ${hits.length}: ${hits.join("; ")}`);
  assert.match(hits[0], /"height"/);
});

test("control: an accessor pair and a computed key are not false positives", () => {
  // Both are legal and both look like duplicates to a naive check. If either
  // fired, the test above would be unusable and would get deleted rather than
  // fixed, which is worse than not having it.
  const legal = `
    const k = "x";
    export const o = {
      get value() { return 1; },
      set value(v) { this._v = v; },
      [k]: 1,
      [k]: 2,
    };
  `;
  assert.deepEqual(duplicateKeysIn(legal, "legal.js"), []);
});
