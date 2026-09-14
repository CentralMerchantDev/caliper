// I4 -- DESCRIBE. THE TYPED TEXT NEVER REACHES THE DOM AS HTML, ON ANY PATH.
//
// public/describe-request.js's makeDescribeRequest() was proven in isolation
// (D2, test/describeRequest.test.ts): it carries typed text verbatim, never
// templated into markup. Nothing wired it to a real box in the running page
// until now -- public/index.html's #describe-input/#describe-submit call it
// with the real, persisted selection (I3's getSelection()) and display the
// result. describe-request.js's own header names the one way its contract
// can still be defeated: something UPSTREAM builds an HTML STRING out of the
// text before display ever sees it. That is a display-site property, not a
// module property, so it has to be checked at the display site.
//
// index.html is not importable as an ES module in Node (it is markup with
// inline <script type="module">, not a module itself), so this reads the
// source text -- the same constraint and the same method
// test/rendererStatic.test.ts and test/pickSelection.test.ts already use for
// renderer code a GPU-less suite cannot construct.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { stripSourceComments } from "./stripSourceComments.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
function findPublic(): string {
  let dir = HERE;
  for (let up = 0; up < 6; up++) {
    const c = join(dir, "public");
    try { readFileSync(join(c, "world-scale.js"), "utf8"); return c; } catch { /* keep walking */ }
    dir = join(dir, "..");
  }
  throw new Error("could not locate public/ from " + HERE);
}
// Stripped so a comment describing .innerHTML/.textContent/makeDescribeRequest(
// cannot satisfy these checks in place of the real call -- see docs/LESSONS.md.
// This file's second test asserts an XSS-relevant property (never .innerHTML on
// visitor-typed text), which makes this exact blind spot worth closing here.
const INDEX_HTML = stripSourceComments(readFileSync(join(findPublic(), "index.html"), "utf8"));

test("I4: the describe box is wired to makeDescribeRequest, scoped to the real persisted selection", () => {
  assert.match(
    INDEX_HTML,
    /import\s*\{\s*makeDescribeRequest\s*\}\s*from\s*["']\.\/describe-request\.js["']/,
    "index.html no longer imports makeDescribeRequest -- the describe box would be talking to nothing",
  );
  const submitRefIndex = INDEX_HTML.indexOf("#describe-submit");
  assert.ok(submitRefIndex > -1, "could not find any reference to #describe-submit in index.html");
  const handlerStart = INDEX_HTML.indexOf("addEventListener", submitRefIndex);
  assert.ok(handlerStart > -1, "could not find the #describe-submit click handler");
  const handlerBlock = INDEX_HTML.slice(handlerStart, handlerStart + 500);
  assert.match(
    handlerBlock,
    /renderer3d\.getSelection\(\)/,
    "the describe handler does not read the real, persisted selection (I3) -- it would be scoping requests to nothing or to a stale value",
  );
  assert.match(
    handlerBlock,
    /makeDescribeRequest\(/,
    "the describe handler does not call makeDescribeRequest -- typed text would have nowhere real to go",
  );
});

test("I4: the describe result is displayed with .textContent only, never .innerHTML -- on the one path the typed text reaches the DOM", () => {
  const resultBlockStart = INDEX_HTML.indexOf("#describe-submit");
  const resultBlock = INDEX_HTML.slice(resultBlockStart, resultBlockStart + 800);
  assert.match(
    resultBlock,
    /result\.textContent\s*=/,
    "the describe handler no longer writes its result with .textContent",
  );
  assert.doesNotMatch(
    resultBlock,
    /result\.innerHTML/,
    "the describe handler writes its result with .innerHTML -- visitor-typed text would execute as markup",
  );
});

// 2026-09-06: I4 built the describe box read-back only -- it confirmed the
// scope and stopped. #describe-submit currently calls makeDescribeRequest,
// prints "Scoped to X: ..." and stops. Mark wants it wired: a scoped
// request must reach the same build pipeline #bar-submit uses, keeping the
// scope (a real plot address) rather than discarding it.
test("the describe handler hands its scoped request to the SAME build pipeline the Build button uses, not just a readback", () => {
  const submitRefIndex = INDEX_HTML.indexOf("#describe-submit");
  const handlerStart = INDEX_HTML.indexOf("addEventListener", submitRefIndex);
  const handlerEnd = INDEX_HTML.indexOf("});", handlerStart);
  const handlerBlock = INDEX_HTML.slice(handlerStart, handlerEnd);

  assert.match(
    handlerBlock,
    /\$\(['"]#bar-request-input['"]\)\.value\s*=/,
    "the describe handler does not populate #bar-request-input -- it has nothing to hand the build pipeline",
  );
  assert.match(
    handlerBlock,
    /req\.address/,
    "the describe handler's handoff does not reference req.address -- the scope (a real plot address) would be lost, not kept",
  );
  assert.match(
    handlerBlock,
    /\bstartRun\s*\(\s*\)/,
    "the describe handler does not call startRun() -- it stops at the readback instead of reaching the same pipeline #bar-submit uses",
  );

  // THE EARLY RETURN MUST STILL GUARD IT: a request makeDescribeRequest
  // refused (req.ok === false) must never reach startRun() -- an unscoped
  // or unselected request has no business starting a real run.
  const earlyReturnIndex = handlerBlock.indexOf("return;");
  const startRunIndex = handlerBlock.indexOf("startRun(");
  assert.ok(earlyReturnIndex > -1 && startRunIndex > -1, "could not find both the early return and the startRun() call to order them");
  assert.ok(
    earlyReturnIndex < startRunIndex,
    "the refusal's early return does not precede startRun() in the handler -- a refused describe request could still reach the build pipeline",
  );
});
