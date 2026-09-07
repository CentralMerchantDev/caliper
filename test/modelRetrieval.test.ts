// =============================================================================
// CALIPER — MODEL RETRIEVAL & RULE ZERO EVALUATION TEST SUITE (Phases R1.1 - R1.7)
// =============================================================================

import test from "node:test";
import assert from "node:assert/strict";

import { ASSET_REGISTRY } from "../public/asset-registry.js";
import {
  InMemoryVectorize,
  buildEmbeddingText,
  embedText,
  embedTextBatch,
  indexRegistryInVectorize,
  indexRegistryWithPseudo,
  vectorSearch,
  pseudoVectorSearch,
  lexicalSearch,
  findModels,
  entryFitsSpace,
  handTunedPseudoEmbedding,
  AssetEntry,
} from "../src/modelRetrieval.ts";
import { createWorkersAIClient } from "../src/clientWorkersAI.ts";
import { HELD_OUT_SET, DEV_SET, GoldenPair } from "./modelRetrievalGolden.ts";
import {
  SCIFACT_QUERIES,
  SCIFACT_DOCS,
  SCIFACT_QRELS,
  computeNDCGAtK,
} from "./beirSciFactSubset.ts";

const registry = ASSET_REGISTRY as Record<string, AssetEntry>;
const registryCount = Object.keys(registry).length;

// Initialize real Cloudflare Workers AI client
const ai = createWorkersAIClient();

// =============================================================================
// RULE ZERO: REPRODUCE PUBLISHED BENCHMARK (BEIR SciFact nDCG@10 Anchor)
// =============================================================================

test("Rule Zero — External Anchor: Reproduce published BEIR SciFact benchmark numbers", async () => {
  console.log("\n=============================================================================");
  console.log("   RULE ZERO: BEIR SCIFACT BENCHMARK VALIDATION (@cf/baai/bge-small-en-v1.5)");
  console.log("=============================================================================");

  // 1. Index SciFact documents with Real Workers AI embeddings
  const realSciFactIndex = new InMemoryVectorize(384);
  const docTexts = SCIFACT_DOCS.map((d) => `${d.title} · ${d.text}`);
  const realDocVectors = await embedTextBatch(docTexts, ai);

  await realSciFactIndex.upsert(
    SCIFACT_DOCS.map((d, i) => ({
      id: d.id,
      values: realDocVectors[i],
      metadata: { id: d.id, title: d.title, embedder: "workers-ai:bge-small-en-v1.5" },
    }))
  );

  // 2. Index SciFact documents with Hand-Tuned Pseudo-Embedding baseline
  const pseudoSciFactIndex = new InMemoryVectorize(384);
  await pseudoSciFactIndex.upsert(
    SCIFACT_DOCS.map((d) => ({
      id: d.id,
      values: handTunedPseudoEmbedding(`${d.title} · ${d.text}`, 384),
      metadata: { id: d.id, title: d.title, embedder: "hand-tuned-pseudo" },
    }))
  );

  // Map qrels
  const qrelsMap = new Map<string, string[]>();
  for (const q of SCIFACT_QRELS) {
    if (!qrelsMap.has(q.queryId)) qrelsMap.set(q.queryId, []);
    qrelsMap.get(q.queryId)!.push(q.docId);
  }

  // 3. Evaluate Real Workers AI vs Hand-Tuned Pseudo vs BM25
  let realSumNDCG = 0;
  let realHitsP1 = 0;

  let pseudoSumNDCG = 0;
  let pseudoHitsP1 = 0;

  let bm25SumNDCG = 0;
  let bm25HitsP1 = 0;

  for (const q of SCIFACT_QUERIES) {
    const goldDocs = qrelsMap.get(q.id) || [];

    // Real Vector Search
    const qVec = await embedText(q.text, ai);
    const realRes = await realSciFactIndex.query(qVec, { topK: 10 });
    const realRankedIds = realRes.matches.map((m) => m.id);
    const realNdcg = computeNDCGAtK(realRankedIds, goldDocs, 10);
    realSumNDCG += realNdcg;
    if (goldDocs.includes(realRankedIds[0])) realHitsP1++;

    // Pseudo Vector Search
    const pseudoVec = handTunedPseudoEmbedding(q.text, 384);
    const pseudoRes = await pseudoSciFactIndex.query(pseudoVec, { topK: 10 });
    const pseudoRankedIds = pseudoRes.matches.map((m) => m.id);
    const pseudoNdcg = computeNDCGAtK(pseudoRankedIds, goldDocs, 10);
    pseudoSumNDCG += pseudoNdcg;
    if (goldDocs.includes(pseudoRankedIds[0])) pseudoHitsP1++;

    // BM25 / Lexical Search
    const qTokens = q.text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
    const bm25Scores = SCIFACT_DOCS.map((d) => {
      const text = `${d.title} ${d.text}`.toLowerCase();
      let score = 0;
      for (const t of qTokens) {
        if (text.includes(t)) score += 1.0;
      }
      return { id: d.id, score };
    }).sort((a, b) => b.score - a.score);

    const bm25RankedIds = bm25Scores.slice(0, 10).map((m) => m.id);
    const bm25Ndcg = computeNDCGAtK(bm25RankedIds, goldDocs, 10);
    bm25SumNDCG += bm25Ndcg;
    if (goldDocs.includes(bm25RankedIds[0])) bm25HitsP1++;
  }

  const N = SCIFACT_QUERIES.length;
  const realNDCG10 = (realSumNDCG / N) * 100;
  const realP1 = (realHitsP1 / N) * 100;

  const pseudoNDCG10 = (pseudoSumNDCG / N) * 100;
  const pseudoP1 = (pseudoHitsP1 / N) * 100;

  const bm25NDCG10 = (bm25SumNDCG / N) * 100;
  const bm25P1 = (bm25HitsP1 / N) * 100;

  console.log(`Pipeline                 | nDCG@10 (Published ~67.7%) | Precision@1`);
  console.log(`-------------------------|----------------------------|------------`);
  console.log(`Real @cf/baai/bge-small  |           ${realNDCG10.toFixed(1)}%            |    ${realP1.toFixed(1)}%`);
  console.log(`Hand-Tuned Pseudo-Table  |           ${pseudoNDCG10.toFixed(1)}%            |    ${pseudoP1.toFixed(1)}%`);
  console.log(`BM25 Lexical Baseline    |           ${bm25NDCG10.toFixed(1)}%            |    ${bm25P1.toFixed(1)}%`);
  console.log(`-----------------------------------------------------------------------------`);

  // Assert that real BGE-small reproduces strong retrieval on SciFact (published is ~67.7%)
  assert.ok(
    realNDCG10 >= 60.0,
    `Real BGE-small nDCG@10 must land near published figure (>=60%), got ${realNDCG10.toFixed(1)}%`
  );
});

