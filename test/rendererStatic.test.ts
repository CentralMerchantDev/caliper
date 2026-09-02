// =============================================================================
// THE RENDERER IS THE ONE PART OF THIS PROJECT THE SUITE CANNOT RUN
//
// three.js needs a GPU, so nothing in the 414 tests builds a scene. That is a
// real gap and it cost real defects. Two of them shipped, and both were the kind
// a first render would have caught in a second:
//
//   1. `buildProps` in city-render.js read `stats` on the line above the `const`
//      that declares it -- a temporal dead zone ReferenceError, thrown on EVERY
//      call. Nothing catches buildProps, and nothing catches buildWorld either,
//      so the entire world build threw on every page load: no bridges, no port,
//      no railway, airport, marina, parks, traffic or shadows. It arrived by
//      insertion, a later commit adding a block ABOVE the destructuring.
//
//   2. `_reconcilePlacements` in world-render-3d.js called `parseHexColor`,
//      which is not declared, not imported, and not a global. Every colour
//      change on an existing placement threw out of the reconcile loop, so every
//      placement after it in that tick was never added, moved or removed.
//
// Both are STATICALLY DECIDABLE. Neither needs a GPU, a canvas, or a running
// scene -- they need someone to resolve every identifier against its scope,
// which is what this file does. It is not a substitute for rendering the world;
// it is the part of "does this code run at all" that can be answered without one.
//
// WHAT IT DOES NOT CLAIM. A clean result here does not mean the renderer draws
// the right thing, or draws anything. It means no reference in these files
// resolves to nothing and none is read before its declaration. That is a narrow
// guarantee, stated narrowly on purpose.
// =============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import * as acorn from "acorn";

// The suite bundles each test into test/.built/, so import.meta.url points
// there, not at the source. Walk up until the repo root is actually found
// rather than guessing a depth -- a wrong path here would surface as ENOENT,
// which is at least loud, but a path that happened to resolve to nothing
// readable would be a test that silently checks no files.
const HERE = dirname(fileURLToPath(import.meta.url));
function findPublicDir(): string {
  let dir = HERE;
  for (let up = 0; up < 6; up++) {
    const candidate = join(dir, "public");
    try {
      readFileSync(join(candidate, "world-scale.js"), "utf8");
      return candidate;
    } catch { /* not this level */ }
    dir = join(dir, "..");
  }
  throw new Error("could not locate public/ from " + HERE);
}
const PUBLIC = findPublicDir();

/** Files that run in the browser and cannot be executed by this suite. */
const RENDERER_FILES = [
  "world-render-3d.js",
  "city-render.js",
  "buildings.js",
  "city-plan.js",
  "terrain.js",
  "land-use.js",
  "features.js",
  "footprint.js",
  "grade.js",
  "zoning.js",
  "settlement-fit.js",
  "spatial-index.js",
  "noise.js",
  "world-scale.js",
  "world-render.js",
];

