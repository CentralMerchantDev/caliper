import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { ASSET_REGISTRY } from "../public/asset-registry.js";
import {
  buildEmbeddingText,
  embedText,
  embedTextBatch,
  handTunedPseudoEmbedding,
  hasZeroTokenOverlap,
  lexicalSearch,
  type AssetEntry,
} from "../src/modelRetrieval.ts";
import { createWorkersAIClient } from "../src/clientWorkersAI.ts";
import { HELD_OUT_SET, ZERO_OVERLAP_CANDIDATES, type GoldenPair } from "./modelRetrievalGolden.ts";
import { BLIND_QUERY_CANDIDATES } from "./modelRetrievalBlindQueries.ts";
import { BLIND_LABELED_CANDIDATES } from "./modelRetrievalZeroOverlapExpansion.ts";

const registry = ASSET_REGISTRY as Record<string, AssetEntry>;
const entries = Object.entries(registry);
const QUERY_PREFIX = "Represent this sentence for searching relevant passages: ";
const cacheFile = path.join(process.cwd(), ".wrangler", "domain-bge-small-v1.5-embeddings.json");
const SPEND_SKIP_REASON = "SKIP live Workers AI inference: CALIPER_ALLOW_SPEND=1 is required";
const spendAllowed = process.env.CALIPER_ALLOW_SPEND === "1";
const liveTest = spendAllowed ? test : (name: string, fn: () => unknown) => test(`${name} — ${SPEND_SKIP_REASON}`, { skip: SPEND_SKIP_REASON }, fn);

interface Cache { fingerprint: string; documentVectors: number[][]; queryVectors: number[][]; blindQueryVectors?: number[][]; blindQueryIds?: string[] }
interface Ranked { id: string; entry: AssetEntry }

function fingerprint(): string {
  const hash = createHash("sha256");
  for (const [id, entry] of entries) hash.update(`${id}\0${buildEmbeddingText(entry)}\0`);
  for (const item of HELD_OUT_SET) hash.update(`${item.id}\0${item.query}\0`);
  return hash.digest("hex");
}

function targetEntries(item: GoldenPair): AssetEntry[] {
  return entries.filter(([id, entry]) => item.expected.some((expected) => id.includes(expected) || entry.design?.includes(expected)))
    .map(([, entry]) => entry);
}

const qualifiedZeroOverlap = ZERO_OVERLAP_CANDIDATES.filter((item) => {
  const targets = targetEntries(item);
  return targets.length > 0 && targets.every((entry) => hasZeroTokenOverlap(item.query, buildEmbeddingText(entry)));
});
const qualifiedBlindExpansion = BLIND_LABELED_CANDIDATES.filter((item) => {
  const targets = targetEntries(item);
  return targets.length > 0 && targets.every((entry) => hasZeroTokenOverlap(item.query, buildEmbeddingText(entry)));
});

test("R2.4 — blind zero-overlap expansion has at least 30 code-qualified queries", () => {
  console.log(`Blind candidates authored before labeling: ${BLIND_QUERY_CANDIDATES.length}`);
  console.log(`Candidates with later target labels: ${BLIND_LABELED_CANDIDATES.length}`);
  console.log(`Candidates qualifying after stemming and stopword removal: ${qualifiedBlindExpansion.length}`);
  console.log(`Qualification attrition: ${BLIND_LABELED_CANDIDATES.length - qualifiedBlindExpansion.length}/${BLIND_LABELED_CANDIDATES.length}`);
  assert.equal(BLIND_QUERY_CANDIDATES.length, 80);
  assert.equal(BLIND_LABELED_CANDIDATES.length, 50);
  assert.equal(qualifiedBlindExpansion.length, 33);
});

function cosine(left: number[], right: number[]): number {
  let result = 0;
  for (let index = 0; index < left.length; index++) result += left[index] * right[index];
  return result;
}

function matches(item: GoldenPair, result: Ranked): boolean {
  return item.expected.some((expected) => result.id.includes(expected) || result.entry.design?.includes(expected));
}

