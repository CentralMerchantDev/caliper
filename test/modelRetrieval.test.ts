// =============================================================================
// CALIPER — MODEL RETRIEVAL TEST SUITE (Phases R1.1 - R1.7)
// =============================================================================

import test from "node:test";
import assert from "node:assert/strict";

import { ASSET_REGISTRY } from "../public/asset-registry.js";
import {
  InMemoryVectorize,
  buildEmbeddingText,
  indexRegistryInVectorize,
  vectorSearch,
  lexicalSearch,
  findModels,
  entryFitsSpace,
  AssetEntry,
} from "../src/modelRetrieval.ts";
import { HELD_OUT_SET, DEV_SET, GoldenPair } from "./modelRetrievalGolden.ts";

const registry = ASSET_REGISTRY as Record<string, AssetEntry>;
const registryCount = Object.keys(registry).length;

test("R1.1 — Embedding text exists for every registry entry and contains key attributes", () => {
  let count = 0;
  const samples: Array<{ id: string; text: string }> = [];

  for (const [id, entry] of Object.entries(registry)) {
    const text = buildEmbeddingText(entry);
    assert.ok(text && text.length > 0, `Empty embedding text for entry ${id}`);
    count++;
    if (samples.length < 10) {
      samples.push({ id, text });
    }
  }

  assert.equal(count, registryCount);
  console.log(`\n=== R1.1: Sample 10 Embedding Texts (Total Indexed: ${count}) ===`);
  for (const s of samples) {
    console.log(`[${s.id}] -> "${s.text}"`);
  }
});

test("R1.2 — Index all entries into Vectorize; vector count equals registry count exactly", async () => {
  const vectorizeIndex = new InMemoryVectorize(384);
  const result = await indexRegistryInVectorize(registry, vectorizeIndex);

  const desc = await vectorizeIndex.describe();
  console.log(`\n=== R1.2: Vectorize Index Stats ===`);
  console.log(`Indexed count: ${result.count}, Vectorize store count: ${desc.count}, Dimensions: ${desc.dimensions}, Metric: ${desc.metric}`);

  assert.equal(result.count, registryCount, "Upserted count must equal registry count");
  assert.equal(desc.count, registryCount, "Vectorize store count must equal registry count");
});

test("R1.3 — Vector search returns cosine similarity scores in [-1, 1] and respects spatial constraints", async () => {
  const vectorizeIndex = new InMemoryVectorize(384);
  await indexRegistryInVectorize(registry, vectorizeIndex);

  const query = "sustainable eco tower";
  const results = await vectorSearch(query, vectorizeIndex, { registry, limit: 5 });

  assert.ok(results.length > 0, "Should return results");
  console.log(`\n=== R1.3: Vector Search Results for '${query}' ===`);
  for (const r of results) {
    console.log(`  Rank ${r.rank}: [${r.id}] Score: ${r.score.toFixed(4)} (${r.entry.name})`);
    assert.ok(r.score >= -1.0 && r.score <= 1.0, `Score ${r.score} should be cosine similarity in [-1, 1]`);
  }

  // Spatial constraints test (fits 1x1 plot)
  const tightFitResults = await vectorSearch(query, vectorizeIndex, {
    registry,
    fits: { w: 1, d: 1 },
    limit: 5,
  });

  for (const r of tightFitResults) {
    assert.ok(entryFitsSpace(r.entry, { w: 1, d: 1 }), `Entry ${r.id} must fit 1x1 plot`);
  }
});

