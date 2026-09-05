// J4 -- EVERY NUMBER ON THE PAGE IS GENERATED, NOT TYPED.
//
// test/publicClaims.test.ts already pins the world size, the city stats, the
// test counts, the spend caps and the pipeline's stage names -- a real,
// swept audit of index.html's visible text (this test's own commit message
// records the sweep and what it found: nothing else numeric and drift-prone,
// only CSS values, UI structure, and a fixed historical research report that
// is not a claim about this project's current state).
//
// What that file does NOT guard against is the NEXT one: a developer marks a
// new figure as a claim -- `id="claim-model-count"`, following the exact
// convention `claim-node-tests`/`claim-worker-tests` already established --
// and then never adds the check, because writing the number felt like the
// whole job. gen-test-count.mjs's own discipline is "the number comes from a
// generated artefact, never from memory"; this is the structural half of
// that discipline: a claim span that exists with NOTHING in
// publicClaims.test.ts naming it is exactly a hand-typed number that looks
// checked and is not.
//
// So this is a registry check, not a number check: every `id="claim-*"` or
// `id="city-stat-*"` span in the page's VISIBLE copy must be referenced, by
// its id, somewhere in publicClaims.test.ts's own source. A new claim span
// with no matching reference fails here, by name, before anyone has to
// notice its number drifted.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
function repoRoot(): string {
  let dir = HERE;
  for (let up = 0; up < 6; up++) {
    try { readFileSync(join(dir, "public", "index.html"), "utf8"); return dir; } catch { /* keep walking */ }
    dir = join(dir, "..");
  }
  throw new Error("could not locate the repo root from " + HERE);
}
const ROOT = repoRoot();
const INDEX = readFileSync(join(ROOT, "public", "index.html"), "utf8");
const CLAIMS_TEST_SRC = readFileSync(join(ROOT, "test", "publicClaims.test.ts"), "utf8");

/** Same visible-copy definition test/publicClaims.test.ts already uses --
 *  script/style/comments stripped, because a claim is what the page SAYS. */
function visibleCopy(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<style[\s\S]*?<\/style>/g, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");
}

test("J4: every claim-* / city-stat-* span on the page is checked somewhere in publicClaims.test.ts", () => {
  const copy = visibleCopy(INDEX);
  const ids = [...copy.matchAll(/id="((?:claim|city-stat)-[a-z-]+)"/g)].map((m) => m[1]);
  assert.ok(ids.length >= 4, `expected at least the four already-known claim spans, found ${ids.length} -- has the sweep pattern gone stale?`);

  const unchecked = ids.filter((id) => !CLAIMS_TEST_SRC.includes(id));
  assert.deepEqual(
    unchecked, [],
    `these claim spans exist on the page but are never named in test/publicClaims.test.ts: ${unchecked.join(", ")} -- ` +
    `a claim span with no check is a hand-typed number wearing the convention that means "generated".`,
  );
});