// =============================================================================
// DOMAIN EVALUATION (Phases R1.1 - R1.7)
// =============================================================================

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
  console.log(`\n=== R1.1: Sample 10 Embedding Texts (Total: ${count}) ===`);
  for (const s of samples) {
    console.log(`[${s.id}] -> "${s.text}"`);
  }
});

test("R1.2 — Index all entries into Vectorize with real Workers AI embeddings", async () => {
  const vectorizeIndex = new InMemoryVectorize(384);
  const result = await indexRegistryInVectorize(registry, vectorizeIndex, ai);

  const desc = await vectorizeIndex.describe();
  console.log(`\n=== R1.2: Real Vectorize Index Stats ===`);
  console.log(`Indexed count: ${result.count}, Embedder: ${result.embedder}, Store count: ${desc.count}`);

  assert.equal(result.count, registryCount, "Upserted count must equal registry count");
  assert.equal(desc.count, registryCount, "Vectorize store count must equal registry count");
  assert.equal(result.embedder, "workers-ai:bge-small-en-v1.5");
});

test("R1.3 — Vector search returns cosine similarity scores in [-1, 1] and respects spatial constraints", async () => {
  const vectorizeIndex = new InMemoryVectorize(384);
  await indexRegistryInVectorize(registry, vectorizeIndex, ai);

  const query = "sustainable eco tower";
  const results = await vectorSearch(query, vectorizeIndex, { registry, ai, limit: 5 });

  assert.ok(results.length > 0, "Should return results");
  console.log(`\n=== R1.3: Real Vector Search Results for '${query}' ===`);
  for (const r of results) {
    console.log(`  Rank ${r.rank}: [${r.id}] Score: ${r.score.toFixed(4)} (${r.entry.name})`);
    assert.ok(r.score >= -1.0 && r.score <= 1.0, `Score ${r.score} should be cosine similarity in [-1, 1]`);
    assert.equal(r.embedder, "workers-ai:bge-small-en-v1.5");
  }

  // Spatial constraints test (fits 1x1 plot)
  const tightFitResults = await vectorSearch(query, vectorizeIndex, {
    registry,
    ai,
    fits: { w: 1, d: 1 },
    limit: 5,
  });

  for (const r of tightFitResults) {
    assert.ok(entryFitsSpace(r.entry, { w: 1, d: 1 }), `Entry ${r.id} must fit 1x1 plot`);
  }
});

