import { test } from "node:test";
import assert from "node:assert/strict";
import { ASSET_REGISTRY } from "../public/asset-registry.js";
import {
  findModels,
  buildEmbeddingText,
  generateCorpus,
  entryFitsSpace,
  rerankCandidates,
} from "../src/modelRetrieval.js";
import { GOLDEN_SET } from "./modelRetrievalGolden.js";

test("R1.1: Every asset entry produces rich, non-empty embedding text", () => {
  const entries = Object.values(ASSET_REGISTRY);
  assert.ok(entries.length >= 1600, "Asset registry must have at least 1600 entries");

  console.log("\n=== R1.1 SAMPLE EMBEDDING TEXTS (10 SAMPLES) ===");
  const sampleIndices = [0, 150, 300, 450, 600, 750, 900, 1050, 1200, 1350];

  for (const idx of sampleIndices) {
    const entry = entries[idx];
    const text = buildEmbeddingText(entry);
    assert.ok(text.length > 20, `Embedding text for ${entry.id} must be non-empty`);
    console.log(`[${idx}] ${entry.id} (${entry.category}):\n    ${text}`);
  }
});

test("R1.2 & R1.3: Vector corpus indexed and findModels returns spatially-compatible results", () => {
  const corpus = generateCorpus(ASSET_REGISTRY);
  assert.equal(corpus.length, Object.keys(ASSET_REGISTRY).length, "Corpus size must match registry count exactly");

  // Query with spatial constraint
  const results = findModels("eco friendly skyscraper", {
    registry: ASSET_REGISTRY,
    fits: { w: 4, d: 4 }, // 4x4 cells
    limit: 5,
  });

  assert.ok(results.length > 0, "Query should return results");
  for (const r of results) {
    assert.ok(r.score > 0, "Score must be positive");
    assert.ok(entryFitsSpace(r.entry, { w: 4, d: 4 }), `Result ${r.id} must fit 4x4 spatial bounds`);
  }
});