// Standard + browser globals these modules legitimately use. Deliberately a
// closed list rather than a permissive one: a typo'd global is the defect this
// test exists to catch, so "unknown" must mean "fail", not "probably fine".
const GLOBALS = new Set([
  "globalThis", "console", "Math", "JSON", "Object", "Array", "String", "Number",
  "Boolean", "Symbol", "BigInt", "Date", "RegExp", "Error", "TypeError",
  "RangeError", "ReferenceError", "SyntaxError", "Map", "Set", "WeakMap",
  "WeakSet", "Promise", "Proxy", "Reflect", "Infinity", "NaN", "undefined",
  "isNaN", "isFinite", "parseInt", "parseFloat", "encodeURIComponent",
  "decodeURIComponent", "encodeURI", "decodeURI", "structuredClone", "queueMicrotask",
  "Int8Array", "Uint8Array", "Uint8ClampedArray", "Int16Array", "Uint16Array",
  "Int32Array", "Uint32Array", "Float32Array", "Float64Array", "BigInt64Array",
  "BigUint64Array", "ArrayBuffer", "SharedArrayBuffer", "DataView", "Atomics",
  "TextEncoder", "TextDecoder", "URL", "URLSearchParams", "AbortController",
  "Intl", "escape", "unescape",
  // browser
  "window", "document", "navigator", "location", "history", "screen",
  "performance", "requestAnimationFrame", "cancelAnimationFrame",
  // Real global, and deliberately used behind a typeof guard because Safari
  // did not ship it for years. Listing it is not a loosening -- the check is
  // for names that do not exist anywhere, and this one does.
  "requestIdleCallback", "cancelIdleCallback",
  "setTimeout", "clearTimeout", "setInterval", "clearInterval",
  "fetch", "Request", "Response", "Headers", "FormData", "Blob", "File",
  "FileReader", "Image", "ImageData", "Audio", "AudioContext",
  "webkitAudioContext", "OffscreenCanvas", "createImageBitmap",
  "devicePixelRatio", "matchMedia", "getComputedStyle", "alert",
  "localStorage", "sessionStorage", "CustomEvent", "Event", "EventTarget",
  "MutationObserver", "ResizeObserver", "IntersectionObserver",
  "WebGLRenderingContext", "WebGL2RenderingContext", "DOMParser", "Node",
  "HTMLElement", "HTMLCanvasElement", "SVGElement", "crypto", "self",
  "process",
]);

type Scope = {
  parent: Scope | null;
  /** name -> the source index at which it becomes usable (TDZ end). */
  bindings: Map<string, number>;
  /** function scopes stop `var` from escaping further out */
  isFunction: boolean;
  /**
   * How many function boundaries deep this scope is.
   *
   * THIS IS WHAT MAKES THE TDZ CHECK USABLE. A module-level `const` referenced
   * inside a function declared above it is completely legal -- the function
   * body runs later, after the const is initialised. Without this the check
   * fired on 40+ perfectly correct lines in the first file it saw, which is a
   * test that would have been switched off within a day.
   *
   * A TDZ read is only a certain throw when the reference and the declaration
   * execute at the same time: same function depth, reference textually first.
   */
  fnDepth: number;
};

function newScope(parent: Scope | null, isFunction: boolean): Scope {
  return {
    parent,
    bindings: new Map(),
    isFunction,
    fnDepth: parent ? parent.fnDepth + (isFunction ? 1 : 0) : 0,
  };
}

function declare(scope: Scope, name: string, usableFrom: number) {
  // A re-declaration in the same scope keeps the EARLIER position: `var` twice,
  // or a param shadowed by a body binding, is usable from the earlier point.
  const prev = scope.bindings.get(name);
  if (prev === undefined || usableFrom < prev) scope.bindings.set(name, usableFrom);
}

function resolve(scope: Scope | null, name: string): { usableFrom: number; fnDepth: number } | undefined {
  for (let s = scope; s; s = s.parent) {
    const at = s.bindings.get(name);
    if (at !== undefined) return { usableFrom: at, fnDepth: s.fnDepth };
  }
  return undefined;
}

/** Every name a binding pattern introduces. */
function patternNames(node: any, out: string[]) {
  if (!node) return;
  switch (node.type) {
    case "Identifier": out.push(node.name); break;
    case "ObjectPattern":
      for (const p of node.properties) {
        if (p.type === "RestElement") patternNames(p.argument, out);
        else patternNames(p.value, out);
      }
      break;
    case "ArrayPattern":
      for (const e of node.elements) patternNames(e, out);
      break;
    case "AssignmentPattern": patternNames(node.left, out); break;
    case "RestElement": patternNames(node.argument, out); break;
    default: break;
  }
}

/**
 * Visit only the EXPRESSIONS inside a binding pattern -- default values and
 * computed keys -- never the names being bound.
 */
