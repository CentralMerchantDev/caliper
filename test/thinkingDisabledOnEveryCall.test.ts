// 2026-09-06 INCIDENT: A SUPERVISED LIVE CALL BURNED ITS WHOLE BUDGET ON
// THINKING TOKENS BECAUSE ONE CALLER NEVER SET `thinking`.
//
// src/claude.ts sets `thinking: { type: "disabled" }` at all 8 of its
// messages.create call sites (via createWithTruncationGuard). scripts/
// supervised-generate.mjs, written standalone, called client.messages.create
// directly and inherited none of them: max_tokens: 1024, output_tokens: 1024,
// thinking_tokens: 1023 -- one token of actual content, so the generated
// source was empty and verifyModelSource correctly refused at the scan
// stage. The path worked. The caller was misconfigured.
//
// Nothing checked that a NEW caller disables thinking -- this is that check,
// registry-shaped the same way test/claimSpansAreChecked.test.ts guards a
// different kind of drift: every real call site across src/ and scripts/
// must carry an explicit `thinking:` setting, not by convention, by scan.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
function repoRoot(): string {
  let dir = HERE;
  for (let up = 0; up < 6; up++) {
    try { readFileSync(join(dir, "CLAUDE.md"), "utf8"); return dir; } catch { /* keep walking */ }
    dir = join(dir, "..");
  }
  throw new Error("could not locate the repo root from " + HERE);
}
const ROOT = repoRoot();

function findMatchingParen(source: string, openIndex: number): number {
  let depth = 0;
  for (let i = openIndex; i < source.length; i++) {
    if (source[i] === "(") depth++;
    else if (source[i] === ")") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/**
 * The core registry check, pure and exported for its own direct test: every
 * `createWithTruncationGuard(...)` call and every direct `<x>.messages.
 * create(...)` call in `source` must carry an explicit `thinking:` setting
 * somewhere in its own argument list.
 *
 * ONE EXEMPTION, NARROW ON PURPOSE: a `messages.create({ ...params, ... })`
 * call whose argument object OPENS with a spread of an already-built params
 * object is delegating, not deciding -- this is exactly the shape
 * `createWithTruncationGuard`'s own body uses (src/claude.ts:64), and its
 * callers (checked by the first rule above) are where `thinking` is
 * actually set. A direct call that builds its OWN literal object (no
 * leading spread) gets no such exemption -- that is exactly the shape the
 * incident's own broken call had.
 */
export function findMessagesCreateCallsWithoutThinking(source: string, label: string): string[] {
  const issues: string[] = [];

  // A function DECLARATION also matches `name(` -- exclude it, so this only
  // ever inspects real call sites, not createWithTruncationGuard's own def.
  const isDeclaration = (index: number): boolean => /(?:async\s+)?function\s*$/.test(source.slice(Math.max(0, index - 24), index));

  for (const m of source.matchAll(/createWithTruncationGuard\s*\(/g)) {
    if (isDeclaration(m.index!)) continue;
    const openIdx = m.index! + m[0].length - 1;
    const closeIdx = findMatchingParen(source, openIdx);
    const args = closeIdx === -1 ? source.slice(openIdx) : source.slice(openIdx, closeIdx + 1);
    if (!/thinking\s*:/.test(args)) {
      issues.push(`${label}: createWithTruncationGuard(...) call near offset ${m.index} has no explicit "thinking" setting`);
    }
  }

  for (const m of source.matchAll(/\bmessages\.create\s*\(/g)) {
    const openIdx = m.index! + m[0].length - 1;
    const closeIdx = findMatchingParen(source, openIdx);
    const args = closeIdx === -1 ? source.slice(openIdx) : source.slice(openIdx, closeIdx + 1);
    // Strip the call's outer parens, then a single leading/trailing brace
    // pair (the params object itself), to see what the object body opens with.
    let inner = args.slice(1, -1).trim();
    if (inner.startsWith("{") && inner.endsWith("}")) inner = inner.slice(1, -1).trim();
    if (/^\.\.\.[A-Za-z_$][\w$]*\s*(,|$)/.test(inner)) continue; // delegates to an already-checked wrapper caller
    if (!/thinking\s*:/.test(args)) {
      issues.push(`${label}: messages.create(...) call near offset ${m.index} has no explicit "thinking" setting`);
    }
  }

  return issues;
}

test("synthetic: a createWithTruncationGuard call missing thinking is flagged, and one that sets it is not", () => {
  const bad = `await createWithTruncationGuard(client, "stage", { model, max_tokens: 1024, system, messages });`;
  const good = `await createWithTruncationGuard(client, "stage", { model, max_tokens: 1024, thinking: { type: "disabled" }, system, messages });`;
  assert.equal(findMessagesCreateCallsWithoutThinking(bad, "fixture").length, 1);
  assert.deepEqual(findMessagesCreateCallsWithoutThinking(good, "fixture"), []);
});

test("synthetic: a direct messages.create call missing thinking is flagged -- the exact shape of the 2026-09-06 incident", () => {
  const bad = `const response = await client.messages.create({\n  model, max_tokens: 1024,\n  system: systemPrompt,\n  messages: [{ role: "user", content: userPrompt }],\n});`;
  const issues = findMessagesCreateCallsWithoutThinking(bad, "fixture");
  assert.equal(issues.length, 1, `expected exactly one violation; got: ${JSON.stringify(issues)}`);
});

test("synthetic: a direct messages.create call that sets thinking itself is clean", () => {
  const good = `const response = await client.messages.create({\n  model, max_tokens: 1024,\n  thinking: { type: "disabled" },\n  system: systemPrompt,\n  messages: [{ role: "user", content: userPrompt }],\n});`;
  assert.deepEqual(findMessagesCreateCallsWithoutThinking(good, "fixture"), []);
});

test("synthetic: a messages.create call that purely forwards an already-built params object is exempt, not silently ignored", () => {
  const forwarding = `const response = await client.messages.create({ ...params, max_tokens: maxTokens });`;
  assert.deepEqual(
    findMessagesCreateCallsWithoutThinking(forwarding, "fixture"), [],
    "a delegating spread call was wrongly flagged -- its caller (createWithTruncationGuard) is what actually sets thinking, and is checked separately",
  );

  // And the exemption is narrow, not a blanket "any spread passes": a spread
  // that is NOT the params-forwarding shape (mixed with literal keys before
  // it, or not a lone leading identifier) must still be checked.
  const notReallyForwarding = `const response = await client.messages.create({ model, max_tokens: 1024, ...extra });`;
  assert.equal(
    findMessagesCreateCallsWithoutThinking(notReallyForwarding, "fixture").length, 1,
    "a call building its own literal object was wrongly exempted just because it happens to contain a spread",
  );
});

test("every messages.create / createWithTruncationGuard call in src/ and scripts/ carries an explicit thinking setting", () => {
  const dirs = ["src", "scripts"];
  const allIssues: string[] = [];
  for (const dir of dirs) {
    const full = join(ROOT, dir);
    for (const f of readdirSync(full)) {
      if (!f.endsWith(".ts") && !f.endsWith(".mjs")) continue;
      const source = readFileSync(join(full, f), "utf8");
      allIssues.push(...findMessagesCreateCallsWithoutThinking(source, `${dir}/${f}`));
    }
  }
  assert.deepEqual(
    allIssues, [],
    `found messages.create call(s) with no explicit "thinking" setting -- this is exactly the 2026-09-06 incident (a caller that inherits none of src/claude.ts's 8 correctly-configured call sites can burn its whole token budget on thinking and return an empty response): ${allIssues.join("; ")}`,
  );
});
