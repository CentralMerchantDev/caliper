// Authentic BEIR SciFact loader and evaluation helpers.
// Dataset source: https://public.ukp.informatik.tu-darmstadt.de/thakur/BEIR/datasets/scifact.zip

import fs from "node:fs";
import path from "node:path";

export interface SciFactQuery { id: string; text: string }
export interface SciFactDoc { id: string; title: string; text: string }
export interface SciFactQrel { queryId: string; docId: string; score: number }

function readJsonLines<T>(file: string): T[] {
  return fs.readFileSync(file, "utf8").trim().split(/\r?\n/).map((line) => JSON.parse(line) as T);
}

const dataDirectory = path.join(process.cwd(), "test", "beir-scifact");
const rawDocs = readJsonLines<{ _id: string; title: string; text: string }>(path.join(dataDirectory, "corpus.jsonl"));
const rawQueries = readJsonLines<{ _id: string; text: string }>(path.join(dataDirectory, "queries.jsonl"));
const qrelLines = fs.readFileSync(path.join(dataDirectory, "qrels", "test.tsv"), "utf8").trim().split(/\r?\n/).slice(1);

export const SCIFACT_QRELS: SciFactQrel[] = qrelLines.map((line) => {
  const [queryId, docId, score] = line.split("\t");
  return { queryId, docId, score: Number(score) };
});
const testQueryIds = new Set(SCIFACT_QRELS.map((qrel) => qrel.queryId));

export const SCIFACT_DOCS: SciFactDoc[] = rawDocs.map((doc) => ({ id: doc._id, title: doc.title, text: doc.text }));
export const SCIFACT_QUERIES: SciFactQuery[] = rawQueries
  .filter((query) => testQueryIds.has(query._id))
  .map((query) => ({ id: query._id, text: query.text }));

const ENGLISH_STOP_WORDS = new Set("a an and are as at be but by for if in into is it no not of on or such that the their then there these they this to was will with".split(" "));

export function tokenizeForBm25(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9]+/g) || []).filter((token) => !ENGLISH_STOP_WORDS.has(token));
}

export class Bm25Index {
  private readonly documentFrequency = new Map<string, number>();
  private readonly documents: Array<{ id: string; length: number; frequencies: Map<string, number>; index: number }>;
  private readonly averageLength: number;

  constructor(docs: SciFactDoc[], private readonly k1 = 0.9, private readonly b = 0.4) {
    this.documents = docs.map((doc, index) => {
      const tokens = tokenizeForBm25(`${doc.title} ${doc.text}`);
      const frequencies = new Map<string, number>();
      for (const token of tokens) frequencies.set(token, (frequencies.get(token) || 0) + 1);
      for (const token of frequencies.keys()) this.documentFrequency.set(token, (this.documentFrequency.get(token) || 0) + 1);
      return { id: doc.id, length: tokens.length, frequencies, index };
    });
    this.averageLength = this.documents.reduce((sum, doc) => sum + doc.length, 0) / this.documents.length;
  }

  rank(query: string): string[] {
    const queryTokens = tokenizeForBm25(query);
    return this.documents.map((doc) => {
      let score = 0;
      for (const token of queryTokens) {
        const frequency = doc.frequencies.get(token) || 0;
        if (frequency === 0) continue;
        const containing = this.documentFrequency.get(token) || 0;
        const inverseDocumentFrequency = Math.log(1 + (this.documents.length - containing + 0.5) / (containing + 0.5));
        score += inverseDocumentFrequency * frequency * (this.k1 + 1) /
          (frequency + this.k1 * (1 - this.b + this.b * doc.length / this.averageLength));
      }
      return { id: doc.id, score, index: doc.index };
    }).sort((left, right) => right.score - left.score || left.index - right.index).map((result) => result.id);
  }
}

export function computeNDCGAtK(rankedDocIds: string[], goldRelevantDocIds: string[], k = 10): number {
  const goldSet = new Set(goldRelevantDocIds);
  if (goldSet.size === 0) return 0;
  let dcg = 0;
  for (let index = 0; index < Math.min(k, rankedDocIds.length); index++) {
    if (goldSet.has(rankedDocIds[index])) dcg += 1 / Math.log2(index + 2);
  }
  let idealDcg = 0;
  for (let index = 0; index < Math.min(k, goldSet.size); index++) idealDcg += 1 / Math.log2(index + 2);
  return dcg / idealDcg;
}

export function excludeIdenticalDocumentId(queryId: string, rankedDocIds: string[]): string[] {
  return rankedDocIds.filter((documentId) => documentId !== queryId);
}