function makePatternDefaultVisitor(visit: (n: any, s: Scope) => void) {
  return function visitPatternDefaults(node: any, scope: Scope) {
    if (!node) return;
    switch (node.type) {
      case "Identifier": return;
      case "ObjectPattern":
        for (const pr of node.properties) {
          if (pr.type === "RestElement") { visitPatternDefaults(pr.argument, scope); continue; }
          if (pr.computed) visit(pr.key, scope);
          visitPatternDefaults(pr.value, scope);
        }
        return;
      case "ArrayPattern":
        for (const e of node.elements) visitPatternDefaults(e, scope);
        return;
      case "AssignmentPattern":
        visitPatternDefaults(node.left, scope);
        visit(node.right, scope);       // the default IS a real read
        return;
      case "RestElement":
        visitPatternDefaults(node.argument, scope);
        return;
      default:
        visit(node, scope);             // e.g. a MemberExpression target
    }
  };
}

function childNodes(node: any): any[] {
  const out: any[] = [];
  for (const key of Object.keys(node)) {
    if (key === "type" || key === "start" || key === "end" || key === "loc") continue;
    const v = (node as any)[key];
    if (Array.isArray(v)) { for (const c of v) if (c && typeof c.type === "string") out.push(c); }
    else if (v && typeof v.type === "string") out.push(v);
  }
  return out;
}

type Problem = { kind: "undeclared" | "tdz"; name: string; line: number };

