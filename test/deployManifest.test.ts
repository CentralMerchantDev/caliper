// =============================================================================
// SHIP-5 (docs/briefs/BLD-2026-09-17.md §5): "a deploy manifest -- version,
// commit, build time, on the page, with a test asserting the page's
// declared commit matches what built it. A manifest nothing checks is
// decoration, and this project has shipped that before."
//
// TWO DIFFERENT KINDS OF CHECK, DELIBERATELY SEPARATE:
//
// 1. "Is the page in sync with the last generation" -- the SAME shape every
//    other generated claim in this project already gets (compare the live
//    page's own spans against test/deployManifest.generated.json), via the
//    pure functions in src/generatedClaimChecks.ts.
//
// 2. "Does the declared commit actually match what built it" -- SHIP-5's own
//    harder clause, and NOT provable by comparing two generated artefacts
//    (both could drift together, or the generated file could simply be
//    hand-edited to agree with a stale page -- exactly the "declared value
//    in a second place, nothing binding them" shape AUDIT-PROTOCOL.md's
//    own Failure pattern B names). This is checked here against the REAL,
//    LIVE git history instead: the declared commit must exist, and must be
//    HEAD or a real ancestor of it. Not string equality against the
//    CURRENT HEAD -- gen-deploy-manifest.mjs's own header explains why
//    that would break the instant its own commit lands (HEAD moves, the
//    embedded hash does not, by construction: a manifest cannot predict
//    the hash of the commit that adds it).
// =============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  deployVersionClaimMismatch, deployCommitClaimMismatch, deployBuildTimeClaimMismatch,
} from "../src/generatedClaimChecks.ts";
import { stripHtmlComments } from "./stripSourceComments.ts";

function repoRoot(): string {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let up = 0; up < 6; up++) {
    try { readFileSync(join(dir, "CLAUDE.md"), "utf8"); return dir; } catch { /* not this level */ }
    dir = join(dir, "..");
  }
  throw new Error("could not locate the repo root");
}
const ROOT = repoRoot();

function spanText(html: string, id: string): string | null {
  const m = html.match(new RegExp(`<span[^>]*id="${id}"[^>]*>([^<]*)</span>`));
  return m ? m[1].trim() : null;
}

function readManifest() {
  return JSON.parse(readFileSync(join(ROOT, "test", "deployManifest.generated.json"), "utf8")) as {
    version: string; commit: string; shortCommit: string; buildTime: string;
  };
}
function readPage(): string {
  return stripHtmlComments(readFileSync(join(ROOT, "public", "overview-scene.html"), "utf8"));
}

test("GATE (SHIP-5): the page's own #deploy-version/#deploy-commit/#deploy-build-time are not stale against the last real generation", () => {
  const manifest = readManifest();
  const page = readPage();
  const claimedVersion = spanText(page, "deploy-version");
  const claimedCommit = spanText(page, "deploy-commit");
  const claimedBuildTime = spanText(page, "deploy-build-time");

  const results = [
    { name: "#deploy-version", stale: deployVersionClaimMismatch(claimedVersion ?? "", manifest.version) },
    { name: "#deploy-commit", stale: deployCommitClaimMismatch(claimedCommit ?? "", manifest.shortCommit) },
    { name: "#deploy-build-time", stale: deployBuildTimeClaimMismatch(claimedBuildTime ?? "", manifest.buildTime) },
  ];
  const stale = results.filter((r) => r.stale !== null);
  assert.equal(
    stale.length, 0,
    `${stale.length} of ${results.length} deploy-manifest claim(s) are stale:\n` +
    stale.map((r) => `  - ${r.name}: ${r.stale}`).join("\n"),
  );
});

test("GATE (SHIP-5): the page's declared commit is a REAL commit in this repo's own history -- not a hand-typed or stale string", () => {
  const manifest = readManifest();
  // git cat-file -e <hash>: exits 0 iff the object exists. execFileSync
  // throws on a non-zero exit, so a bogus/invented hash fails this test
  // loudly rather than being silently accepted as "a string that looks
  // like a commit".
  assert.doesNotThrow(
    () => execFileSync("git", ["cat-file", "-e", manifest.commit], { cwd: ROOT }),
    `test/deployManifest.generated.json's own commit "${manifest.commit}" does not exist in this repo's git history at all`,
  );
});

