import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { createWorkersAIClient } from "../src/clientWorkersAI.ts";
import { embedText, embedTextBatch } from "../src/modelRetrieval.ts";
import {
  Bm25Index,
  SCIFACT_DATA_AVAILABLE,
  SCIFACT_DOCS,
  SCIFACT_QRELS,
  SCIFACT_QUERIES,
  computeNDCGAtK,
} from "./beirSciFactSubset.ts";

const PUBLISHED_BEIR_BM25_NDCG10 = 0.665;
const BM25_TOLERANCE = 0.015;
const QUERY_PREFIX = "Represent this sentence for searching relevant passages: ";
const SPEND_SKIP_REASON = "SKIP live Workers AI inference: CALIPER_ALLOW_SPEND=1 is required";
const spendAllowed = process.env.CALIPER_ALLOW_SPEND === "1";
const missingDataReason = process.env.CALIPER_SCIFACT_UNAVAILABLE || "BEIR SciFact data is missing; run node test/fetchBeirSciFact.mjs with network access";
const datasetTest = SCIFACT_DATA_AVAILABLE ? test : (name: string, fn: () => unknown) => test(`${name} — SKIP ${missingDataReason}`, { skip: missingDataReason }, fn);
const liveTest = !SCIFACT_DATA_AVAILABLE
  ? datasetTest
  : spendAllowed ? test : (name: string, fn: () => unknown) => test(`${name} — ${SPEND_SKIP_REASON}`, { skip: SPEND_SKIP_REASON }, fn);
const cacheFile = path.join(process.cwd(), ".wrangler", "scifact-bge-small-v1.5-embeddings.json");

interface EmbeddingCache {
  fingerprint: string;
  model: string;
  queryPrefix: string;
  documentVectors: number[][];
  queryVectors: number[][];
}

function qrelsByQuery(): Map<string, string[]> {
  const result = new Map<string, string[]>();
  for (const qrel of SCIFACT_QRELS) {
    const docs = result.get(qrel.queryId) || [];
    docs.push(qrel.docId);
    result.set(qrel.queryId, docs);
  }
  return result;
}

function corpusFingerprint(): string {
  const hash = createHash("sha256");
  for (const doc of SCIFACT_DOCS) hash.update(`${doc.id}\0${doc.title}\0${doc.text}\0`);
  for (const query of SCIFACT_QUERIES) hash.update(`${query.id}\0${query.text}\0`);
  return hash.digest("hex");
}

function cosine(left: number[], right: number[]): number {
  let score = 0;
  for (let index = 0; index < left.length; index++) score += left[index] * right[index];
  return score;
}

function rankDense(queryVector: number[], documentVectors: number[][]): string[] {
  return documentVectors.map((vector, index) => ({
    id: SCIFACT_DOCS[index].id,
    score: cosine(queryVector, vector),
    index,
  })).sort((left, right) => right.score - left.score || left.index - right.index).map((result) => result.id);
}

async function loadOrCreateEmbeddings(): Promise<EmbeddingCache> {
  const fingerprint = corpusFingerprint();
  if (fs.existsSync(cacheFile)) {
    const cached = JSON.parse(fs.readFileSync(cacheFile, "utf8")) as EmbeddingCache;
    assert.equal(cached.fingerprint, fingerprint, "embedding cache corpus fingerprint mismatch");
    assert.equal(cached.model, "@cf/baai/bge-small-en-v1.5");
    assert.equal(cached.queryPrefix, QUERY_PREFIX);
    assert.equal(cached.documentVectors.length, SCIFACT_DOCS.length);
    assert.equal(cached.queryVectors.length, SCIFACT_QUERIES.length);
    console.log(`Loaded authenticated embedding cache: ${cacheFile}`);
    return cached;
  }

  const ai = createWorkersAIClient();
  const documentVectors: number[][] = [];
  let calls = 0;
  for (let offset = 0; offset < SCIFACT_DOCS.length; offset += 100) {
    const batch = SCIFACT_DOCS.slice(offset, offset + 100).map((doc) => `${doc.title} ${doc.text}`);
    const vectors = await embedTextBatch(batch, ai);
    documentVectors.push(...vectors.map((vector) => Array.from(vector)));
    calls++;
    console.log(`Embedded documents ${offset + 1}-${offset + batch.length} of ${SCIFACT_DOCS.length}; calls ${calls}/352`);
  }
  const queryVectors: number[][] = [];
  for (let index = 0; index < SCIFACT_QUERIES.length; index++) {
    queryVectors.push(Array.from(await embedText(`${QUERY_PREFIX}${SCIFACT_QUERIES[index].text}`, ai)));
    calls++;
    if ((index + 1) % 25 === 0 || index + 1 === SCIFACT_QUERIES.length) {
      console.log(`Embedded queries ${index + 1}/${SCIFACT_QUERIES.length}; calls ${calls}/352`);
    }
  }
  assert.equal(calls, 352, "the authorized run must make exactly 352 inference calls");
  const cache = { fingerprint, model: "@cf/baai/bge-small-en-v1.5", queryPrefix: QUERY_PREFIX, documentVectors, queryVectors };
  fs.mkdirSync(path.dirname(cacheFile), { recursive: true });
  fs.writeFileSync(cacheFile, JSON.stringify(cache), "utf8");
  return cache;
}