function analyse(source: string, filename: string): Problem[] {
  const ast = acorn.parse(source, { ecmaVersion: 2022, sourceType: "module", locations: true }) as any;
  const problems: Problem[] = [];
  const lineOf = (pos: number) => source.slice(0, pos).split("\n").length;

  const visitPatternDefaults = makePatternDefaultVisitor((n, sc) => visit(n, sc));

  // Hoist declarations into a scope, without descending into nested functions
  // for `let`/`const`/`class` (block-scoped) but following blocks for `var`.
  function hoist(body: any[], scope: Scope) {
    const walk = (n: any, topLevel: boolean) => {
      if (!n || typeof n.type !== "string") return;
      switch (n.type) {
        case "VariableDeclaration": {
          // `var` and function declarations hoist to the top of the function
          // scope and are usable (as undefined) from the start. `let`/`const`
          // are not usable until their declarator is EVALUATED -- which is the
          // temporal dead zone, and the whole point of tracking a position.
          if (n.kind === "var") {
            let s = scope; while (s.parent && !s.isFunction) s = s.parent;
            const names: string[] = [];
            for (const d of n.declarations) patternNames(d.id, names);
            for (const nm of names) declare(s, nm, 0);
          } else if (topLevel) {
            // PER DECLARATOR, NOT PER STATEMENT. `const g = f(), d = g.x()` is
            // legal: g is initialised before d's initialiser runs. Using the
            // end of the whole statement flagged every such line -- and this
            // file has several, so the check would have been reporting correct
            // code as broken while the real defect it exists for sat elsewhere.
            for (const d of n.declarations) {
              const names: string[] = [];
              patternNames(d.id, names);
              for (const nm of names) declare(scope, nm, d.end);
            }
          }
          return;
        }
        case "FunctionDeclaration":
          if (n.id) declare(scope, n.id.name, 0);   // fully hoisted
          return;                                    // do not descend
        case "ClassDeclaration":
          if (n.id && topLevel) declare(scope, n.id.name, n.end);
          return;
        case "ImportDeclaration":
          for (const sp of n.specifiers) declare(scope, sp.local.name, 0);
          return;
        case "ExportNamedDeclaration":
        case "ExportDefaultDeclaration":
          if (n.declaration) walk(n.declaration, topLevel);
          return;
        case "FunctionExpression":
        case "ArrowFunctionExpression":
          return;                                    // own scope, handled later
        default:
          // descend through blocks/ifs/loops so `var` finds its function scope
          for (const c of childNodes(n)) walk(c, false);
      }
    };
    for (const st of body) walk(st, true);
  }

  function visit(node: any, scope: Scope) {
    if (!node || typeof node.type !== "string") return;

    switch (node.type) {
      case "Program": {
        const s = newScope(scope, true);
        hoist(node.body, s);
        for (const st of node.body) visit(st, s);
        return;
      }
      case "FunctionDeclaration":
      case "FunctionExpression":
      case "ArrowFunctionExpression": {
        const s = newScope(scope, true);
        if (node.id && node.type === "FunctionExpression") declare(s, node.id.name, 0);
        const names: string[] = [];
        for (const p of node.params) patternNames(p, names);
        for (const nm of names) declare(s, nm, 0);
        declare(s, "arguments", 0);
        if (node.body.type === "BlockStatement") {
          hoist(node.body.body, s);
          for (const st of node.body.body) visit(st, s);
        } else {
          visit(node.body, s);
        }
        return;
      }
      case "BlockStatement": {
        const s = newScope(scope, false);
        hoist(node.body, s);
        for (const st of node.body) visit(st, s);
        return;
      }
      case "ClassDeclaration":
      case "ClassExpression": {
        const s = newScope(scope, false);
        if (node.id) declare(s, node.id.name, 0);
        if (node.superClass) visit(node.superClass, s);
        visit(node.body, s);
        return;
      }
      case "ForStatement": case "ForInStatement": case "ForOfStatement": {
        const s = newScope(scope, false);
        if (node.init) hoist([node.init], s);
        if (node.left) hoist([node.left], s);
        for (const c of childNodes(node)) visit(c, s);
        return;
      }
      case "CatchClause": {
        const s = newScope(scope, false);
        if (node.param) { const n2: string[] = []; patternNames(node.param, n2); for (const nm of n2) declare(s, nm, 0); }
        hoist(node.body.body, s);
        for (const st of node.body.body) visit(st, s);
        return;
      }
      case "VariableDeclarator": {
        // The NAME being declared is not a read of itself. Visiting `id` as a
        // plain Identifier made every `const X = ...` report X as a TDZ read of
        // X, which is how the first run of this check produced 40 findings in
        // one file and zero of them real.
        //
        // Default values inside the pattern ARE expressions and are visited:
        // `const { a = b } = o` genuinely reads b.
        visitPatternDefaults(node.id, scope);
        if (node.init) visit(node.init, scope);
        return;
      }
      case "AssignmentPattern":
        visitPatternDefaults(node.left, scope);
        visit(node.right, scope);
        return;
      case "MemberExpression":
        visit(node.object, scope);
        if (node.computed) visit(node.property, scope);
        return;                                        // `.foo` is not a reference
      case "Property":
        if (node.computed) visit(node.key, scope);
        visit(node.value, scope);
        return;                                        // `{ foo: 1 }` key is not a reference
      case "MethodDefinition":
      case "PropertyDefinition":
        if (node.computed) visit(node.key, scope);
        if (node.value) visit(node.value, scope);
        return;
      case "LabeledStatement":
        visit(node.body, scope);
        return;                                        // labels are not bindings
      case "BreakStatement":
      case "ContinueStatement":
        return;                                        // label references
      case "ExportNamedDeclaration":
        if (node.declaration) visit(node.declaration, scope);
        return;                                        // `export { a as b }` uses local names already declared
      case "ImportDeclaration":
        return;
      case "Identifier": {
        const name = node.name;
        if (GLOBALS.has(name)) return;
        const found = resolve(scope, name);
        if (found === undefined) {
          problems.push({ kind: "undeclared", name, line: lineOf(node.start) });
        } else if (
          found.usableFrom > 0 &&
          node.start < found.usableFrom &&
          found.fnDepth === scope.fnDepth
        ) {
          // Textually before its own const/let/class declaration AND at the same
          // function depth, so both run in the same pass and this throws. A
          // reference from inside a nested function is a closure that runs later
          // and is fine -- see Scope.fnDepth.
          problems.push({ kind: "tdz", name, line: lineOf(node.start) });
        }
        return;
      }
      default:
        for (const c of childNodes(node)) visit(c, scope);
    }
  }

  visit(ast, null);
  return problems;
}

