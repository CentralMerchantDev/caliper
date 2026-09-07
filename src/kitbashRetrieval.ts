// =============================================================================
// CALIPER — KITBASH PART RETRIEVAL & NATURAL-LANGUAGE ASSEMBLER (Phase R2)
//
// Enables semantic search across the 62 modular kitbash parts and natural-language
// brief assembly with socket-contract verification and deterministic output.
// =============================================================================

import { KITBASH_PARTS, resolvePalette, CELL_M } from "../public/kitbash-parts.js";
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

export interface KitbashPartDef {
  id: string;
  name: string;
  category: "podium" | "shaft" | "crown" | "roof" | "connector" | "fabric";
  foot: { w: number; d: number };
  height: number;
  sockets: {
    bottom: { w: number; d: number };
    top: { w: number; d: number };
  };
  buildGeometry?: Function;
}

export interface KitbashSearchResult {
  id: string;
  score: number;
  part: KitbashPartDef;
}

/**
 * Builds rich, dense architectural embedding text for a kitbash part.
 */
export function buildKitbashEmbeddingText(part: KitbashPartDef): string {
  const words = part.id.split("-").join(" ");
  const footStr = part.foot ? part.foot.w + "x" + part.foot.d + "m" : "";
  const hStr = part.height ? part.height + "m tall" : "";
  const bSock = part.sockets && part.sockets.bottom ? "bottom socket " + part.sockets.bottom.w + "x" + part.sockets.bottom.d + "m" : "";
  const tSock = part.sockets && part.sockets.top ? "top socket " + part.sockets.top.w + "x" + part.sockets.top.d + "m" : "";

  return [
    part.name,
    "Category: " + part.category,
    "ID: " + part.id,
    "Typology & Style: " + words,
    footStr,
    hStr,
    bSock,
    tSock,
  ]
    .filter(Boolean)
    .join(" · ");
}

/**
 * Indexes the 62 kitbash parts into a Vectorize index using real Workers AI embeddings.
 */
export async function indexKitbashParts(
  parts: Record<string, KitbashPartDef>,
  vectorize: VectorizeIndex,
  ai: WorkersAIBinding
): Promise<number> {
  const entries = Object.values(parts);
  const texts = entries.map((p) => buildKitbashEmbeddingText(p));
  const vectors = await embedTextBatch(texts, ai);

  const records = entries.map((p, i) => ({
    id: p.id,
    values: vectors[i],
    metadata: {
      id: p.id,
      name: p.name,
      category: p.category,
      footW: p.foot?.w ?? 0,
      footD: p.foot?.d ?? 0,
      height: p.height ?? 0,
      socketBottomW: p.sockets?.bottom?.w ?? 0,
      socketBottomD: p.sockets?.bottom?.d ?? 0,
      socketTopW: p.sockets?.top?.w ?? 0,
      socketTopD: p.sockets?.top?.d ?? 0,
      embedder: "workers-ai:bge-small-en-v1.5",
    },
  }));

  await vectorize.upsert(records);
  return records.length;
}

/**
 * Finds kitbash parts matching a natural-language description and optional socket constraints.
 */
export async function findKitbashParts(
  query: string,
  vectorize: VectorizeIndex,
  options: {
    ai: WorkersAIBinding;
    parts?: Record<string, KitbashPartDef>;
    category?: string;
    socketBottom?: { w: number; d: number; tolerance?: number };
    socketTop?: { w: number; d: number; tolerance?: number };
    footMax?: { w: number; d: number };
    limit?: number;
  }
): Promise<KitbashSearchResult[]> {
  const {
    ai,
    parts = KITBASH_PARTS as Record<string, KitbashPartDef>,
    category,
    socketBottom,
    socketTop,
    footMax,
    limit = 10,
  } = options;

  const qVec = await embedText(query, ai);
  const searchResults = await vectorize.query(qVec, {
    topK: Math.max(limit * 3, 20),
    returnMetadata: "all",
  });

  const results: KitbashSearchResult[] = [];
  const tol = 8; // Mating tolerance (1 standard 8m cell)

  for (const match of searchResults.matches) {
    const part = parts[match.id];
    if (!part) continue;

    // Filter by category if requested
    if (category && part.category !== category) continue;

    // Filter by footprint boundary if requested
    if (footMax) {
      if (part.foot && (part.foot.w > footMax.w || part.foot.d > footMax.d)) continue;
    }

    // Filter by bottom socket mating constraint
    if (socketBottom && part.sockets?.bottom) {
      const allowed = socketBottom.tolerance ?? tol;
      if (
        Math.abs(part.sockets.bottom.w - socketBottom.w) > allowed ||
        Math.abs(part.sockets.bottom.d - socketBottom.d) > allowed
      ) {
        continue;
      }
    }

    // Filter by top socket mating constraint
    if (socketTop && part.sockets?.top) {
      const allowed = socketTop.tolerance ?? tol;
      if (
        Math.abs(part.sockets.top.w - socketTop.w) > allowed ||
        Math.abs(part.sockets.top.d - socketTop.d) > allowed
      ) {
        continue;
      }
    }

    results.push({
      id: part.id,
      score: match.score,
      part,
    });

    if (results.length >= limit) break;
  }

  return results;
}

