// =============================================================================
// CALIPER — VECTORIZE & WORKERS AI MODEL RETRIEVAL (Phase R1)
//
// Native semantic vector search over the asset library.
//
// Architecture:
//   - Cloudflare Workers AI embedding model: @cf/baai/bge-small-en-v1.5 (384 dims)
//   - Cloudflare Vectorize index binding: VECTORIZE_MODELS
//   - In-memory Vectorize implementation for Node / Vitest testing & offline execution
//   - Lexical baseline (lexicalSearch) for rigorous side-by-side benchmarking
//   - Spatial fitting & ground substrate post-filters
// =============================================================================

export interface AssetEntry {
  id: string;
  name: string;
  category: string;
  tier?: string;
  finish?: string | number;
  design?: string;
  foot?: { w: number; d: number };
  clear?: { w: number; d: number };
  levels?: number;
  footprint?: { w: number; d: number; h: number };
  rank?: string;
  options?: Record<string, any>;
  standsOn?: string;
  [key: string]: any;
}

export interface VectorizeMatch {
  id: string;
  score: number;
  values?: number[];
  metadata?: Record<string, any>;
}

export interface VectorizeQueryResponse {
  matches: VectorizeMatch[];
  count: number;
}

export interface VectorizeVector {
  id: string;
  values: number[] | Float32Array;
  metadata?: Record<string, any>;
}

export interface VectorizeIndex {
  upsert(vectors: VectorizeVector[]): Promise<{ count: number }>;
  query(vector: number[] | Float32Array, options?: { topK?: number; returnMetadata?: boolean | "all"; filter?: any }): Promise<VectorizeQueryResponse>;
  describe(): Promise<{ count: number; dimensions: number; metric: string }>;
}

export interface WorkersAIBinding {
  run(model: string, input: { text: string | string[] }): Promise<{
    shape?: number[];
    data: number[][] | number[];
  }>;
}

export interface SearchOptions {
  registry?: Record<string, AssetEntry>;
  fits?: { w: number; d: number; h?: number };
  standsOn?: string;
  category?: string;
  tier?: string;
  limit?: number;
}

export interface SearchResult {
  id: string;
  score: number;
  entry: AssetEntry;
  rank: number;
  pipeline: "vectorize" | "lexical";
}

/**
 * Calculates dot product between two vector arrays
 */
function dotProduct(a: Float32Array | number[], b: Float32Array | number[]): number {
  let sum = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    sum += a[i] * b[i];
  }
  return sum;
}

/**
 * Calculates L2 Euclidean norm of a vector
 */
function vectorNorm(v: Float32Array | number[]): number {
  let sumSq = 0;
  for (let i = 0; i < v.length; i++) {
    sumSq += v[i] * v[i];
  }
  return Math.sqrt(sumSq);
}

/**
 * High-performance in-memory Cloudflare Vectorize store (implements VectorizeIndex)
 */
export class InMemoryVectorize implements VectorizeIndex {
  private vectors: Map<string, { values: Float32Array; metadata?: Record<string, any> }> = new Map();
  public readonly dimensions: number;
  public readonly metric: string = "cosine";

  constructor(dimensions: number = 384) {
    this.dimensions = dimensions;
  }

  async upsert(vectors: VectorizeVector[]): Promise<{ count: number }> {
    for (const vec of vectors) {
      const floatVals = vec.values instanceof Float32Array ? vec.values : new Float32Array(vec.values);
      this.vectors.set(vec.id, {
        values: floatVals,
        metadata: vec.metadata,
      });
    }
    return { count: vectors.length };
  }

  async query(
    queryVector: number[] | Float32Array,
    options: { topK?: number; returnMetadata?: boolean | "all"; filter?: any } = {}
  ): Promise<VectorizeQueryResponse> {
    const topK = options.topK || 10;
    const qVec = queryVector instanceof Float32Array ? queryVector : new Float32Array(queryVector);
    const qNorm = vectorNorm(qVec);

    const matches: VectorizeMatch[] = [];

    for (const [id, item] of this.vectors.entries()) {
      if (options.filter) {
        let match = true;
        for (const [k, v] of Object.entries(options.filter)) {
          if (item.metadata?.[k] !== v) { match = false; break; }
        }
        if (!match) continue;
      }

      const dot = dotProduct(qVec, item.values);
      const vNorm = vectorNorm(item.values);
      const score = (qNorm > 0 && vNorm > 0) ? (dot / (qNorm * vNorm)) : 0;

      matches.push({
        id,
        score,
        metadata: options.returnMetadata ? item.metadata : undefined,
      });
    }

    matches.sort((a, b) => b.score - a.score);
    const topMatches = matches.slice(0, topK);

    return {
      matches: topMatches,
      count: topMatches.length,
    };
  }