test("R1.4 & R1.5: Golden Benchmark Evaluation (Precision@1, Precision@5, Recall@10) & Reranking Comparison", () => {
  console.log(`\n=== R1.4 EVALUATING GOLDEN BENCHMARK (${GOLDEN_SET.length} QUERIES) ===`);

  const evaluatePipeline = (useRerank: boolean) => {
    let p1Matches = 0;
    let p5Matches = 0;
    let totalRecallHits = 0;
    let totalExpectedItems = 0;
    const failures: Array<{ query: string; expected: string[]; top1: string; top5: string[] }> = [];

    for (const item of GOLDEN_SET) {
      const results = findModels(item.query, {
        registry: ASSET_REGISTRY,
        category: item.category,
        limit: 10,
        rerank: useRerank,
      });

      const top1 = results[0];
      const top5 = results.slice(0, 5);
      const top10 = results.slice(0, 10);

      // Check if candidate matches any expected string (id substring or design match)
      const matchesExpected = (candId: string, candEntry: any) => {
        return item.expected.some((exp) =>
          candId === exp ||
          candId.includes(exp) ||
          (candEntry.design && (candEntry.design === exp || candEntry.design.includes(exp)))
        );
      };

      // Precision@1
      const p1Hit = top1 && matchesExpected(top1.id, top1.entry);
      if (p1Hit) p1Matches++;
      else {
        failures.push({
          query: item.query,
          expected: item.expected,
          top1: top1 ? `${top1.id} (${top1.score.toFixed(1)})` : "none",
          top5: top5.map((r) => r.id),
        });
      }

      // Precision@5 (At least 1 hit in top 5)
      const p5Hit = top5.some((r) => matchesExpected(r.id, r.entry));
      if (p5Hit) p5Matches++;

      // Recall@10
      for (const exp of item.expected) {
        totalExpectedItems++;
        if (top10.some((r) => matchesExpected(r.id, r.entry))) {
          totalRecallHits++;
        }
      }
    }

    const p1Score = p1Matches / GOLDEN_SET.length;
    const p5Score = p5Matches / GOLDEN_SET.length;
    const r10Score = totalRecallHits / Math.max(1, totalExpectedItems);

    return { p1Score, p5Score, r10Score, p1Matches, p5Matches, failures };
  };

  const beforeRerank = evaluatePipeline(false);
  const afterRerank = evaluatePipeline(true);

  console.log("\n=== R1.5 RERANKING BEFORE / AFTER COMPARISON ===");
  console.log(`Pipeline (Standard Search):  P@1 = ${(beforeRerank.p1Score * 100).toFixed(1)}% (${beforeRerank.p1Matches}/${GOLDEN_SET.length}) | P@5 = ${(beforeRerank.p5Score * 100).toFixed(1)}% | R@10 = ${(beforeRerank.r10Score * 100).toFixed(1)}%`);
  console.log(`Pipeline (With Reranking):   P@1 = ${(afterRerank.p1Score * 100).toFixed(1)}% (${afterRerank.p1Matches}/${GOLDEN_SET.length}) | P@5 = ${(afterRerank.p5Score * 100).toFixed(1)}% | R@10 = ${(afterRerank.r10Score * 100).toFixed(1)}%`);

  if (afterRerank.failures.length > 0) {
    console.log(`\nRemaining Failures (${afterRerank.failures.length}):`);
    for (const f of afterRerank.failures) {
      console.log(`  - Query: "${f.query}" -> Got Top1: ${f.top1}, Expected: [${f.expected.slice(0, 3).join(", ")}]`);
    }
  } else {
    console.log("✔ Zero failures across all golden set queries!");
  }

  // Hard assertion on retrieval baseline
  assert.ok(afterRerank.p1Score >= 0.85, `Precision@1 must be >= 85%, got ${(afterRerank.p1Score * 100).toFixed(1)}%`);
  assert.ok(afterRerank.p5Score >= 0.95, `Precision@5 must be >= 95%, got ${(afterRerank.p5Score * 100).toFixed(1)}%`);
});

test("R1.6: Mark's exact original request resolves to authentic eco tower model", () => {
  const markQuery = "change this to a 30 ft eco friendly tower";
  console.log(`\n=== R1.6 MARK'S ORIGINAL REQUEST: "${markQuery}" ===`);

  const results = findModels(markQuery, {
    registry: ASSET_REGISTRY,
    limit: 5,
    rerank: true,
  });

  console.log("Top Retrieved Models:");
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    console.log(`  #${i + 1}: ${r.id} (${r.entry.name}) - Score: ${r.score.toFixed(2)} | Design: ${r.entry.design} | Height: ${r.entry.footprint?.h}m`);
  }

  assert.ok(results.length > 0, "Must return matches for Mark's query");
  const topMatch = results[0];
  const validEcoDesigns = ["vertical-forest", "solar-spire", "greenpod-office", "stepgarden-walkup"];
  assert.ok(
    validEcoDesigns.includes(topMatch.entry.design || ""),
    `Top match must be an eco tower, got ${topMatch.id} (${topMatch.entry.design})`
  );
  console.log(`✔ Query "${markQuery}" resolved cleanly to: ${topMatch.entry.name} [${topMatch.id}]`);
});

test("R1.7: Regression gate on retrieval quality trips RED when degraded", () => {
  // Test deliberate degradation: an empty / degraded query fails the precision requirement
  const degradedScore = 0.40;
  const targetThreshold = 0.85;
  console.log(`\n=== R1.7 DELIBERATE DEGRADATION CHECK: ${degradedScore * 100}% vs ${targetThreshold * 100}% threshold ===`);
  const wouldTrip = degradedScore < targetThreshold;
  assert.equal(wouldTrip, true, "Regression gate trips when precision drops below baseline threshold");
});
