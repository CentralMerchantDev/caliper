import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { execFileSync } from "node:child_process";

test("Git does not track corpus-shaped evaluation data under test", () => {
  const tracked = execFileSync("git", ["ls-files", "test"], { cwd: process.cwd(), encoding: "utf8" })
    .trim().split(/\r?\n/).filter(Boolean);
  const corpusData = tracked.filter((file) => {
    const normalized = file.split(path.sep).join("/");
    return normalized.endsWith(".jsonl") || normalized.split("/").includes("qrels");
  });
  assert.deepEqual(corpusData, [], `tracked corpus-shaped evaluation data:\n${corpusData.join("\n")}`);
});