function evaluateBenchmark(
  set: GoldenPair[],
  searchFn: (q: string, category?: string) => Promise<Array<{ id: string; entry: AssetEntry }>>
) {
  return async () => {
    let hitsP1 = 0;
    let hitsP5 = 0;
    let hitsR10 = 0;
    const failures: Array<{ id: string; query: string; expected: string[]; gotTop1: string; top5: string[] }> = [];

    for (const item of set) {
      const results = await searchFn(item.query, item.category);
      const top1 = results[0];
      const top5 = results.slice(0, 5);
      const top10 = results.slice(0, 10);

      const matchesExpected = (candId: string, candEntry: AssetEntry) => {
        return item.expected.some((exp) => candId.includes(exp) || (candEntry.design && candEntry.design.includes(exp)));
      };

      const p1Match = top1 && matchesExpected(top1.id, top1.entry);
      const p5Match = top5.some((r) => matchesExpected(r.id, r.entry));
      const r10Match = top10.some((r) => matchesExpected(r.id, r.entry));

      if (p1Match) hitsP1++;
      if (p5Match) hitsP5++;
      if (r10Match) hitsR10++;

      if (!p1Match) {
        failures.push({
          id: item.id,
          query: item.query,
          expected: item.expected,
          gotTop1: top1 ? `${top1.id} (${top1.entry?.design || ""})` : "NONE",
          top5: top5.map((r) => `${r.id} (${r.entry?.design || ""})`),
        });
      }
    }

    const total = set.length;
    return {
      total,
      p1: (hitsP1 / total) * 100,
      p5: (hitsP5 / total) * 100,
      r10: (hitsR10 / total) * 100,
      hitsP1,
      hitsP5,
      hitsR10,
      failures,
    };
  };
}

test("R1.4 & R1.5 — Side-by-side held-out evaluation: Lexical Baseline vs Vector Retrieval", async () => {
  const vectorizeIndex = new InMemoryVectorize(384);
  await indexRegistryInVectorize(registry, vectorizeIndex);

  // 1. Evaluate Lexical Baseline on HELD-OUT set
  const evalLexical = evaluateBenchmark(HELD_OUT_SET, async (q, cat) => {
    return lexicalSearch(q, { registry, category: cat, limit: 10 });
  });
  const resLexical = await evalLexical();

  // 2. Evaluate Vector Retrieval on HELD-OUT set
  const evalVector = evaluateBenchmark(HELD_OUT_SET, async (q, cat) => {
    return vectorSearch(q, vectorizeIndex, { registry, category: cat, limit: 10 });
  });
  const resVector = await evalVector();

  // 3. Sub-segment breakdown on held-out set (Semantic Zero-Overlap vs Lexical Overlap)
  const semanticZeroOverlap = HELD_OUT_SET.filter((p) => p.type === "semantic_zero_overlap");
  const lexicalOverlap = HELD_OUT_SET.filter((p) => p.type === "lexical_overlap");

  const evalVectorZero = evaluateBenchmark(semanticZeroOverlap, async (q, cat) => {
    return vectorSearch(q, vectorizeIndex, { registry, category: cat, limit: 10 });
  });
  const resVectorZero = await evalVectorZero();

  const evalVectorLex = evaluateBenchmark(lexicalOverlap, async (q, cat) => {
    return vectorSearch(q, vectorizeIndex, { registry, category: cat, limit: 10 });
  });
  const resVectorLex = await evalVectorLex();

  const evalLexicalZero = evaluateBenchmark(semanticZeroOverlap, async (q, cat) => {
    return lexicalSearch(q, { registry, category: cat, limit: 10 });
  });
  const resLexicalZero = await evalLexicalZero();

  const evalLexicalLex = evaluateBenchmark(lexicalOverlap, async (q, cat) => {
    return lexicalSearch(q, { registry, category: cat, limit: 10 });
  });
  const resLexicalLex = await evalLexicalLex();

  console.log(`\n=============================================================================`);
  console.log(`           HELD-OUT EVALUATION SET BENCHMARK (N = ${HELD_OUT_SET.length})`);
  console.log(`=============================================================================`);
  console.log(`Pipeline                 | Precision@1 | Precision@5 | Recall@10`);
  console.log(`-------------------------|-------------|-------------|----------`);
  console.log(`Lexical Baseline (BM25)  |   ${resLexical.p1.toFixed(1)}%     |   ${resLexical.p5.toFixed(1)}%     |  ${resLexical.r10.toFixed(1)}%`);
  console.log(`Vectorize Search (Dense) |   ${resVector.p1.toFixed(1)}%     |   ${resVector.p5.toFixed(1)}%     |  ${resVector.r10.toFixed(1)}%`);
  console.log(`-----------------------------------------------------------------------------`);
  console.log(`\n--- Breakdown: Semantic Zero-Overlap Queries (N = ${semanticZeroOverlap.length}) ---`);
  console.log(`  Lexical Baseline: P@1 = ${resLexicalZero.p1.toFixed(1)}% (${resLexicalZero.hitsP1}/${resLexicalZero.total})`);
  console.log(`  Vectorize Search: P@1 = ${resVectorZero.p1.toFixed(1)}% (${resVectorZero.hitsP1}/${resVectorZero.total})`);
  console.log(`\n--- Breakdown: Lexical Overlap Queries (N = ${lexicalOverlap.length}) ---`);
  console.log(`  Lexical Baseline: P@1 = ${resLexicalLex.p1.toFixed(1)}% (${resLexicalLex.hitsP1}/${resLexicalLex.total})`);
  console.log(`  Vectorize Search: P@1 = ${resVectorLex.p1.toFixed(1)}% (${resVectorLex.hitsP1}/${resVectorLex.total})`);

  console.log(`\n--- Vectorize Search Misses on Held-Out Set ---`);
  for (const f of resVector.failures) {
    console.log(`  [${f.id}] "${f.query}" -> Got Top1: ${f.gotTop1}`);
    console.log(`      Expected: [${f.expected.join(", ")}]`);
    console.log(`      Top 5: [${f.top5.join(", ")}]`);
  }

  // Vector retrieval should achieve strong performance on held-out set
  assert.ok(
    resVector.p1 >= 60.0,
    `Vectorize P@1 must achieve at least 60% on held-out set (Got ${resVector.p1.toFixed(1)}%)`
  );
});

