// =============================================================================
// CALIPER — KITBASH VOCABULARY RETRIEVAL TEST SUITE (Phase R2)
//
// Validates:
//   - R2.1: Rich embedding generation & Vectorize indexing for 62 kitbash parts
//   - R2.2: Retrieval quality (nDCG@10, P@1, P@5, R@10) on 35-item held-out golden set
//   - R2.3: Natural-language brief assembler with deterministic output and socket mating
// =============================================================================

import test from "node:test";
import assert from "node:assert/strict";

import { KITBASH_PARTS } from "../public/kitbash-parts.js";
import {
  InMemoryVectorize,
  VectorizeIndexLike,
} from "../src/modelRetrieval.ts";
import { createWorkersAIClient } from "../src/clientWorkersAI.ts";
import {
  buildKitbashEmbeddingText,
  indexKitbashParts,
  findKitbashParts,
  assembleFromBrief,
  KitbashPartDef,
} from "../src/kitbashRetrieval.ts";
import { KITBASH_HELD_OUT_SET } from "./kitbashRetrievalGolden.ts";
import { computeNDCGAtK } from "./beirSciFactSubset.ts";

const parts = KITBASH_PARTS as Record<string, KitbashPartDef>;
const partCount = Object.keys(parts).length;
const SPEND_SKIP_REASON = "SKIP live Workers AI inference: CALIPER_ALLOW_SPEND=1 is required";
const spendAllowed = process.env.CALIPER_ALLOW_SPEND === "1";
const liveTest = spendAllowed ? test : (name: string, fn: () => unknown) => test(`${name} — ${SPEND_SKIP_REASON}`, { skip: SPEND_SKIP_REASON }, fn);
const ai = spendAllowed ? createWorkersAIClient() : null as never;

// Shared index
let kitbashVectorize: InMemoryVectorize;

liveTest("R2.1 — Embed all 62 kitbash parts with Workers AI and index into Vectorize", async () => {
  assert.equal(partCount, 62, `Expected 62 kitbash parts, found ${partCount}`);

  // Verify non-empty embedding text for all parts
  for (const part of Object.values(parts)) {
    const text = buildKitbashEmbeddingText(part);
    assert.ok(text.length > 20, `Part ${part.id} embedding text too short: "${text}"`);
    assert.ok(text.includes(part.name), `Part ${part.id} text missing name`);
    assert.ok(text.includes(part.category), `Part ${part.id} text missing category`);
  }

  // Index into Vectorize
  kitbashVectorize = new InMemoryVectorize(384);
  const indexedCount = await indexKitbashParts(parts, kitbashVectorize, ai);
  assert.equal(indexedCount, 62, "All 62 parts must be indexed without dropping");
  assert.equal(kitbashVectorize.vectors.size, 62, "Vectorize store size must match part count");
});

