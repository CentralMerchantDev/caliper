import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createWorkersAIClient } from "../src/clientWorkersAI.ts";

function sourceFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const resolved = path.join(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(resolved) : entry.name.endsWith(".ts") ? [resolved] : [];
  });
}

test("source never assigns NODE_TLS_REJECT_UNAUTHORIZED", () => {
  const sourceDirectory = path.join(process.cwd(), "src");
  const assignments = sourceFiles(sourceDirectory).filter((file) => {
    const source = fs.readFileSync(file, "utf8");
    return /(?:process\.env|env)\s*(?:\.NODE_TLS_REJECT_UNAUTHORIZED|\[\s*["']NODE_TLS_REJECT_UNAUTHORIZED["']\s*\])\s*=/.test(source);
  });

  assert.deepEqual(assignments, [], `TLS verification disabled in: ${assignments.join(", ")}`);
});

test("Workers AI client requires an account ID", () => {
  const previous = process.env.CLOUDFLARE_ACCOUNT_ID;
  delete process.env.CLOUDFLARE_ACCOUNT_ID;
  try {
    assert.throws(() => createWorkersAIClient({ apiToken: "test-token" }), /No Cloudflare account ID found/);
  } finally {
    if (previous === undefined) delete process.env.CLOUDFLARE_ACCOUNT_ID;
    else process.env.CLOUDFLARE_ACCOUNT_ID = previous;
  }
});

test("Workers AI client contains no machine-specific user path", () => {
  const clientSource = fs.readFileSync(path.join(process.cwd(), "src", "clientWorkersAI.ts"), "utf8");
  assert.doesNotMatch(clientSource, /[A-Za-z]:\\\\Users\\\\/);
});