test("R1.6 — Mark's original prompt: 'change this to a 30 ft eco friendly tower'", async () => {
  const vectorizeIndex = new InMemoryVectorize(384);
  await indexRegistryInVectorize(registry, vectorizeIndex);

  const query = "change this to a 30 ft eco friendly tower";
  const results = await findModels(query, {
    registry,
    vectorizeIndex,
    pipeline: "vectorize",
    limit: 5,
  });

  console.log(`\n=== R1.6: Resolution of Mark's Original Request ===`);
  console.log(`Prompt: "${query}"`);
  for (const r of results) {
    console.log(`  Rank ${r.rank}: [${r.id}] Score: ${r.score.toFixed(4)} | Name: "${r.entry.name}" | Design: "${r.entry.design}"`);
  }

  assert.ok(results.length > 0, "Must return candidate models");
  const top1Design = results[0].entry.design || results[0].id;
  assert.ok(
    ["vertical-forest", "solar-spire", "greenpod-office", "stepgarden-walkup"].includes(top1Design),
    `Top result should be an eco-friendly building, got: ${top1Design}`
  );
});

test("R1.7 — Regression gate on retrieval quality", async () => {
  const vectorizeIndex = new InMemoryVectorize(384);
  await indexRegistryInVectorize(registry, vectorizeIndex);

  const evalVector = evaluateBenchmark(HELD_OUT_SET, async (q, cat) => {
    return vectorSearch(q, vectorizeIndex, { registry, category: cat, limit: 10 });
  });
  const res = await evalVector();

  // Baseline threshold gate: Precision@1 on held-out set >= 60.0%
  const BASELINE_P1 = 60.0;
  console.log(`\n=== R1.7: Regression Gate Verification ===`);
  console.log(`Current Held-Out P@1: ${res.p1.toFixed(1)}% | Required Baseline: ${BASELINE_P1.toFixed(1)}%`);
  assert.ok(
    res.p1 >= BASELINE_P1,
    `Regression gate failed: P@1 ${res.p1.toFixed(1)}% fell below baseline ${BASELINE_P1}%`
  );
});
