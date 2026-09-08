// =============================================================================
// CALIPER — PLANNING CORPUS RETRIEVAL & ABSTENTION TEST SUITE (Phase R3)
//
// Validates:
//   - R3.1: Chunking docs/CITY-PLANNING-SPEC.md and indexing into Vectorize
//   - R3.2: explainLayout(question) with precise passage citations
//   - R3.3: Retrieval quality (nDCG@10, P@1, P@5, R@10) on 30-item golden set
//   - R3.4: Abstention gate on 5 unanswerable questions (5/5 must abstain)
// =============================================================================

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import { InMemoryVectorize } from "../src/modelRetrieval.ts";
import { createWorkersAIClient } from "../src/clientWorkersAI.ts";
import {
  chunkPlanningSpec,
  indexPlanningCorpus,
  explainLayout,
  PlanningChunk,
} from "../src/planningCorpusRetrieval.ts";
import {
  PLANNING_GOLDEN_QUESTIONS,
  UNANSWERABLE_QUESTIONS,
} from "./planningCorpusGolden.ts";
import { computeNDCGAtK } from "./beirSciFactSubset.ts";

const SPEND_SKIP_REASON = "SKIP live Workers AI inference: CALIPER_ALLOW_SPEND=1 is required";
const spendAllowed = process.env.CALIPER_ALLOW_SPEND === "1";
const liveTest = spendAllowed ? test : (name: string, fn: () => unknown) => test(`${name} — ${SPEND_SKIP_REASON}`, { skip: SPEND_SKIP_REASON }, fn);
const ai = spendAllowed ? createWorkersAIClient() : null as never;
const docText = fs.readFileSync("docs/CITY-PLANNING-SPEC.md", "utf8");
const chunks = chunkPlanningSpec(docText);

let planningVectorize: InMemoryVectorize;

liveTest("R3.1 — Chunk CITY-PLANNING-SPEC and index into planning Vectorize index", async () => {
  assert.ok(chunks.length >= 25, `Expected >= 25 chunks, got ${chunks.length}`);

  // Verify chunk structure
  for (const c of chunks) {
    assert.ok(c.id.length > 0, "Chunk id must not be empty");
    assert.ok(c.section.length > 0, "Chunk section must not be empty");
    assert.ok(c.text.length > 10, "Chunk text must be substantial");
    assert.ok(c.endLine >= c.startLine, "End line must be >= start line");
  }

  planningVectorize = new InMemoryVectorize(384);
  const indexedCount = await indexPlanningCorpus(chunks, planningVectorize, ai);
  assert.equal(indexedCount, chunks.length, "All chunks must be indexed into Vectorize");
  assert.equal(planningVectorize.vectors.size, chunks.length, "Vectorize store size must match chunk count");
});