liveTest("R2.2 — Measure retrieval quality on 35-item held-out golden set", async () => {
  if (!kitbashVectorize) {
    kitbashVectorize = new InMemoryVectorize(384);
    await indexKitbashParts(parts, kitbashVectorize, ai);
  }

  let hitsP1 = 0;
  let hitsP5 = 0;
  let hitsR10 = 0;
  let sumNDCG = 0;
  const failures: { id: string; query: string; expected: string[]; got: string; score: number }[] = [];

  for (const item of KITBASH_HELD_OUT_SET) {
    const results = await findKitbashParts(item.query, kitbashVectorize, {
      ai,
      category: item.category,
      limit: 10,
    });

    const rankedIds = results.map((r) => r.id);
    const top1 = rankedIds[0];
    const match1 = top1 && item.expected.includes(top1);
    const match5 = rankedIds.slice(0, 5).some((id) => item.expected.includes(id));
    const match10 = rankedIds.slice(0, 10).some((id) => item.expected.includes(id));

    if (match1) hitsP1++;
    if (match5) hitsP5++;
    if (match10) hitsR10++;

    const ndcg = computeNDCGAtK(rankedIds, item.expected, 10);
    sumNDCG += ndcg;

    if (!match1) {
      failures.push({
        id: item.id,
        query: item.query,
        expected: item.expected,
        got: top1 || "none",
        score: results[0]?.score || 0,
      });
    }
  }

  const N = KITBASH_HELD_OUT_SET.length;
  const p1 = (hitsP1 / N) * 100;
  const p5 = (hitsP5 / N) * 100;
  const r10 = (hitsR10 / N) * 100;
  const meanNDCG = (sumNDCG / N) * 100;

  console.log("\n=============================================================================");
  console.log("   PHASE R2: KITBASH VOCABULARY RETRIEVAL BENCHMARK (@cf/baai/bge-small-en-v1.5)");
  console.log("=============================================================================");
  console.log(`Corpus Size:               62 kitbash parts`);
  console.log(`Held-Out Query Set:        ${N} hand-authored architectural queries`);
  console.log(`Mean nDCG@10:              ${meanNDCG.toFixed(1)}%`);
  console.log(`Precision@1 (P@1):         ${p1.toFixed(1)}% (${hitsP1}/${N})`);
  console.log(`Precision@5 (P@5):         ${p5.toFixed(1)}% (${hitsP5}/${N})`);
  console.log(`Recall@10 (R@10):          ${r10.toFixed(1)}% (${hitsR10}/${N})`);
  console.log(`Failures at Rank 1:        ${failures.length}`);

  if (failures.length > 0) {
    console.log("\nFailures Breakdown:");
    for (const f of failures) {
      console.log(`  - [${f.id}] "${f.query}" -> expected [${f.expected.join(", ")}], got "${f.got}" (score: ${f.score.toFixed(4)})`);
    }
  }

  // Real neural retrieval should achieve high accuracy on domain vocabulary
  assert.ok(p1 >= 60.0, `Expected P@1 >= 60.0%, got ${p1.toFixed(1)}%`);
  assert.ok(meanNDCG >= 70.0, `Expected nDCG@10 >= 70.0%, got ${meanNDCG.toFixed(1)}%`);
});

liveTest("R2.3 — Natural-language brief assembler determinism and socket mating", async () => {
  if (!kitbashVectorize) {
    kitbashVectorize = new InMemoryVectorize(384);
    await indexKitbashParts(parts, kitbashVectorize, ai);
  }

  const testBriefs = [
    "Art Deco commercial tower with a stepped pyramid crown and a spire on top",
    "Eco residential tower with stepped green terraces and rooftop solar panel canopy",
    "Modern glazed corporate tower with curved glass crown",
    "Monumental civic building with colonnade podium and observation lantern",
  ];

  for (const brief of testBriefs) {
    // Assemble twice with same brief and seed
    const res1 = await assembleFromBrief(brief, kitbashVectorize, { ai, seed: 101 });
    const res2 = await assembleFromBrief(brief, kitbashVectorize, { ai, seed: 101 });

    // Gate: Deterministic output verification
    assert.deepEqual(
      res1.recipe,
      res2.recipe,
      `Assembly from brief "${brief}" must be byte-identical and deterministic`
    );
    assert.equal(res1.height, res2.height, "Heights must match exactly");

    // Socket mating contract verification
    const { podium, shaft, crown, roofFeature } = res1;
    assert.ok(podium, "Must have valid podium");
    assert.ok(shaft, "Must have valid shaft");
    assert.ok(crown, "Must have valid crown");

    // Podium -> Shaft socket check (within 8m tolerance)
    assert.ok(
      Math.abs(podium.sockets.top.w - shaft.sockets.bottom.w) <= 8,
      `Podium top socket width (${podium.sockets.top.w}) must mate with Shaft bottom width (${shaft.sockets.bottom.w})`
    );
    assert.ok(
      Math.abs(podium.sockets.top.d - shaft.sockets.bottom.d) <= 8,
      `Podium top socket depth (${podium.sockets.top.d}) must mate with Shaft bottom depth (${shaft.sockets.bottom.d})`
    );

    // Shaft -> Crown socket check
    assert.ok(
      Math.abs(shaft.sockets.top.w - crown.sockets.bottom.w) <= 8,
      `Shaft top socket width (${shaft.sockets.top.w}) must mate with Crown bottom width (${crown.sockets.bottom.w})`
    );
    assert.ok(
      Math.abs(shaft.sockets.top.d - crown.sockets.bottom.d) <= 8,
      `Shaft top socket depth (${shaft.sockets.top.d}) must mate with Crown bottom depth (${crown.sockets.bottom.d})`
    );

    console.log(`✔ Brief "${brief}" -> Recipe: [${res1.recipe.join(" + ")}] (Height: ${res1.height}m)`);
  }
});