function denseRank(queryVector: number[], item: GoldenPair, documentVectors: number[][]): Ranked[] {
  return entries.map(([id, entry], index) => ({ id, entry, index, score: cosine(queryVector, documentVectors[index]) }))
    .filter((result) => !item.category || result.entry.category === item.category)
    .sort((left, right) => right.score - left.score || left.index - right.index);
}

function pseudoRank(item: GoldenPair): Ranked[] {
  const query = Array.from(handTunedPseudoEmbedding(item.query, 384));
  const vectors = entries.map(([, entry]) => Array.from(handTunedPseudoEmbedding(buildEmbeddingText(entry), 384)));
  return denseRank(query, item, vectors);
}

function lexicalRank(item: GoldenPair): Ranked[] {
  return lexicalSearch(item.query, { registry, category: item.category, limit: entries.length });
}

function reciprocalRankFusion(dense: Ranked[], lexical: Ranked[], k = 60): Ranked[] {
  const scores = new Map<string, { result: Ranked; score: number }>();
  for (const ranking of [dense, lexical]) ranking.forEach((result, index) => {
    const current = scores.get(result.id) || { result, score: 0 };
    current.score += 1 / (k + index + 1);
    scores.set(result.id, current);
  });
  return [...scores.values()].sort((left, right) => right.score - left.score || left.result.id.localeCompare(right.result.id))
    .map(({ result }) => result);
}

function score(items: GoldenPair[], rankings: Map<string, Ranked[]>): { hits: number; ndcg10: number } {
  let hits = 0;
  let ndcg = 0;
  for (const item of items) {
    const ranked = rankings.get(item.id) || [];
    if (ranked[0] && matches(item, ranked[0])) hits++;
    const firstRelevant = ranked.slice(0, 10).findIndex((result) => matches(item, result));
    if (firstRelevant >= 0) ndcg += 1 / Math.log2(firstRelevant + 2);
  }
  return { hits, ndcg10: ndcg / items.length };
}

async function loadOrCreateCache(): Promise<Cache> {
  const expectedFingerprint = fingerprint();
  if (fs.existsSync(cacheFile)) {
    const cache = JSON.parse(fs.readFileSync(cacheFile, "utf8")) as Cache;
    assert.equal(cache.fingerprint, expectedFingerprint);
    assert.equal(cache.documentVectors.length, entries.length);
    assert.equal(cache.queryVectors.length, HELD_OUT_SET.length);
    console.log(`Loaded authenticated domain embedding cache: ${cacheFile}`);
    if (!cache.blindQueryVectors) {
      const ai = createWorkersAIClient();
      cache.blindQueryVectors = [];
      let calls = 0;
      for (const item of qualifiedBlindExpansion) {
        cache.blindQueryVectors.push(Array.from(await embedText(`${QUERY_PREFIX}${item.query}`, ai)));
        calls++;
      }
      assert.equal(calls, qualifiedBlindExpansion.length, "the cache extension must embed every qualified query exactly once");
      cache.blindQueryIds = qualifiedBlindExpansion.map((item) => item.id);
      fs.writeFileSync(cacheFile, JSON.stringify(cache), "utf8");
      console.log(`Extended domain cache with ${calls} qualified blind-query vectors; calls ${calls}/${calls}`);
    }
    if (!cache.blindQueryIds && cache.blindQueryVectors.length === 38) {
      // Cache v1 was produced before the plural-stemming correction. Five
      // vehicle-category queries were then excluded; retain their IDs solely
      // to bind the remaining cached vectors to the requests that produced them.
      const rejectedVehicleIds = new Set(["blind-56", "blind-57", "blind-58", "blind-59", "blind-60"]);
      cache.blindQueryIds = BLIND_LABELED_CANDIDATES
        .filter((item) => qualifiedBlindExpansion.includes(item) || rejectedVehicleIds.has(item.id))
        .map((item) => item.id);
      assert.equal(cache.blindQueryIds.length, cache.blindQueryVectors.length);
      fs.writeFileSync(cacheFile, JSON.stringify(cache), "utf8");
    }
    return cache;
  }
  const ai = createWorkersAIClient();
  const documentVectors: number[][] = [];
  let calls = 0;
  for (let offset = 0; offset < entries.length; offset += 100) {
    const texts = entries.slice(offset, offset + 100).map(([, entry]) => buildEmbeddingText(entry));
    documentVectors.push(...(await embedTextBatch(texts, ai)).map((vector) => Array.from(vector)));
    calls++;
  }
  const queryVectors: number[][] = [];
  for (const item of HELD_OUT_SET) {
    queryVectors.push(Array.from(await embedText(`${QUERY_PREFIX}${item.query}`, ai)));
    calls++;
  }
  const blindQueryVectors: number[][] = [];
  for (const item of qualifiedBlindExpansion) {
    blindQueryVectors.push(Array.from(await embedText(`${QUERY_PREFIX}${item.query}`, ai)));
    calls++;
  }
  assert.equal(calls, 46 + qualifiedBlindExpansion.length, "a cold domain run must embed each document batch and query exactly once");
  const cache: Cache = { fingerprint: expectedFingerprint, documentVectors, queryVectors, blindQueryVectors };
  cache.blindQueryIds = qualifiedBlindExpansion.map((item) => item.id);
  fs.mkdirSync(path.dirname(cacheFile), { recursive: true });
  fs.writeFileSync(cacheFile, JSON.stringify(cache), "utf8");
  return cache;
}

