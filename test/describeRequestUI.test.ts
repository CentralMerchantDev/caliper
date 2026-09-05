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
const INDEX_HTML = readFileSync(join(findPublic(), "index.html"), "utf8");

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
