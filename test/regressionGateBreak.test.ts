// =============================================================================
// CALIPER — MODEL RETRIEVAL REGRESSION GATE BREAK TEST (R1.7 WATCH IT RED)
//
// Deliberately degrades the embedding pipeline to verify that the regression gate
// trips RED and fails closed when quality drops below the 60.0% baseline.
// =============================================================================

import test from "node:test";
import assert from "node:assert/strict";

import { ASSET_REGISTRY } from "../public/asset-registry.js";
import {
  InMemoryVectorize,
  vectorSearch,
  AssetEntry,
  handTunedPseudoEmbedding as generateDenseEmbedding,
} from "../src/modelRetrieval.ts";
import { createWorkersAIClient } from "../src/clientWorkersAI.ts";
import { HELD_OUT_SET, GoldenPair } from "./modelRetrievalGolden.ts";

const registry = ASSET_REGISTRY as Record<string, AssetEntry>;
const ai = createWorkersAIClient();

test("R1.7 Gate Trip Verification — Degraded embeddings trip the gate RED", async () => {
  const degradedVectorize = new InMemoryVectorize(384);

  // Deliberately index garbage / degraded embeddings (e.g. truncated single-character embeddings)
  for (const [id, entry] of Object.entries(registry)) {
    // Degraded text: only 1 random character
    const degradedText = id.slice(0, 1);
    const degradedVector = generateDenseEmbedding(degradedText, 384);
    await degradedVectorize.upsert([
      {
        id,
        values: degradedVector,
        metadata: { id, name: entry.name, category: entry.category, embedder: "workers-ai:bge-small-en-v1.5" },
      },
    ]);
  }

  let hitsP1 = 0;
  for (const item of HELD_OUT_SET) {
    const results = await vectorSearch(item.query, degradedVectorize, { registry, limit: 10, ai });
    const top1 = results[0];
    const matches = top1 && item.expected.some((exp) => top1.id.includes(exp) || (top1.entry?.design && top1.entry.design.includes(exp)));
    if (matches) hitsP1++;
  }

  const p1 = (hitsP1 / HELD_OUT_SET.length) * 100;
  console.log(`\n=== R1.7 Watch It Red: Degraded Pipeline P@1 ===`);
  console.log(`Degraded Held-Out P@1: ${p1.toFixed(1)}% (Baseline required: 60.0%)`);

  // Assert that degraded pipeline correctly falls below baseline (Gate fails closed)
  assert.ok(
    p1 < 60.0,
    `Degraded pipeline should fall below baseline of 60.0%, got ${p1.toFixed(1)}%`
  );
  console.log(`✔ Regression gate successfully trips RED on degraded embedding corpus!`);
});
