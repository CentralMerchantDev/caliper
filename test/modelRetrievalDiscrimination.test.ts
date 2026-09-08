import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { Bm25Index, computeNDCGAtK, excludeIdenticalDocumentId, type SciFactDoc } from "./beirSciFactSubset.ts";

// ArguAna Counterargs by Henning Wachsmuth, Shahbaz Syed, and Benno Stein.
// Primary source and license: https://zenodo.org/records/3973258, CC BY 4.0.
// Paper: https://aclanthology.org/P18-1023/
// BEIR archive: https://public.ukp.informatik.tu-darmstadt.de/thakur/BEIR/datasets/arguana.zip
// Data is fetched by test/fetchBeirDataset.mjs and checksum-verified, not redistributed here.

interface Query { id: string; text: string }

function readJsonLines<T>(file: string): T[] {
  return fs.readFileSync(file, "utf8").trim().split(/\r?\n/).map((line) => JSON.parse(line) as T);
}

const dataDirectory = path.join(process.cwd(), "test", "beir-arguana");
const requiredFiles = [path.join(dataDirectory, "corpus.jsonl"), path.join(dataDirectory, "queries.jsonl"), path.join(dataDirectory, "qrels", "test.tsv")];
const dataAvailable = requiredFiles.every((file) => fs.existsSync(file));
const missingDataReason = process.env.CALIPER_ARGUANA_UNAVAILABLE || "BEIR ArguAna data is missing; run node test/fetchBeirDataset.mjs arguana with network access";
const datasetTest = dataAvailable ? test : (name: string, fn: () => unknown) => test(`${name} — SKIP ${missingDataReason}`, { skip: missingDataReason }, fn);
const documents: SciFactDoc[] = (dataAvailable ? readJsonLines<{ _id: string; title: string; text: string }>(requiredFiles[0]) : [])
  .map((doc) => ({ id: doc._id, title: doc.title, text: doc.text }));
const queries: Query[] = (dataAvailable ? readJsonLines<{ _id: string; text: string }>(requiredFiles[1]) : [])
  .map((query) => ({ id: query._id, text: query.text }));
const qrels = new Map(
  (dataAvailable ? fs.readFileSync(requiredFiles[2], "utf8").trim().split(/\r?\n/).slice(1) : [])
    .map((line) => {
      const [queryId, documentId] = line.split("\t");
      return [queryId, [documentId]] as const;
    })
);

datasetTest("authentic BEIR ArguAna data has its published evaluation shape", () => {
  assert.equal(documents.length, 8_674);
  assert.equal(queries.length, 1_406);
  assert.equal(qrels.size, 1_406);
});

datasetTest("full ArguAna BM25 is rejected because current self-exclusion does not reproduce the paper-era result", () => {
  const index = new Bm25Index(documents);
  const measured = queries.reduce((sum, query) => {
    const scoredRanking = excludeIdenticalDocumentId(query.id, index.rank(query.text));
    return sum + computeNDCGAtK(scoredRanking, qrels.get(query.id) || [], 10);
  }, 0) / queries.length;
  console.log(`BEIR ArguAna BM25 nDCG@10: ${(measured * 100).toFixed(3)}% (published: 31.500%, tolerance: ±1.500 points)`);
  assert.ok(Math.abs(measured - 0.315) > 0.015, `ArguAna should remain rejected until it reproduces 31.500%; measured ${(measured * 100).toFixed(3)}%`);
});

datasetTest("ArguAna scoring excludes the query document from raw candidates", () => {
  const query = queries[0];
  const index = new Bm25Index(documents);
  const rawCandidates = index.rank(query.text);
  assert.ok(rawCandidates.includes(query.id), "the query's own corpus document must be present before exclusion");
  const scoredRanking = excludeIdenticalDocumentId(query.id, rawCandidates);
  assert.ok(!scoredRanking.includes(query.id), "the scored ranking must exclude the query's own document");
  console.log(`ArguAna exclusion proof for ${query.id}: raw rank ${rawCandidates.indexOf(query.id) + 1}; scored ranking contains self: ${scoredRanking.includes(query.id)}`);
});