liveTest("R2.4 and R2.5 — report dense, lexical, pseudo, and RRF retrieval separately", async () => {
  assert.equal(qualifiedZeroOverlap.length, 5);
  const cache = await loadOrCreateCache();
  const rankings = {
    dense: new Map<string, Ranked[]>(),
    lexical: new Map<string, Ranked[]>(),
    pseudo: new Map<string, Ranked[]>(),
    hybrid: new Map<string, Ranked[]>(),
  };
  HELD_OUT_SET.forEach((item, index) => {
    const dense = denseRank(cache.queryVectors[index], item, cache.documentVectors);
    const lexical = lexicalRank(item);
    rankings.dense.set(item.id, dense);
    rankings.lexical.set(item.id, lexical);
    rankings.pseudo.set(item.id, pseudoRank(item));
    rankings.hybrid.set(item.id, reciprocalRankFusion(dense, lexical));
  });

  for (const [name, ranking] of Object.entries(rankings)) {
    const full = score(HELD_OUT_SET, ranking);
    const zero = score(qualifiedZeroOverlap, ranking);
    console.log(`${name}: full P@1 ${full.hits}/${HELD_OUT_SET.length}, nDCG@10 ${(full.ndcg10 * 100).toFixed(1)}%; ` +
      `qualified zero-overlap P@1 ${zero.hits}/${qualifiedZeroOverlap.length}, nDCG@10 ${(zero.ndcg10 * 100).toFixed(1)}%`);
  }
  console.log("Qualified zero-overlap split: n=5; too small for conclusions.");

  const expandedRankings = {
    dense: new Map<string, Ranked[]>(),
    lexical: new Map<string, Ranked[]>(),
    pseudo: new Map<string, Ranked[]>(),
    hybrid: new Map<string, Ranked[]>(),
  };
  assert.equal(cache.blindQueryVectors?.length, cache.blindQueryIds?.length);
  const blindVectorsById = new Map(cache.blindQueryIds!.map((id, index) => [id, cache.blindQueryVectors![index]]));
  qualifiedBlindExpansion.forEach((item) => {
    const queryVector = blindVectorsById.get(item.id);
    assert.ok(queryVector, `missing cached query vector for ${item.id}`);
    const dense = denseRank(queryVector, item, cache.documentVectors);
    const lexical = lexicalRank(item);
    expandedRankings.dense.set(item.id, dense);
    expandedRankings.lexical.set(item.id, lexical);
    expandedRankings.pseudo.set(item.id, pseudoRank(item));
    expandedRankings.hybrid.set(item.id, reciprocalRankFusion(dense, lexical));
  });
  for (const [name, ranking] of Object.entries(expandedRankings)) {
    const result = score(qualifiedBlindExpansion, ranking);
    console.log(`${name}: blind zero-overlap P@1 ${result.hits}/${qualifiedBlindExpansion.length}, nDCG@10 ${(result.ndcg10 * 100).toFixed(1)}%`);
  }
});