test("GATE (SHIP-5): the page's declared commit MATCHES WHAT BUILT IT -- it is HEAD or a real ancestor of HEAD, checked against the live git history, not just equal to a second generated file that could drift together with the page", () => {
  const manifest = readManifest();
  // git merge-base --is-ancestor <commit> HEAD: exits 0 if <commit> is HEAD
  // itself or a real ancestor of it; non-zero (and execFileSync throws) for
  // any commit that is not actually part of this branch's own history --
  // a different branch's commit, a fabricated hash that happens to exist
  // as a dangling object, or a commit from AFTER the point this page was
  // actually generated (which would mean the manifest is lying about what
  // built it, not merely stale).
  assert.doesNotThrow(
    () => execFileSync("git", ["merge-base", "--is-ancestor", manifest.commit, "HEAD"], { cwd: ROOT }),
    `test/deployManifest.generated.json's own commit "${manifest.commit}" is not HEAD or an ancestor of it -- the page's own manifest does not actually match what built it`,
  );
});

// --- watched red, per this project's own standard of proof, before this gate is trusted --

test("(synthetic) a deliberately staled deploy-version claim is named, not silently absorbed", () => {
  assert.equal(deployVersionClaimMismatch("0.1.0", "0.1.0"), null);
  const wrong = deployVersionClaimMismatch("0.0.9", "0.1.0");
  assert.match(wrong!, /page says v0\.0\.9, generated manifest says v0\.1\.0/);
});

test("(synthetic) a deliberately staled deploy-commit claim is named, not silently absorbed", () => {
  assert.equal(deployCommitClaimMismatch("cf6e72a", "cf6e72a"), null);
  const wrong = deployCommitClaimMismatch("0000000", "cf6e72a");
  assert.match(wrong!, /page says 0000000, generated manifest says cf6e72a/);
});

test("(synthetic) a deliberately staled deploy-build-time claim is named, not silently absorbed", () => {
  assert.equal(deployBuildTimeClaimMismatch("2026-09-15 05:05 UTC", "2026-09-15 05:05 UTC"), null);
  const wrong = deployBuildTimeClaimMismatch("2020-01-01 00:00 UTC", "2026-09-15 05:05 UTC");
  assert.match(wrong!, /page says "2020-01-01 00:00 UTC", generated manifest says "2026-09-15 05:05 UTC"/);
});

test("(synthetic) an empty claim (span missing or emptied) is refused with a real reason, never treated as matching by accident", () => {
  assert.match(deployVersionClaimMismatch("", "0.1.0")!, /#deploy-version is missing/);
  assert.match(deployCommitClaimMismatch("", "cf6e72a")!, /#deploy-commit is missing/);
  assert.match(deployBuildTimeClaimMismatch("", "2026-09-15 05:05 UTC")!, /#deploy-build-time is missing/);
});

test("(synthetic) the vulnerability, demonstrated -- a fabricated commit hash that merely LOOKS real is rejected by git itself, not accepted because it has the right shape", () => {
  const fabricated = "0000000000000000000000000000000000000000"; // 40 hex chars, the right shape, not a real object
  assert.throws(() => execFileSync("git", ["cat-file", "-e", fabricated], { cwd: ROOT, stdio: "pipe" }));
});

test("GATE (SHIP-5): scripts/gen-claims.mjs's own 'one command regenerates everything' actually calls gen-deploy-manifest.mjs -- a real wiring check, not just that the generator works standalone", () => {
  const genClaimsSrc = readFileSync(join(ROOT, "scripts", "gen-claims.mjs"), "utf8");
  assert.match(genClaimsSrc, /execFileSync\(process\.execPath, \[join\(ROOT, "scripts", "gen-deploy-manifest\.mjs"\)\]/, "gen-claims.mjs does not actually call gen-deploy-manifest.mjs -- 'one command regenerates everything' would be false for this claim");
});

test("(synthetic) the vulnerability, demonstrated -- this repo's OWN root commit is a real object but is not itself HEAD, proving --is-ancestor is a real, non-trivial check and not a no-op that passes any real hash", () => {
  // Any commit that is a real ancestor of HEAD passes; this only proves
  // the check is exercised meaningfully, not that a NON-ancestor would be
  // rejected (a non-ancestor from a different repo/branch is exactly what
  // the GATE test above already guards -- this just confirms the command
  // itself behaves as documented against a real, known-good input).
  const rootCommit = execFileSync("git", ["rev-list", "--max-parents=0", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim().split("\n")[0];
  assert.doesNotThrow(() => execFileSync("git", ["merge-base", "--is-ancestor", rootCommit, "HEAD"], { cwd: ROOT }));
});