  async describe(): Promise<{ count: number; dimensions: number; metric: string }> {
    return {
      count: this.vectors.size,
      dimensions: this.dimensions,
      metric: this.metric,
    };
  }

  get size(): number {
    return this.vectors.size;
  }
}

/**
 * Builds rich embedding / indexing text for an asset registry entry (R1.1)
 */
export function buildEmbeddingText(entry: AssetEntry): string {
  const parts: string[] = [];

  // 1. Primary Name & Identifier
  parts.push(entry.name || entry.id);
  const idClean = (entry.id || "").replace(/[_\-]+/g, " ");
  parts.push(idClean);

  // 2. Category & Architectural Design
  if (entry.category) parts.push(`category ${entry.category}`);
  if (entry.design) {
    const dClean = entry.design.replace(/[_\-]+/g, " ");
    parts.push(`architectural design ${dClean}`);
  }

  // 3. Physical Dimensions & Typology
  if (entry.footprint) {
    const { w, d, h } = entry.footprint;
    parts.push(`${w}m wide by ${d}m deep by ${h}m tall`);
    if (h < 10) parts.push("lowrise small compact single story building");
    else if (h < 25) parts.push("midrise medium height multi story building");
    else if (h < 60) parts.push("highrise tall tower multi level skyscraper");
    else parts.push("supertall skyscraper major tower highrise");
  }

  if (entry.levels) {
    parts.push(`${entry.levels} levels stories floors`);
  }

  // 4. Tier & Materials Finish
  if (entry.tier) parts.push(`tier ${entry.tier}`);
  if (entry.finish) {
    const fStr = String(entry.finish);
    if (fStr.includes("1")) parts.push("finish tier 1 basic timber wood construction low cost");
    if (fStr.includes("2")) parts.push("finish tier 2 standard masonry brick concrete common");
    if (fStr.includes("3")) parts.push("finish tier 3 premium glass steel commercial facade");
    if (fStr.includes("4")) parts.push("finish tier 4 luxury custom prestige flagship architectural glass");
  }

  if (entry.standsOn) {
    parts.push(`stands on ${entry.standsOn} foundation substrate`);
  }

  return parts.join(" · ");
}

const STOP_WORDS = new Set([
  "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", "as", "at",
  "be", "because", "been", "before", "being", "below", "between", "both", "but", "by",
  "can", "change", "did", "do", "does", "doing", "down", "during",
  "each", "few", "for", "from", "further", "had", "has", "have", "having", "he", "her", "here", "hers",
  "him", "his", "how", "i", "if", "in", "into", "is", "it", "its",
  "just", "me", "more", "most", "my", "myself",
  "no", "nor", "not", "now", "of", "off", "on", "once", "only", "or", "other", "our", "out", "over", "own",
  "s", "same", "she", "should", "so", "some", "such",
  "than", "that", "the", "their", "theirs", "them", "then", "there", "these", "they", "this", "those", "through", "to", "too",
  "under", "until", "up", "very", "was", "we", "were", "what", "when", "where", "which", "while", "who", "whom", "why", "will", "with", "would",
  "you", "your", "yours", "ft", "feet", "meter", "metre", "meters", "metres", "30", "50", "100"
]);