liveTest("R3.2 & R3.3 — Golden set evaluation with citations (30 questions)", async () => {
  if (!planningVectorize) {
    planningVectorize = new InMemoryVectorize(384);
    await indexPlanningCorpus(chunks, planningVectorize, ai);
  }

  let hitsP1 = 0;
  let hitsP5 = 0;
  let hitsR10 = 0;
  let sumNDCG = 0;
  const failures: { id: string; question: string; expected: string; got: string; score: number }[] = [];

  for (const item of PLANNING_GOLDEN_QUESTIONS) {
    // 1. Vector query directly
    const qVec = await ai.run("@cf/baai/bge-small-en-v1.5", { text: item.question });
    const vectorData = (Array.isArray(qVec.data[0]) ? qVec.data[0] : qVec.data) as number[];
    const searchRes = await planningVectorize.query(vectorData, { topK: 10 });
    const rankedIds = searchRes.matches.map((m) => m.id);

    const top1 = rankedIds[0];
    const match1 = top1 === item.expectedChunkId;
    const match5 = rankedIds.slice(0, 5).includes(item.expectedChunkId);
    const match10 = rankedIds.slice(0, 10).includes(item.expectedChunkId);

    if (match1) hitsP1++;
    if (match5) hitsP5++;
    if (match10) hitsR10++;

    const ndcg = computeNDCGAtK(rankedIds, [item.expectedChunkId], 10);
    sumNDCG += ndcg;

    if (!match1) {
      failures.push({
        id: item.id,
        question: item.question,
        expected: item.expectedChunkId,
        got: top1 || "none",
        score: searchRes.matches[0]?.score || 0,
      });
    }

    // 2. Test explainLayout() returns citation
    const explanation = await explainLayout(item.question, planningVectorize, {
      ai,
      chunks,
      tauAbstain: 0.61,
    });
    assert.equal(explanation.abstained, false, `Question "${item.question}" should not abstain`);
    assert.ok(explanation.citation, "Explanation must contain citation");
    assert.equal(explanation.citation.doc, "docs/CITY-PLANNING-SPEC.md");
    assert.ok(explanation.citation.startLine > 0);
    assert.ok(explanation.citation.endLine >= explanation.citation.startLine);
  }

  const N = PLANNING_GOLDEN_QUESTIONS.length;
  const p1 = (hitsP1 / N) * 100;
  const p5 = (hitsP5 / N) * 100;
  const r10 = (hitsR10 / N) * 100;
  const meanNDCG = (sumNDCG / N) * 100;

  console.log("\n=============================================================================");
  console.log("   PHASE R3: PLANNING CORPUS RETRIEVAL BENCHMARK (@cf/baai/bge-small-en-v1.5)");
  console.log("=============================================================================");
  console.log(`Corpus Size:               ${chunks.length} planning spec sections`);
  console.log(`Held-Out Question Set:     ${N} domain questions`);
  console.log(`Mean nDCG@10:              ${meanNDCG.toFixed(1)}%`);
  console.log(`Precision@1 (P@1):         ${p1.toFixed(1)}% (${hitsP1}/${N})`);
  console.log(`Precision@5 (P@5):         ${p5.toFixed(1)}% (${hitsP5}/${N})`);
  console.log(`Recall@10 (R@10):          ${r10.toFixed(1)}% (${hitsR10}/${N})`);
  console.log(`Failures at Rank 1:        ${failures.length}`);

  if (failures.length > 0) {
    console.log("\nFailures Breakdown:");
    for (const f of failures) {
      console.log(`  - [${f.id}] "${f.question}" -> expected "${f.expected}", got "${f.got}" (score: ${f.score.toFixed(4)})`);
    }
  }

  assert.ok(p1 >= 60.0, `Expected P@1 >= 60.0%, got ${p1.toFixed(1)}%`);
  assert.ok(meanNDCG >= 70.0, `Expected nDCG@10 >= 70.0%, got ${meanNDCG.toFixed(1)}%`);
});

liveTest("R3.4 — Abstention Gate: 5 unanswerable questions must all abstain (5/5)", async () => {
  if (!planningVectorize) {
    planningVectorize = new InMemoryVectorize(384);
    await indexPlanningCorpus(chunks, planningVectorize, ai);
  }

  console.log("\n=============================================================================");
  console.log("   PHASE R3.4: ABSTENTION GATE VERIFICATION (5 UNANSWERABLE QUESTIONS)");
  console.log("=============================================================================");

  let abstentionCount = 0;

  for (const q of UNANSWERABLE_QUESTIONS) {
    const res = await explainLayout(q, planningVectorize, {
      ai,
      chunks,
      tauAbstain: 0.61,
    });

    console.log(`Query: "${q}"`);
    console.log(`  -> Abstained: ${res.abstained}, Score: ${res.score.toFixed(4)}, Explanation: "${res.explanation}"`);

    if (res.abstained && res.explanation === "the corpus does not cover this") {
      abstentionCount++;
      assert.equal(res.searchedCorpus, "docs/CITY-PLANNING-SPEC.md");
      assert.equal(res.topChunk, null);
      assert.equal(res.citation, null);
    }
  }

  console.log(`\nAbstention Success: ${abstentionCount} / ${UNANSWERABLE_QUESTIONS.length} (100% required)`);
  assert.equal(
    abstentionCount,
    UNANSWERABLE_QUESTIONS.length,
    `All ${UNANSWERABLE_QUESTIONS.length} unanswerable questions must abstain with 'the corpus does not cover this'`
  );
  console.log("✔ R3.4 Gate Passed: System abstains honestly when corpus does not cover the query!");
});