datasetTest("authentic BEIR SciFact data has the published evaluation shape", () => {
  assert.equal(SCIFACT_DOCS.length, 5_183);
  assert.equal(SCIFACT_QUERIES.length, 300);
  assert.equal(new Set(SCIFACT_QRELS.map((qrel) => qrel.queryId)).size, 300);
  assert.ok(SCIFACT_QRELS.length > SCIFACT_QUERIES.length, "real qrels are not a one-to-one sequential map");
});

datasetTest("full SciFact BM25 reproduces the BEIR paper nDCG@10", () => {
  const index = new Bm25Index(SCIFACT_DOCS);
  const qrels = qrelsByQuery();
  const measured = SCIFACT_QUERIES.reduce((sum, query) => {
    return sum + computeNDCGAtK(index.rank(query.text), qrels.get(query.id) || [], 10);
  }, 0) / SCIFACT_QUERIES.length;

  console.log(`BEIR SciFact BM25 nDCG@10: ${(measured * 100).toFixed(3)}% (published: 66.500%, tolerance: ±1.500 points)`);
  assert.ok(
    Math.abs(measured - PUBLISHED_BEIR_BM25_NDCG10) <= BM25_TOLERANCE,
    `BM25 must reproduce 66.500% within ±1.500 points; measured ${(measured * 100).toFixed(3)}%`
  );
});

liveTest("full SciFact BGE-small beats the reproduced BM25 baseline", async () => {
  const cache = await loadOrCreateEmbeddings();
  const qrels = qrelsByQuery();
  const bm25 = new Bm25Index(SCIFACT_DOCS);
  let denseSum = 0;
  let bm25Sum = 0;
  const mutate = process.env.CALIPER_MUTATE_EMBEDDINGS === "1";
  const documentVectors = mutate
    ? cache.documentVectors.map((_, index, vectors) => vectors[(index + 1) % vectors.length])
    : cache.documentVectors;

  for (let index = 0; index < SCIFACT_QUERIES.length; index++) {
    const query = SCIFACT_QUERIES[index];
    const relevant = qrels.get(query.id) || [];
    denseSum += computeNDCGAtK(rankDense(cache.queryVectors[index], documentVectors), relevant, 10);
    bm25Sum += computeNDCGAtK(bm25.rank(query.text), relevant, 10);
  }
  const denseScore = denseSum / SCIFACT_QUERIES.length;
  const bm25Score = bm25Sum / SCIFACT_QUERIES.length;
  const gap = denseScore - bm25Score;
  console.log(`SciFact BGE-small nDCG@10: ${(denseScore * 100).toFixed(3)}%`);
  console.log(`SciFact reproduced BM25 nDCG@10: ${(bm25Score * 100).toFixed(3)}%`);
  console.log(`SciFact dense-minus-BM25 gap: ${(gap * 100).toFixed(3)} points`);
  console.log(`Embedding mutation: ${mutate ? "document vectors shifted by one position" : "none"}`);
  assert.ok(gap > 0, `BGE-small must beat reproduced BM25; measured gap ${(gap * 100).toFixed(3)} points`);

  if (!mutate) {
    console.log("SciFact corpus trend (fixed SHA-256 document order; only queries with every relevant document present):");
    console.log("documents | eligible queries | BGE nDCG@10 | BM25 nDCG@10 | gap points");
    const orderedIds = SCIFACT_DOCS.map((doc) => doc.id).sort((left, right) =>
      createHash("sha256").update(left).digest("hex").localeCompare(createHash("sha256").update(right).digest("hex"))
    );
    for (const size of [500, 1_000, 2_500, 5_183]) {
      const allowedIds = new Set(orderedIds.slice(0, size));
      const subsetDocs = SCIFACT_DOCS.filter((doc) => allowedIds.has(doc.id));
      const subsetBm25 = new Bm25Index(subsetDocs);
      let subsetDenseSum = 0;
      let subsetBm25Sum = 0;
      let eligible = 0;
      for (let index = 0; index < SCIFACT_QUERIES.length; index++) {
        const query = SCIFACT_QUERIES[index];
        const relevant = qrels.get(query.id) || [];
        if (relevant.length === 0 || !relevant.every((id) => allowedIds.has(id))) continue;
        const denseRanking = rankDense(cache.queryVectors[index], cache.documentVectors).filter((id) => allowedIds.has(id));
        subsetDenseSum += computeNDCGAtK(denseRanking, relevant, 10);
        subsetBm25Sum += computeNDCGAtK(subsetBm25.rank(query.text), relevant, 10);
        eligible++;
      }
      const subsetDense = subsetDenseSum / eligible;
      const subsetLexical = subsetBm25Sum / eligible;
      console.log(`${size} | ${eligible} | ${(subsetDense * 100).toFixed(3)}% | ${(subsetLexical * 100).toFixed(3)}% | ${((subsetDense - subsetLexical) * 100).toFixed(3)}`);
    }
  }
});