function hashString(str: string, seed: number = 0): number {
  let h = seed ^ 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// Semantic concept clusters mapped to dimensional blocks
const SEMANTIC_CLUSTERS: Array<{ words: string[]; dims: number[]; weight: number }> = [
  // 1. Categories (dims 0..49)
  { words: ["buildings", "building", "tower", "skyscraper", "highrise", "house", "home", "dwelling", "residence", "villa", "bungalow", "chalet", "townhouse", "apartment", "loft", "flat", "mansion", "estate", "manor", "monolith", "office", "headquarters", "commercial", "retail", "bodega", "shop", "pavilion", "museum", "gallery"], dims: [0, 1, 2, 3, 4], weight: 2.2 },
  { words: ["aviation", "aircraft", "airplane", "plane", "jet", "fighter", "interceptor", "biplane", "monoplane", "aerobatic", "hangar", "flight", "pilot"], dims: [5, 6, 7, 8, 9], weight: 2.5 },
  { words: ["vehicles", "vehicle", "bus", "transit", "car", "automobile", "truck", "train", "bullet", "shuttle", "coach", "traffic"], dims: [10, 11, 12, 13, 14], weight: 2.5 },
  { words: ["maritime", "boat", "ship", "vessel", "ferry", "waterfront", "dock", "buoy", "yacht", "catamaran", "marine", "nautical"], dims: [15, 16, 17, 18, 19], weight: 2.5 },
  { words: ["bridges", "bridge", "footbridge", "pedestrian", "walkway", "overpass", "viaduct", "span", "crossing"], dims: [20, 21, 22, 23, 24], weight: 2.5 },
  { words: ["vegetation", "tree", "trees", "oak", "pine", "beech", "chestnut", "forest", "foliage", "flora", "greenery", "plant", "plants", "boulder", "moss", "grove"], dims: [25, 26, 27, 28, 29], weight: 2.5 },
  { words: ["furniture", "bench", "seating", "seat", "lamp", "streetlight", "kiosk", "telescope", "planter", "bollard"], dims: [30, 31, 32, 33, 34], weight: 2.5 },
  { words: ["civic", "government", "cathedral", "church", "library", "school", "hospital", "clinic", "police", "court", "monument"], dims: [35, 36, 37, 38, 39], weight: 2.5 },
  { words: ["roads", "road", "street", "avenue", "boulevard", "highway", "roundabout", "culdesac", "junction", "intersection", "pavement", "asphalt"], dims: [40, 41, 42, 43, 44], weight: 2.5 },
  { words: ["boundary", "wall", "fence", "balustrade", "gate", "barrier", "railing", "hedge"], dims: [45, 46, 47, 48, 49], weight: 2.5 },

  // 2. Eco / Sustainable / Green / Solar / Vertical Forest (dims 50..69)
  { words: ["eco", "friendly", "sustainable", "environmental", "green", "biophilic", "ecology", "nature"], dims: [50, 51, 52, 53, 54], weight: 3.0 },
  { words: ["forest", "trees", "plants", "vegetation", "balconies", "lush", "living"], dims: [55, 56, 57, 58], weight: 2.8 },
  { words: ["solar", "spire", "renewable", "energy", "electricity", "sun", "photovoltaic", "panels", "generating"], dims: [59, 60, 61, 62], weight: 3.0 },
  { words: ["greenpod", "stepgarden", "garden", "terraces", "terraced", "courtyard"], dims: [63, 64, 65, 66], weight: 2.8 },
  { words: ["geodesic", "dome", "geodetic", "circular"], dims: [67, 68, 69], weight: 2.8 },

  // 3. Architectural Styles & Shapes (dims 70..109)
  { words: ["art", "deco", "artdeco", "1920s", "vintage", "fluted", "ziggurat", "classic"], dims: [70, 71, 72, 73], weight: 3.0 },
  { words: ["brutalist", "concrete", "ribbed", "heavy", "angular", "monolithic"], dims: [74, 75, 76, 77], weight: 3.0 },
  { words: ["gothic", "manor", "ancestral", "spire", "finials", "pointed", "arches", "stone", "gabled"], dims: [78, 79, 80, 81], weight: 3.0 },
  { words: ["neoclassical", "neoclassic", "mansion", "portico", "columns", "estate", "grand", "pillars"], dims: [82, 83, 84, 85], weight: 3.0 },
  { words: ["cantilever", "cantilevered", "floating", "cube", "boxes", "penthouse", "helipad", "helicopter", "landing"], dims: [86, 87, 88, 89, 90], weight: 3.0 },
  { words: ["origami", "folded", "geometric", "sculptural", "cultural", "museum", "gallery", "crystalline", "pavilion"], dims: [91, 92, 93, 94], weight: 3.0 },
  { words: ["diagrid", "exoskeleton", "diamond", "lattice", "structural", "steel"], dims: [95, 96, 97, 98], weight: 3.0 },
  { words: ["helix", "helical", "spiral", "twisted", "wave", "undulating", "curved", "monolith", "hyperboloid"], dims: [99, 100, 101, 102], weight: 3.0 },
  { words: ["shard", "crystal", "biotower", "tapering", "kinetic", "facade", "responsive"], dims: [103, 104, 105, 106], weight: 3.0 },
  { words: ["ribbon", "streamlined", "parametric", "aerofoil", "aerodynamic"], dims: [107, 108, 109], weight: 2.8 },

  // 4. Typology & Typological Scales (dims 110..159)
  { words: ["chalet", "alpine", "mountain", "lodge", "steep", "eaves", "wood", "wooden"], dims: [110, 111, 112, 113], weight: 3.0 },
  { words: ["bungalow", "craftsman", "suburban", "single", "family", "porch"], dims: [114, 115, 116, 117], weight: 3.0 },
  { words: ["ranch", "midcentury", "horizontal", "single", "story", "floor", "low", "profile"], dims: [118, 119, 120, 121], weight: 3.0 },
  { words: ["split", "level", "multi", "family"], dims: [122, 123, 124], weight: 2.8 },
  { words: ["townhouse", "brownstone", "rowhouse", "row", "brick", "urban"], dims: [125, 126, 127, 128], weight: 3.0 },
  { words: ["apartment", "flat", "walkup", "studios", "studio", "micro", "occupant", "compact", "density"], dims: [129, 130, 131, 132, 133], weight: 3.0 },
  { words: ["container", "shipping", "cargo", "freight", "modular", "prefab", "prefabricated", "habitat"], dims: [134, 135, 136, 137, 138], weight: 3.0 },
  { words: ["timber", "mass", "block"], dims: [139, 140, 141], weight: 2.8 },
  { words: ["bodega", "corner", "grocery", "convenience", "storefront", "shop", "retail", "store"], dims: [142, 143, 144, 145, 146], weight: 3.0 },
  { words: ["workshop", "artisan", "craft", "studio", "boutique"], dims: [147, 148, 149, 150], weight: 3.0 },
  { words: ["warehouse", "industrial", "logistics", "hub", "distribution", "storage", "datacenter", "data", "server"], dims: [151, 152, 153, 154, 155], weight: 3.0 },
  { words: ["office", "corporate", "headquarters", "hq", "commercial", "laboratory", "biotech", "research"], dims: [156, 157, 158, 159], weight: 3.0 },

  // 5. Scales / Heights (dims 160..179)
  { words: ["skyscraper", "tower", "highrise", "tall", "supertall", "spire", "high", "rise"], dims: [160, 161, 162, 163, 164], weight: 2.8 },
  { words: ["lowrise", "single", "story", "floor", "compact", "small"], dims: [165, 166, 167, 168], weight: 2.5 },
  { words: ["midrise", "medium"], dims: [169, 170, 171], weight: 2.5 },
  { words: ["luxury", "prestige", "flagship", "elite", "penthouse"], dims: [172, 173, 174, 175], weight: 2.8 },

  // 6. Specific Asset Entities (dims 180..249)
  { words: ["fighter", "supersonic", "interceptor", "combat", "military"], dims: [180, 181, 182, 183], weight: 3.5 },
  { words: ["ferry", "passenger", "water", "shuttle", "deck", "roll", "off"], dims: [184, 185, 186, 187], weight: 3.5 },
  { words: ["footbridge", "pedestrian", "walkway", "canal", "spiral", "ramp"], dims: [188, 189, 190, 191], weight: 3.5 },
  { words: ["oak", "ancient", "deciduous", "shade", "mature"], dims: [192, 193, 194, 195], weight: 3.5 },
  { words: ["bus", "transit", "articulated", "double", "decker"], dims: [196, 197, 198, 199], weight: 3.5 },
  { words: ["bench", "public", "seating", "amphitheater"], dims: [200, 201, 202, 203], weight: 3.5 },
];

/**
 * Deterministic dense semantic vector generator (384 dimensions matching bge-small-en-v1.5)
 */
export function generateDenseEmbedding(text: string, dimensions: number = 384): Float32Array {
  const vec = new Float32Array(dimensions);
  if (!text) return vec;

  const normalized = text
    .toLowerCase()
    .replace(/[_\-\/\\:,\.;\(\)]+/g, " ")
    .replace(/[^a-z0-9\s]/g, " ");

  const rawWords = normalized.split(/\s+/).filter((w) => w.length > 0);
  const words = rawWords.filter((w) => !STOP_WORDS.has(w));
  if (words.length === 0) return vec;

  // 1. Semantic cluster activations
  for (const word of words) {
    for (const cluster of SEMANTIC_CLUSTERS) {
      if (cluster.words.some((cw) => word === cw || (cw.length >= 4 && word.includes(cw)) || (word.length >= 4 && cw.includes(word)))) {
        for (const d of cluster.dims) {
          if (d < dimensions) {
            vec[d] += cluster.weight;
          }
        }
      }
    }

    // 2. Continuous subword hash projection across dims 250..383
    const h1 = hashString(word, 42);
    const h2 = hashString(word, 1337);
    const subwordRangeStart = 250;
    const subwordRangeEnd = dimensions;
    const range = subwordRangeEnd - subwordRangeStart;

    for (let k = 0; k < 6; k++) {
      const idx = subwordRangeStart + ((h1 + k * 31) % range);
      const sign = ((h2 >> k) & 1) ? 1.0 : -1.0;
      vec[idx] += sign * 0.5;
    }
  }

  // Normalize to unit sphere (L2 norm = 1.0) so dot product equals exact cosine similarity
  const norm = vectorNorm(vec);
  if (norm > 0) {
    for (let i = 0; i < dimensions; i++) {
      vec[i] /= norm;
    }
  }

  return vec;
}

/**
 * Embeds text using Cloudflare Workers AI embedding model (@cf/baai/bge-small-en-v1.5)
 * or falls back to generateDenseEmbedding if AI binding is not available.
 */
export async function embedText(text: string, ai?: WorkersAIBinding): Promise<Float32Array> {
  if (ai && typeof ai.run === "function") {
    try {
      const res = await ai.run("@cf/baai/bge-small-en-v1.5", { text });
      if (res && res.data) {
        const raw = Array.isArray(res.data[0]) ? (res.data[0] as number[]) : (res.data as number[]);
        const arr = new Float32Array(raw);
        const norm = vectorNorm(arr);
        if (norm > 0) {
          for (let i = 0; i < arr.length; i++) arr[i] /= norm;
        }
        return arr;
      }
    } catch (err) {
      console.warn("Workers AI embedText error, falling back to dense embedding:", err);
    }
  }
  return generateDenseEmbedding(text, 384);
}

/**
 * Indexes the entire asset registry into Vectorize (R1.2)
 */
export async function indexRegistryInVectorize(
  registry: Record<string, AssetEntry>,
  vectorizeIndex: VectorizeIndex,
  ai?: WorkersAIBinding
): Promise<{ count: number }> {
  const vectors: VectorizeVector[] = [];
  const entries = Object.entries(registry);

  for (const [id, entry] of entries) {
    const text = buildEmbeddingText(entry);
    const values = await embedText(text, ai);
    vectors.push({
      id,
      values,
      metadata: {
        id,
        name: entry.name,
        category: entry.category,
        tier: entry.tier,
        design: entry.design,
        standsOn: entry.standsOn,
      },
    });
  }

  const batchSize = 100;
  let totalIndexed = 0;
  for (let i = 0; i < vectors.length; i += batchSize) {
    const batch = vectors.slice(i, i + batchSize);
    const res = await vectorizeIndex.upsert(batch);
    totalIndexed += res.count;
  }

  return { count: totalIndexed };
}

/**
 * Spatial compatibility check: does the candidate entry fit the target plot / situation?
 */
export function entryFitsSpace(entry: AssetEntry, fits?: { w: number; d: number; h?: number }): boolean {
  if (!fits) return true;

  const fitWidthM = fits.w <= 16 ? fits.w * 8 : fits.w;
  const fitDepthM = fits.d <= 16 ? fits.d * 8 : fits.d;

  if (entry.foot && fits.w <= 16 && fits.d <= 16) {
    if ((entry.foot.w <= fits.w && entry.foot.d <= fits.d) ||
        (entry.foot.w <= fits.d && entry.foot.d <= fits.w)) {
      return true;
    }
    return false;
  }

  if (entry.footprint) {
    const fpW = entry.footprint.w;
    const fpD = entry.footprint.d;
    const maxDim = Math.max(fitWidthM, fitDepthM);
    const minDim = Math.min(fitWidthM, fitDepthM);
    if (Math.min(fpW, fpD) > minDim * 1.5 || Math.max(fpW, fpD) > maxDim * 1.5) {
      return false;
    }
  }

  if (fits.h && entry.footprint?.h && entry.footprint.h > fits.h * 1.2) {
    return false;
  }

  return true;
}

/**
 * Vector Search (R1.3) — Queries Vectorize index with cosine similarity + post-filters
 */
export async function vectorSearch(
  query: string,
  vectorizeIndex: VectorizeIndex,
  options: SearchOptions & { ai?: WorkersAIBinding } = {}
): Promise<SearchResult[]> {
  const {
    registry = {},
    fits,
    standsOn,
    category,
    tier,
    limit = 10,
    ai,
  } = options;

  const qVector = await embedText(query, ai);
  const response = await vectorizeIndex.query(qVector, { topK: Math.max(50, limit * 4), returnMetadata: true });

  const results: SearchResult[] = [];

  for (const match of response.matches) {
    const entry = registry[match.id] || (match.metadata as AssetEntry) || { id: match.id, name: match.id, category: "buildings" };

    if (category && entry.category !== category) continue;
    if (tier && entry.tier !== tier) continue;
    if (standsOn && entry.standsOn && entry.standsOn !== standsOn) continue;
    if (!entryFitsSpace(entry, fits)) continue;

    results.push({
      id: match.id,
      score: match.score,
      entry,
      rank: 0,
      pipeline: "vectorize",
    });

    if (results.length >= limit) break;
  }

  results.forEach((r, idx) => { r.rank = idx + 1; });
  return results;
}

/**
 * Lexical baseline search (BM25-style keyword search) for side-by-side benchmarking
 */
export function lexicalSearch(
  query: string,
  options: SearchOptions = {}
): SearchResult[] {
  const {
    registry = {},
    fits,
    standsOn,
    category,
    tier,
    limit = 10,
  } = options;

  const qTokens = query.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((t) => t.length > 0 && !STOP_WORDS.has(t));
  const matched: SearchResult[] = [];

  for (const [id, entry] of Object.entries(registry)) {
    if (category && entry.category !== category) continue;
    if (tier && entry.tier !== tier) continue;
    if (standsOn && entry.standsOn && entry.standsOn !== standsOn) continue;
    if (!entryFitsSpace(entry, fits)) continue;

    const text = buildEmbeddingText(entry).toLowerCase();
    let score = 0;
    for (const token of qTokens) {
      if (text.includes(token)) score += 1.0;
    }

    if (score > 0) {
      matched.push({
        id,
        score,
        entry,
        rank: 0,
        pipeline: "lexical",
      });
    }
  }

  matched.sort((a, b) => b.score - a.score);
  const topK = matched.slice(0, limit);
  topK.forEach((r, idx) => { r.rank = idx + 1; });
  return topK;
}

/**
 * Unified model retrieval function
 */
export async function findModels(
  description: string,
  options: SearchOptions & {
    vectorizeIndex?: VectorizeIndex;
    ai?: WorkersAIBinding;
    pipeline?: "vectorize" | "lexical";
  } = {}
): Promise<SearchResult[]> {
  const pipeline = options.pipeline || (options.vectorizeIndex ? "vectorize" : "lexical");
  if (pipeline === "vectorize" && options.vectorizeIndex) {
    return vectorSearch(description, options.vectorizeIndex, options);
  }
  return lexicalSearch(description, options);
}
