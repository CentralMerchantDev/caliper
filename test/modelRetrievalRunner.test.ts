import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";

test("test runner executes only the requested filename", () => {
  const runner = path.join(process.cwd(), "test", "run.mjs");
  const result = spawnSync(process.execPath, [runner, "modelRetrievalRunnerProbe.test.ts"], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: { ...process.env, CALIPER_ALLOW_SPEND: "" },
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /# test files: 1\b/);
  assert.equal(result.stdout.match(/RUNNER_SELECTION_PROBE/g)?.length, 1);
});