function evaluateDomainBenchmark(
  set: GoldenPair[],
  searchFn: (q: string, category?: string) => Promise<Array<{ id: string; entry: AssetEntry }>>
) {
  return async () => {
    let hitsP1 = 0;
    let hitsP5 = 0;
    let hitsR10 = 0;
    let sumNDCG = 0;
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

      // Compute query nDCG@10 (single best match in top 10)
      let dcg = 0;
      for (let i = 0; i < top10.length; i++) {
        if (matchesExpected(top10[i].id, top10[i].entry)) {
          dcg += 1 / Math.log2(i + 2);
          break; // First relevant match sets DCG for single target
        }
      }
      const idcg = 1 / Math.log2(2);
      sumNDCG += dcg / idcg;

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
      ndcg10: (sumNDCG / total) * 100,
      hitsP1,
      hitsP5,
      hitsR10,
      failures,
    };
  };
}

test("R1.4 & R1.5 — Three-Column Domain Benchmark: Real BGE-small vs Hand-Tuned Pseudo vs BM25", async () => {
  // 1. Index with Real Workers AI
  const realIndex = new InMemoryVectorize(384);
  await indexRegistryInVectorize(registry, realIndex, ai);

  // 2. Index with Hand-Tuned Pseudo Baseline
  const pseudoIndex = new InMemoryVectorize(384);
  await indexRegistryWithPseudo(registry, pseudoIndex);

  // Evaluate on Held-Out Set
  const evalReal = evaluateDomainBenchmark(HELD_OUT_SET, async (q, cat) => {
    return vectorSearch(q, realIndex, { registry, ai, category: cat, limit: 10 });
  });
  const resReal = await evalReal();

  const evalPseudo = evaluateDomainBenchmark(HELD_OUT_SET, async (q, cat) => {
    return pseudoVectorSearch(q, pseudoIndex, { registry, category: cat, limit: 10 });
  });
  const resPseudo = await evalPseudo();

  const evalLexical = evaluateDomainBenchmark(HELD_OUT_SET, async (q, cat) => {
    return lexicalSearch(q, { registry, category: cat, limit: 10 });
  });
  const resLexical = await evalLexical();

  // Sub-split breakdowns
  const zeroOverlap = HELD_OUT_SET.filter((p) => p.type === "semantic_zero_overlap");
  const lexOverlap = HELD_OUT_SET.filter((p) => p.type === "lexical_overlap");

  const evalRealZero = evaluateDomainBenchmark(zeroOverlap, async (q, cat) => {
    return vectorSearch(q, realIndex, { registry, ai, category: cat, limit: 10 });
  });
  const resRealZero = await evalRealZero();

  const evalPseudoZero = evaluateDomainBenchmark(zeroOverlap, async (q, cat) => {
    return pseudoVectorSearch(q, pseudoIndex, { registry, category: cat, limit: 10 });
  });
  const resPseudoZero = await evalPseudoZero();

  const evalLexicalZero = evaluateDomainBenchmark(zeroOverlap, async (q, cat) => {
    return lexicalSearch(q, { registry, category: cat, limit: 10 });
  });
  const resLexicalZero = await evalLexicalZero();

  console.log(`\n=============================================================================`);
  console.log(`   HELD-OUT DOMAIN SET EVALUATION (N = ${HELD_OUT_SET.length}) — THREE-COLUMN COMPARISON`);
  console.log(`=============================================================================`);
  console.log(`Pipeline                 | nDCG@10 | Precision@1 | Precision@5 | Recall@10`);
  console.log(`-------------------------|---------|-------------|-------------|----------`);
  console.log(`Real @cf/baai/bge-small  |  ${resReal.ndcg10.toFixed(1)}%  |    ${resReal.p1.toFixed(1)}%    |    ${resReal.p5.toFixed(1)}%    |   ${resReal.r10.toFixed(1)}%`);
  console.log(`Hand-Tuned Pseudo-Table  |  ${resPseudo.ndcg10.toFixed(1)}%  |    ${resPseudo.p1.toFixed(1)}%    |    ${resPseudo.p5.toFixed(1)}%    |   ${resPseudo.r10.toFixed(1)}%`);
  console.log(`BM25 Lexical Baseline    |  ${resLexical.ndcg10.toFixed(1)}%  |    ${resLexical.p1.toFixed(1)}%    |    ${resLexical.p5.toFixed(1)}%    |   ${resLexical.r10.toFixed(1)}%`);
  console.log(`-----------------------------------------------------------------------------`);

  console.log(`\n--- Semantic Zero-Overlap Sub-Split (N = ${zeroOverlap.length}) ---`);
  console.log(`  Real BGE-small: P@1 = ${resRealZero.p1.toFixed(1)}% (${resRealZero.hitsP1}/${zeroOverlap.length}), nDCG@10 = ${resRealZero.ndcg10.toFixed(1)}%`);
  console.log(`  Hand-Tuned:     P@1 = ${resPseudoZero.p1.toFixed(1)}% (${resPseudoZero.hitsP1}/${zeroOverlap.length}), nDCG@10 = ${resPseudoZero.ndcg10.toFixed(1)}%`);
  console.log(`  BM25 Baseline:  P@1 = ${resLexicalZero.p1.toFixed(1)}% (${resLexicalZero.hitsP1}/${zeroOverlap.length}), nDCG@10 = ${resLexicalZero.ndcg10.toFixed(1)}%`);

  console.log(`\n--- Real BGE-small Failures on Held-Out Domain Set ---`);
  for (const f of resReal.failures) {
    console.log(`  [${f.id}] "${f.query}" -> Top 1: ${f.gotTop1}`);
    console.log(`      Expected: [${f.expected.join(", ")}]`);
    console.log(`      Top 5: [${f.top5.join(", ")}]`);
  }
});

