// =============================================================================
// CALIPER — PLANNING CORPUS RETRIEVAL & EXPLANATION (Phase R3)
//
// Chunks and indexes docs/CITY-PLANNING-SPEC.md and planning sources into
// Vectorize, implements explainLayout() with precise passage citations, and
// enforces R3.4 abstention when similarity falls below tau_abstain.
// =============================================================================

import {
  InMemoryVectorize,
  embedText,
  embedTextBatch,
} from "./modelRetrieval.ts";
import type { WorkersAIBinding } from "./modelRetrieval.ts";

export interface VectorizeIndex {
  upsert(vectors: any[]): Promise<{ count: number }>;
  query(vector: number[] | Float32Array, options?: any): Promise<any>;
}

export interface PlanningChunk {
  id: string;
  section: string;
  parentHeader: string;
  startLine: number;
  endLine: number;
  text: string;
}

export interface PlanningCitation {
  doc: string;
  section: string;
  startLine: number;
  endLine: number;
}

export interface LayoutExplanationResult {
  abstained: boolean;
  explanation: string;
  searchedCorpus: string;
  score: number;
  topChunk: PlanningChunk | null;
  citation: PlanningCitation | null;
}

/**
 * Chunks a markdown planning document by headers (## and ###).
 */
export function chunkPlanningSpec(markdownText: string, docPath: string = "docs/CITY-PLANNING-SPEC.md"): PlanningChunk[] {
  const lines = markdownText.split("\n");
  const chunks: PlanningChunk[] = [];

  let currentParent = "Introduction";
  let currentSection = "Introduction";
  let currentStart = 1;
  let currentLines: string[] = [];

  function flushChunk(endLine: number) {
    const text = currentLines.join("\n").trim();
    if (text.length > 0) {
      const sectionId = currentSection
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      chunks.push({
        id: sectionId || "section-" + (chunks.length + 1),
        section: currentSection,
        parentHeader: currentParent,
        startLine: currentStart,
        endLine: endLine,
        text,
      });
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    if (line.startsWith("## ")) {
      flushChunk(lineNum - 1);
      currentParent = line.replace(/^##s+/, "").trim();
      currentSection = currentParent;
      currentStart = lineNum;
      currentLines = [line];
    } else if (line.startsWith("### ")) {
      flushChunk(lineNum - 1);
      currentSection = line.replace(/^###s+/, "").trim();
      currentStart = lineNum;
      currentLines = [line];
    } else {
      currentLines.push(line);
    }
  }

  flushChunk(lines.length);
  return chunks;
}

/**
 * Indexes planning corpus chunks into Vectorize using real Workers AI embeddings.
 */
export async function indexPlanningCorpus(
  chunks: PlanningChunk[],
  vectorize: VectorizeIndex,
  ai: WorkersAIBinding
): Promise<number> {
  const texts = chunks.map((c) => `${c.parentHeader} · ${c.section}\n\n${c.text}`);
  const vectors = await embedTextBatch(texts, ai);

  const records = chunks.map((c, i) => ({
    id: c.id,
    values: vectors[i],
    metadata: {
      id: c.id,
      section: c.section,
      parentHeader: c.parentHeader,
      startLine: c.startLine,
      endLine: c.endLine,
      embedder: "workers-ai:bge-small-en-v1.5",
    },
  }));

  await vectorize.upsert(records);
  return records.length;
}

/**
 * Answers layout and planning questions with source citations and abstention.
 *
 * @param question The user query regarding city planning or layout rules
 * @param vectorize The planning Vectorize index
 * @param options Configuration options including active Workers AI binding and abstention threshold
 */
export async function explainLayout(
  question: string,
  vectorize: VectorizeIndex,
  options: {
    ai: WorkersAIBinding;
    chunks: PlanningChunk[];
    tauAbstain?: number;
    docPath?: string;
  }
): Promise<LayoutExplanationResult> {
  const {
    ai,
    chunks,
    tauAbstain = 0.61,
    docPath = "docs/CITY-PLANNING-SPEC.md",
  } = options;

  const chunksMap = new Map<string, PlanningChunk>();
  for (const c of chunks) chunksMap.set(c.id, c);

  const qVec = await embedText(question, ai);
  const searchResults = await vectorize.query(qVec, { topK: 5, returnMetadata: "all" });

  const topMatch = searchResults.matches[0];
  const topScore = topMatch?.score ?? 0;

  // R3.4 Abstention Gate: when similarity score is below threshold, abstain
  if (!topMatch || topScore < tauAbstain) {
    return {
      abstained: true,
      explanation: "the corpus does not cover this",
      searchedCorpus: docPath,
      score: topScore,
      topChunk: null,
      citation: null,
    };
  }

  const chunk = chunksMap.get(topMatch.id) || null;
  if (!chunk) {
    return {
      abstained: true,
      explanation: "the corpus does not cover this",
      searchedCorpus: docPath,
      score: topScore,
      topChunk: null,
      citation: null,
    };
  }

  return {
    abstained: false,
    explanation: chunk.text,
    searchedCorpus: docPath,
    score: topScore,
    topChunk: chunk,
    citation: {
      doc: docPath,
      section: chunk.section,
      startLine: chunk.startLine,
      endLine: chunk.endLine,
    },
  };
}
