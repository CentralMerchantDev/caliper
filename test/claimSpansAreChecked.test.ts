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
// its id, somewhere in publicClaims.test.ts's own CODE -- not its comments
// -- and both public/index.html and public/city.html are scanned, matching
// the exact two files publicClaims.test.ts itself already treats as
// in-scope for numeric claims. A new claim span with no matching reference
// fails here, by name, before anyone has to notice its number drifted.
//
// TWO GAPS FOUND BY A BLIND AUDIT (docs/audits/UMAA-I5-L-J4.md, Findings 2
// and 3), both closed here -- and both proven with SYNTHETIC inputs, not
// just today's real files, because today's real files happen not to
// exercise either gap (nothing is checked only in a comment; city.html
// carries no claim spans yet) -- a mutation against only the real files
// would SURVIVE by construction, telling you nothing about whether the fix
// works:
//   - the original check was `CLAIMS_TEST_SRC.includes(id)` against the RAW
//     source, so a dead `// TODO: check claim-foo later` comment satisfied
//     it with zero real verification present -- comments are now stripped
//     before the search.
//   - the original check only read public/index.html, while
//     publicClaims.test.ts's own "the placeholder city stats" test also
//     reads public/city.html -- a future claim span added there would have
//     gone unseen. Both files are read now.

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
const CITY = readFileSync(join(ROOT, "public", "city.html"), "utf8");
const CLAIMS_TEST_SRC = readFileSync(join(ROOT, "test", "publicClaims.test.ts"), "utf8");

/** Same visible-copy definition test/publicClaims.test.ts already uses --
 *  script/style/comments stripped, because a claim is what the page SAYS. */
function visibleCopy(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<style[\s\S]*?<\/style>/g, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");
}

/**
 * TypeScript/JS source with comments removed, so a dead `// TODO: claim-foo`
 * cannot satisfy "referenced" the same way a real assertion does (Finding 2).
 * Conservative on purpose -- this does not attempt to parse strings that
 * themselves contain `//` (e.g. a URL), because publicClaims.test.ts has
 * none today (checked directly); a real tokenizer would be needed to handle
 * that case generally, which is more machinery than this file's one job
 * justifies.
 */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\/\/.*$/gm, " ");
}

/**
 * The core registry check, pure and exported for its own direct test:
 * every `id="claim-*"` / `id="city-stat-*"` span across ALL given HTML
 * sources must be referenced by real code (comments stripped) in
 * `checksSource`. Returns the unchecked ids, empty if none.
 */
export function findUncheckedClaimSpans(htmlSources: string[], checksSource: string): string[] {
  const ids = new Set<string>();
  for (const html of htmlSources) {
    const copy = visibleCopy(html);
    for (const m of copy.matchAll(/id="((?:claim|city-stat)-[a-z-]+)"/g)) ids.add(m[1]);
  }
  const code = stripComments(checksSource);
  return [...ids].filter((id) => !code.includes(id));
}

test("J4: every claim-* / city-stat-* span across index.html and city.html is checked in publicClaims.test.ts", () => {
  const unchecked = findUncheckedClaimSpans([INDEX, CITY], CLAIMS_TEST_SRC);
  assert.deepEqual(
    unchecked, [],
    `these claim spans exist on the page but are never referenced by real code in test/publicClaims.test.ts (comments do not count): ${unchecked.join(", ")} -- ` +
    `a claim span with no check is a hand-typed number wearing the convention that means "generated".`,
  );
});

test("J4 (Finding 2 fix, synthetic): a claim span mentioned only in a dead comment is NOT considered checked", () => {
  const fakeHtml = `<span id="claim-fake-model-count">42</span>`;
  const fakeChecksWithOnlyAComment = `// TODO: check claim-fake-model-count later, not implemented yet\n`;
  const unchecked = findUncheckedClaimSpans([fakeHtml], fakeChecksWithOnlyAComment);
  assert.deepEqual(unchecked, ["claim-fake-model-count"], "a comment-only mention was treated as a real check");

  // And the positive case, so this test also proves the function is not
  // simply broken (e.g. always reporting everything unchecked).
  const fakeChecksWithARealAssertion = `assert.equal(spanText(html, "claim-fake-model-count"), "42");\n`;
  assert.deepEqual(findUncheckedClaimSpans([fakeHtml], fakeChecksWithARealAssertion), []);
});

test("J4 (Finding 3 fix, synthetic): a claim span present in a SECOND html source is still found", () => {
  const firstHtml = `<span id="claim-in-index">1</span>`;
  const secondHtml = `<span id="claim-in-city-only">2</span>`;
  const checks = `assert.equal(spanText(a, "claim-in-index"), "1");\n`; // claim-in-city-only deliberately never mentioned
  const unchecked = findUncheckedClaimSpans([firstHtml, secondHtml], checks);
  assert.deepEqual(unchecked, ["claim-in-city-only"], "a claim span only present in the second HTML source was not detected at all");
});
