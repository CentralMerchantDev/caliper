// I5: THE SUPERVISED-CALL SCRIPT'S SAFETY GATES, EACH INDEPENDENTLY SUFFICIENT.
//
// scripts/supervised-generate.mjs is the one thing in this project that can
// spend real money, on purpose, run by Mark's own hand. Its own header
// names four independent safety layers; this proves the three that are cheap
// and safe to run in a test suite -- none of them import Anthropic's SDK or
// touch the network, because each refuses before that import ever happens.
// The fourth (the terminal y/N confirmation) was verified manually, recorded
// in the I5 commit, because piping stdin through a spawned child adds real
// flakiness for a property already covered by these three plus direct
// reading of the source.

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
function repoRoot(): string {
  let dir = HERE;
  for (let up = 0; up < 6; up++) {
    try { readFileSync(join(dir, "CLAUDE.md"), "utf8"); return dir; } catch { /* keep walking */ }
    dir = join(dir, "..");
  }
  throw new Error("could not locate the repo root");
}
const ROOT = repoRoot();
const SCRIPT = join(ROOT, "scripts", "supervised-generate.mjs");

function run(args: string[], env: Record<string, string> = {}) {
  try {
    const stdout = execFileSync("node", [SCRIPT, ...args], {
      cwd: ROOT, encoding: "utf8", env: { ...process.env, ...env }, timeout: 10000,
    });
    return { code: 0, stdout, stderr: "" };
  } catch (e: any) {
    return { code: e.status, stdout: e.stdout ? String(e.stdout) : "", stderr: e.stderr ? String(e.stderr) : "" };
  }
}

test("I5 script safety: refuses with no ANTHROPIC_API_KEY, before any other check", () => {
  const { code, stderr } = run([], { ANTHROPIC_API_KEY: "" });
  assert.equal(code, 1);
  assert.match(stderr, /ANTHROPIC_API_KEY is not set/);
});

test("I5 script safety: refuses without --confirm, even with a key set", () => {
  const { code, stderr } = run([], { ANTHROPIC_API_KEY: "sk-not-real-never-sent" });
  assert.equal(code, 1);
  assert.match(stderr, /pass --confirm/);
});

test("I5 script safety: refuses on missing required arguments, even with a key and --confirm", () => {
  const { code, stderr } = run(["--confirm"], { ANTHROPIC_API_KEY: "sk-not-real-never-sent" });
  assert.equal(code, 1);
  assert.match(stderr, /Usage:/);
});

test("I5 script safety: refuses a transform the ground does not approve, before printing a prompt or reaching the confirmation step", () => {
  const { code, stdout, stderr } = run(
    ["--address", "block--1349-760-p0", "--text", "a giant stadium", "--w", "500", "--d", "500", "--seed", "default", "--confirm"],
    { ANTHROPIC_API_KEY: "sk-not-real-never-sent" },
  );
  assert.equal(code, 1);
  assert.match(stderr, /refused before a prompt was even built/);
  assert.doesNotMatch(stdout, /PROMPT/, "a prompt was printed for a transform the ground refused");
});