/**
 * Assembles a complete building from a natural-language brief using semantic retrieval.
 */
export async function assembleFromBrief(
  brief: string,
  vectorize: VectorizeIndex,
  options: {
    ai: WorkersAIBinding;
    foot?: { w: number; d: number };
    seed?: number | string;
    lod?: number;
    palette?: Record<string, number>;
    T?: any;
  }
) {
  const {
    ai,
    foot = { w: 32, d: 32 },
    seed = 42,
    lod = 0,
    palette = {},
    T,
  } = options;

  // 1. Retrieve best matching podium
  const podiumMatches = await findKitbashParts(brief, vectorize, {
    ai,
    category: "podium",
    footMax: foot,
    limit: 5,
  });
  const podium = podiumMatches[0]?.part || KITBASH_PARTS["podium-retail-colonnade"];
  const topSocketPod = podium.sockets.top;

  // 2. Retrieve best matching shaft mating with podium
  const shaftMatches = await findKitbashParts(brief, vectorize, {
    ai,
    category: "shaft",
    socketBottom: topSocketPod,
    limit: 5,
  });
  const shaft = shaftMatches[0]?.part || KITBASH_PARTS["shaft-curtain-wall-straight"];
  const topSocketShaft = shaft.sockets.top;

  // 3. Retrieve best matching crown mating with shaft
  const crownMatches = await findKitbashParts(brief, vectorize, {
    ai,
    category: "crown",
    socketBottom: topSocketShaft,
    limit: 5,
  });
  const crown = crownMatches[0]?.part || KITBASH_PARTS["crown-stepped-pyramid-deco"];
  const topSocketCrown = crown.sockets.top;

  // 4. Retrieve optional roof feature if socket exists
  let roofFeature = null;
  if (topSocketCrown && (topSocketCrown.w > 0 || topSocketCrown.d > 0)) {
    const roofMatches = await findKitbashParts(brief, vectorize, {
      ai,
      category: "roof",
      socketBottom: topSocketCrown,
      limit: 5,
    });
    roofFeature = roofMatches[0]?.part || null;
  }

  const recipe = [podium.id, shaft.id, crown.id];
  if (roofFeature) recipe.push(roofFeature.id);

  let partsGeos: any[] = [];
  let totalHeight = 0;

  if (T) {
    let currentY = 0;
    // Build Podium
    const podGeos = podium.buildGeometry(T, palette, lod);
    for (const g of podGeos) partsGeos.push(g);
    currentY += podium.height;

    // Build Shaft
    const shaftGeos = shaft.buildGeometry(T, palette, lod);
    for (const g of shaftGeos) {
      g.geo.translate(0, currentY, 0);
      partsGeos.push(g);
    }
    currentY += shaft.height;

    // Build Crown
    const crownGeos = crown.buildGeometry(T, palette, lod);
    for (const g of crownGeos) {
      g.geo.translate(0, currentY, 0);
      partsGeos.push(g);
    }
    currentY += crown.height;

    // Build Roof Feature
    if (roofFeature) {
      const roofGeos = roofFeature.buildGeometry(T, palette, lod);
      for (const g of roofGeos) {
        g.geo.translate(0, currentY, 0);
        partsGeos.push(g);
      }
      currentY += roofFeature.height;
    }

    totalHeight = currentY;
  } else {
    totalHeight = podium.height + shaft.height + crown.height + (roofFeature ? roofFeature.height : 0);
  }

  return {
    name: brief,
    recipe,
    height: totalHeight,
    foot: podium.foot,
    parts: partsGeos,
    podium,
    shaft,
    crown,
    roofFeature,
  };
}