test("no renderer module references a name that does not exist", () => {
  const failures: string[] = [];
  for (const file of RENDERER_FILES) {
    const src = readFileSync(join(PUBLIC, file), "utf8");
    for (const p of analyse(src, file)) {
      if (p.kind !== "undeclared") continue;
      failures.push(`${file}:${p.line}  '${p.name}' is not declared, imported, or a known global`);
    }
  }
  assert.deepEqual(
    failures, [],
    `undefined references in browser code the test suite cannot execute:\n  ${failures.join("\n  ")}\n\n` +
    `This is how parseHexColor shipped: called in _reconcilePlacements, defined nowhere, ` +
    `throwing out of the placement loop on every colour change.`
  );
});

test("no renderer module reads a const or let before it is declared", () => {
  const failures: string[] = [];
  for (const file of RENDERER_FILES) {
    const src = readFileSync(join(PUBLIC, file), "utf8");
    for (const p of analyse(src, file)) {
      if (p.kind !== "tdz") continue;
      failures.push(`${file}:${p.line}  '${p.name}' is read before its declaration (temporal dead zone)`);
    }
  }
  assert.deepEqual(
    failures, [],
    `temporal-dead-zone reads in browser code the test suite cannot execute:\n  ${failures.join("\n  ")}\n\n` +
    `This is how buildProps shipped: it read 'stats' one line above the const that ` +
    `declares it, threw ReferenceError on every call, and took the entire world ` +
    `build down with it on every page load.`
  );
});

test("every WebGLRenderer asks for a logarithmic depth buffer", () => {
  // A ONE-WORD DELETION HERE LOOKS LIKE NOTHING AND UNDOES THE WHOLE FIX.
  //
  // Removing this option does not throw, does not fail to compile, and does not
  // change a single pixel in a screenshot taken near the camera. It only makes
  // distant geometry start flickering again -- which reads as "the graphics are
  // a bit off", the exact complaint that took a long time to trace to its cause
  // the first time. So it is pinned.
  //
  // The default 24-bit fixed-point depth buffer spends its precision near the
  // camera, governed by the near:far ratio:
  //
  //     dz = z^2 * (far - near) / (far * near * 2^24)
  //
  // Measured for the two cameras this project builds, against roads that are
  // drawn 0.9 m above the terrain:
  //
  //   world camera (near 3, far 120000)
  //      1 km   0.020 m      10 km   1.987 m      26 km  13.431 m
  //   city camera (near 0.1, far 12000)
  //      1 km   0.596 m      10 km  59.604 m
  //
  // The city camera cannot resolve 0.6 m at one kilometre, so inside the city
  // it is built to show, roads and ground were the same depth to the buffer and
  // which one drew was decided by rounding -- per pixel, per frame, changing as
  // the camera moved. A logarithmic buffer spreads precision across the range
  // (7 mm at 10 km on the world camera, 285x better) and costs the early-Z
  // optimisation, which is the honest trade.
  const files = ["world-render-3d.js", "city.html"];
  const failures: string[] = [];
  for (const file of files) {
    const src = readFileSync(join(PUBLIC, file), "utf8");
    // Count constructions, not occurrences of the flag: a file could gain a
    // second renderer that quietly lacks it while the first still has it.
    const constructions = (src.match(/new THREE\.WebGLRenderer\(/g) || []).length;
    const flagged = (src.match(/logarithmicDepthBuffer:\s*true/g) || []).length;
    if (constructions === 0) {
      failures.push(`${file}: constructs no WebGLRenderer at all — has the renderer moved?`);
    } else if (flagged < constructions) {
      failures.push(
        `${file}: ${constructions} WebGLRenderer(s) but only ${flagged} ask for ` +
        `logarithmicDepthBuffer: true`
      );
    }
  }
  assert.deepEqual(
    failures, [],
    `a renderer is back on the default depth buffer:\n  ${failures.join("\n  ")}\n\n` +
    `At the city camera's near:far ratio that is 0.6 m of depth resolution at ` +
    `1 km, against roads drawn 0.9 m above the ground they sit on.`
  );
});