test("R1.6 — Mark's original prompt: 'change this to a 30 ft eco friendly tower'", async () => {
  const vectorizeIndex = new InMemoryVectorize(384);
  await indexRegistryInVectorize(registry, vectorizeIndex, ai);

  const query = "change this to a 30 ft eco friendly tower";
  const results = await vectorSearch(query, vectorizeIndex, {
    registry,
    ai,
    limit: 5,
  });

  console.log(`\n=== R1.6: Resolution of Mark's Original Request (Real Model) ===`);
  console.log(`Prompt: "${query}"`);
  for (const r of results) {
    console.log(`  Rank ${r.rank}: [${r.id}] Score: ${r.score.toFixed(4)} | Name: "${r.entry.name}" | Design: "${r.entry.design}"`);
  }

  assert.ok(results.length > 0, "Must return candidate models");
  assert.equal(results[0].embedder, "workers-ai:bge-small-en-v1.5");
});

test("R1.7 — Fallback & Silent Degradation Guardrail", async () => {
  // Test 1: embedText without AI must reject
  await assert.rejects(async () => {
    // @ts-ignore
    await embedText("test query", null);
  }, /embedText requires an active WorkersAIBinding/);

  // Test 2: vectorSearch with mismatched embedder must reject
  const pseudoIndex = new InMemoryVectorize(384);
  await indexRegistryWithPseudo(registry, pseudoIndex);

  await assert.rejects(async () => {
    await vectorSearch("test query", pseudoIndex, { registry, ai, requireRealEmbeddings: true });
  }, /Evaluation failure: match .* was indexed with 'hand-tuned-pseudo'/);

  console.log(`\n=== R1.7: Fallback Guardrail Verified ===`);
  console.log(`✔ Silent fallback prohibited: embedText rejects if ai is missing`);
  console.log(`✔ Origin validation verified: vectorSearch rejects pseudo embeddings`);
});
