// THE PARENT-SIDE HALF OF I5's SECURITY FIX (Finding 1, HIGH,
// docs/audits/UMAA-I5-L-J4.md) -- separated from scripts/supervised-generate.mjs
// itself (which runs its CLI as a side effect of being executed) so this can
// be imported cleanly by both that script and test/verifyUntrustedGeometry.test.ts
// without triggering the interactive flow. Same pattern
// scripts/mutate-resume.mjs already established for scripts/mutate.mjs.
//
// See scripts/_verify-untrusted-geometry.mjs's own header for what actually
// changed and, as importantly, what did not.

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

// WALKED UP, not derived from a fixed dirname(dirname(...)) offset: the test
// suite bundles this file with esbuild, and once inlined, import.meta.url
// resolves to the BUNDLE's own location (test/.built/..., one level deeper
// than this file's real one) -- the exact trap test/claudeMdIsCurrent.test.ts's
// own repoRoot() helper already exists to avoid. A walk-up still reaches the
// real repo root from either starting depth, unlike a fixed offset.
function repoRoot() {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let up = 0; up < 8; up++) {
    if (existsSync(join(dir, "CLAUDE.md"))) return dir;
    dir = join(dir, "..");
  }
  throw new Error("could not locate the repo root from " + fileURLToPath(import.meta.url));
}
const ROOT = repoRoot();

/**
 * Verifies a REAL model response in a CHILD PROCESS that never had
 * ANTHROPIC_API_KEY (or anything else from this process's environment) in
 * its own environment.
 *
 * An ALLOWLIST, not a denylist, of environment variables -- the exact
 * lesson public/model-forge.js's own scanSource() comment already states
 * ("a denylist... invites someone to rely on it") and Finding 1 of
 * docs/audits/UMAA-I5-L-J4.md demonstrated a live bypass of. Only what
 * Node itself needs to start crosses into the child; nothing else does,
 * so there is no differently-named secret left for a filter to miss.
 */
export function verifyUntrustedGeometry(source, footprint) {
  const threeHref = pathToFileURL(join(ROOT, "public", "vendor", "three", "three.module.min.js")).href;
  const modelForgeHref = pathToFileURL(join(ROOT, "public", "model-forge.js")).href;
  const childEnv = {};
  for (const k of ["PATH", "SystemRoot", "windir", "TEMP", "TMP"]) {
    if (process.env[k] !== undefined) childEnv[k] = process.env[k];
  }
  const stdout = execFileSync(
    process.execPath,
    [join(ROOT, "scripts", "_verify-untrusted-geometry.mjs")],
    { input: JSON.stringify({ source, footprint, threeHref, modelForgeHref }), env: childEnv, encoding: "utf8", timeout: 30000 },
  );
  return JSON.parse(stdout);
}
