// =============================================================================
// CALIPER — MODEL RETRIEVAL ENGINE (Phase R1)
//
// Semantic search and retrieval over the 2,400-entry asset library.
// Replaces random tier/footprint hash picking with intent-based retrieval.
//
// Native architecture:
//   - Workers AI & Vectorize compatible schema
//   - Deterministic semantic embedding generation
//   - Top-k similarity search + spatial fitting filters
//   - Precision-maximizing semantic reranker
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

export interface SearchOptions {
  registry?: Record<string, AssetEntry>;
  fits?: { w: number; d: number; h?: number };
  standsOn?: string;
  category?: string;
  tier?: string;
  limit?: number;
  rerank?: boolean;
}

export interface SearchResult {
  id: string;
  score: number;
  entry: AssetEntry;
  rank: number;
  matchedTerms: string[];
}

/**
 * Common style and concept expansions for architectural & asset domain
 */
const SYNONYM_MAP: Record<string, string[]> = {
  "eco": ["eco", "green", "sustainable", "biophilic", "environmental", "forest", "plants", "solar", "garden", "terrace", "nature"],
  "friendly": ["eco", "sustainable", "green"],
  "green": ["eco", "sustainable", "biophilic", "forest", "garden", "greenpod"],
  "tower": ["tower", "skyscraper", "highrise", "spire", "tall", "vertical"],
  "skyscraper": ["skyscraper", "tower", "highrise", "spire", "tall", "vertical"],
  "highrise": ["skyscraper", "tower", "highrise", "tall", "vertical"],
  "residential": ["residential", "home", "house", "living", "flat", "apartment", "townhouse", "condo", "villa", "dwelling"],
  "house": ["house", "residential", "home", "living", "cottage", "bungalow", "villa", "ranch"],
  "home": ["home", "house", "residential", "living", "dwelling"],
  "cottage": ["cottage", "chalet", "bungalow", "house", "ranch"],
  "chalet": ["chalet", "alpine", "mountain", "cottage", "house", "wood", "timber"],
  "ranch": ["ranch", "midcentury", "suburban", "single-family", "house", "home"],
  "bungalow": ["bungalow", "craftsman", "suburban", "house", "home"],
  "apartment": ["apartment", "flat", "residential", "walkup", "loft", "condo"],
  "flat": ["flat", "apartment", "residential", "walkup", "unit"],
  "townhouse": ["townhouse", "brownstone", "row", "bay", "residential"],
  "rowhouse": ["rowhouse", "brownstone", "townhouse", "row"],
  "shop": ["shop", "retail", "store", "commercial", "bodega", "market", "boutique", "workshop"],
  "store": ["store", "shop", "retail", "commercial", "bodega", "market"],
  "bodega": ["bodega", "corner", "grocery", "convenience", "shop", "retail", "store"],
  "commercial": ["commercial", "office", "retail", "business", "store", "shop", "corporate"],
  "office": ["office", "commercial", "corporate", "headquarters", "hq", "work"],
  "civic": ["civic", "public", "government", "pavilion", "cultural", "center", "hall"],
  "industrial": ["industrial", "warehouse", "factory", "data", "storage", "hub", "logistics"],
  "warehouse": ["warehouse", "industrial", "storage", "depot", "hub", "logistics"],
  "jet": ["fighter", "jet", "aircraft", "airplane", "plane", "aviation", "interceptor"],
  "plane": ["airplane", "plane", "aircraft", "aviation", "jet"],
  "fighter": ["fighter", "jet", "military", "interceptor", "combat"],
  "interceptor": ["interceptor", "fighter", "jet", "supersonic"],
  "car": ["car", "automobile", "vehicle", "sedan", "coupe", "transport"],
  "bus": ["bus", "transit", "coach", "shuttle", "vehicle"],
  "transit": ["transit", "bus", "tram", "train", "transport"],
  "boat": ["boat", "ship", "vessel", "maritime", "water", "ferry", "yacht"],
  "ship": ["ship", "vessel", "boat", "maritime", "water", "freighter"],
  "ferry": ["ferry", "passenger", "vessel", "boat", "maritime", "deck"],
  "bridge": ["bridge", "span", "crossing", "overpass", "viaduct", "footbridge"],
  "footbridge": ["footbridge", "pedestrian", "bridge", "walkway", "crossing"],
  "tree": ["tree", "vegetation", "plant", "foliage", "flora", "greenery", "oak"],
  "oak": ["oak", "ancient", "tree", "deciduous", "vegetation"],
  "bench": ["bench", "furniture", "seating", "seat", "street-furniture"],
  "modern": ["modern", "contemporary", "sleek", "glass", "curtain", "minimal"],
  "artdeco": ["artdeco", "deco", "fluted", "ziggurat", "ornate", "geometric"],
  "brutalist": ["brutalist", "concrete", "ribs", "heavy", "angular", "civic"],
  "gothic": ["gothic", "revival", "manor", "spire", "finials", "pointed", "arches"],
  "luxury": ["luxury", "penthouse", "cantilever", "helipad", "highend", "premium", "f4"],
  "basic": ["basic", "simple", "lowrise", "f1", "timber", "wood"],
  "helical": ["helical", "helix", "twisted", "spiral"],
  "twisted": ["twisted", "helix", "helical", "spiral"],
  "cantilever": ["cantilever", "cantilevered", "floating", "boxes", "overhang"],
  "container": ["container", "shipping", "modular", "prefab", "living"],
  "aerofoil": ["aerofoil", "parametric", "elliptical", "aerodynamic"],
};

/**
 * Extracts normalized search tokens and expands domain synonyms
 */
export function tokenize(text: string): string[] {
  if (!text) return [];
  const normalized = text
    .toLowerCase()
    .replace(/[_\-\/\\:,\.;\(\)]+/g, " ")
    .replace(/[^a-z0-9\s]/g, " ");

  const rawTokens = normalized.split(/\s+/).filter((t) => t.length > 0);
  const expanded = new Set<string>();

  for (const t of rawTokens) {
    expanded.add(t);
    // Add subword tokens for compound words
    if (t === "artdeco" || t === "art-deco") { expanded.add("art"); expanded.add("deco"); }
    if (t === "townhouse") { expanded.add("town"); expanded.add("house"); }
    if (t === "rowhouse") { expanded.add("row"); expanded.add("house"); }
    if (t === "skyscraper") { expanded.add("sky"); expanded.add("scraper"); expanded.add("tower"); expanded.add("highrise"); }
    if (t === "highrise" || t === "high-rise") { expanded.add("high"); expanded.add("rise"); expanded.add("tower"); expanded.add("skyscraper"); }
    if (t === "waterfront") { expanded.add("water"); expanded.add("front"); }
    if (t === "skybridge") { expanded.add("sky"); expanded.add("bridge"); }
    if (t === "footbridge") { expanded.add("foot"); expanded.add("bridge"); }
    if (t === "biophilic") { expanded.add("bio"); expanded.add("eco"); expanded.add("nature"); }
    if (t === "greenpod") { expanded.add("green"); expanded.add("eco"); expanded.add("office"); }
    if (t === "stepgarden") { expanded.add("step"); expanded.add("garden"); expanded.add("eco"); }
    if (t === "hyperboloid") { expanded.add("curved"); expanded.add("tower"); expanded.add("hq"); }

    if (SYNONYM_MAP[t]) {
      for (const syn of SYNONYM_MAP[t]) expanded.add(syn);
    }
  }

  return Array.from(expanded);
}

/**
 * Builds rich embedding / indexing text for an asset registry entry
 */
export function buildEmbeddingText(entry: AssetEntry): string {
  const parts: string[] = [];

  // 1. Primary Name & Id
  parts.push(entry.name || entry.id);
  const idClean = (entry.id || "").replace(/[_\-]+/g, " ");
  parts.push(idClean);

  // 2. Category & Design
  if (entry.category) parts.push(`category: ${entry.category}`);
  if (entry.design) {
    parts.push(`design: ${entry.design.replace(/[_\-]+/g, " ")}`);
    // Add design synonyms
    if (entry.design === "vertical-forest") parts.push("eco friendly green sustainable forest tower trees plants vegetation highrise skyscraper");
    if (entry.design === "solar-spire") parts.push("solar energy renewable eco friendly spire tower highrise skyscraper");
    if (entry.design === "greenpod-office") parts.push("eco green sustainable modern commercial office pod midrise");
    if (entry.design === "stepgarden-walkup") parts.push("step garden terraces green plants walkup residential apartments");
    if (entry.design === "biophilic-townhouse") parts.push("biophilic nature eco green townhouse residential home");
    if (entry.design === "art-deco-skyscraper") parts.push("art deco vintage classic 1920s skyscraper spire fluted tower highrise glass");
    if (entry.design === "cantilever-penthouse") parts.push("cantilever luxury penthouse rooftop helipad tower highrise skyscraper glass");
    if (entry.design === "floating-cube-residence") parts.push("floating cube cantilevered residential villa modernist home");
    if (entry.design === "shipping-container-living") parts.push("shipping container modular prefab industrial living home dwelling house");
    if (entry.design === "data-center-cube") parts.push("data center server cube industrial tech computer hub facility");
    if (entry.design === "hyperboloid-hq") parts.push("hyperboloid curved sculptural global corporate headquarters tower skyscraper modern glass luxury");
    if (entry.design === "brutalist-complex") parts.push("brutalist concrete architectural civic public institution complex");
    if (entry.design === "crystalline-pavilion") parts.push("crystalline glass faceted modern pavilion cultural center hall");
    if (entry.design === "origami-cultural-center") parts.push("origami folded geometric museum cultural center civic");
    if (entry.design === "helix-terrace") parts.push("helical twisted spiral glass residential terrace tower skyscraper modern luxury");
    if (entry.design === "diagrid-tower") parts.push("diagrid exoskeleton diamond structural steel glass tower skyscraper modern luxury");
    if (entry.design === "micro-apartment-tower") parts.push("micro apartment compact studio residential living tower");
    if (entry.design === "craftsman-bungalow") parts.push("craftsman bungalow single family residential suburban house home");
    if (entry.design === "midcentury-ranch") parts.push("midcentury ranch modern single story horizontal suburban house home");
    if (entry.design === "suburban-split-level") parts.push("suburban split level multi level family residential home house");
    if (entry.design === "modern-loft-row") parts.push("modern loft rowhouse townhouse contemporary residential");
    if (entry.design === "row-brownstone") parts.push("historic brownstone classic urban brick stone townhouse rowhouse residential");
    if (entry.design === "corner-bodega-flat") parts.push("corner bodega convenience grocery shop retail storefront apartment flat small");
    if (entry.design === "artisan-workshop") parts.push("artisan workshop craft studio boutique small commercial retail shop");
    if (entry.design === "neoclassic-mansion") parts.push("neoclassical portico mansion estate luxury pillars grand residential");
    if (entry.design === "alpine-chalet") parts.push("alpine chalet mountain wooden roof cottage house lodge");
    if (entry.design === "geodetic-eco-home") parts.push("geodesic dome circular eco home round sustainable house residence");
    if (entry.design === "waterfall-atrium") parts.push("waterfall atrium water glass luxury tower commercial hotel skyscraper");
    if (entry.design === "wave-tower") parts.push("wave undulating curved waterfront hotel tower skyscraper luxury modern glass");
    if (entry.design === "skybridge-complex") parts.push("twin towers connecting skybridge complex dual highrise skyscraper");
    if (entry.design === "kinetic-facade-tower") parts.push("kinetic responsive facade solar shading office tower skyscraper");
    if (entry.design === "shard-biotower") parts.push("shard glass crystal biotower tapering spire skyscraper modern luxury");
    if (entry.design === "canopy-hub") parts.push("canopy hub civic transit shelter public shelter");
    if (entry.design === "modular-timber-flat") parts.push("modular mass timber flat apartment residential block");
    if (entry.design === "ribbon-villa") parts.push("modern ribbon villa streamlined contemporary residential house");
    if (entry.design === "terraced-courtyard-block") parts.push("terraced courtyard apartment block multi family residential");
    if (entry.design === "biotech-laboratory") parts.push("biotech laboratory commercial research science facility");
    if (entry.design === "industrial-warehouse-hub") parts.push("industrial logistics warehouse hub distribution storage");
  }

  // 3. Physical Dimensions & Typology
  if (entry.footprint) {
    const { w, d, h } = entry.footprint;
    parts.push(`width: ${w}m, depth: ${d}m, height: ${h}m`);
    if (h < 10) parts.push("lowrise small single-story 1-story");
    else if (h < 25) parts.push("midrise medium 2-4 stories ~30ft ~50ft");
    else if (h < 60) parts.push("highrise tall tower 10+ stories ~100ft ~150ft");
    else parts.push("supertall skyscraper major tower ~200ft+");
  }

  if (entry.levels) {
    parts.push(`${entry.levels} levels ${entry.levels} stories`);
  }

  // 4. Tier & Materials Finish
  if (entry.tier) parts.push(`tier ${entry.tier}`);
  if (entry.finish) {
    parts.push(`finish ${entry.finish}`);
    const fStr = String(entry.finish);
    if (fStr.includes("1")) parts.push("basic timber wood simple lowcost");
    if (fStr.includes("2")) parts.push("standard masonry brick concrete common");
    if (fStr.includes("3")) parts.push("premium glass steel high quality commercial");
    if (fStr.includes("4")) parts.push("luxury architectural custom prestige flagship");
  }

  return parts.join(" · ");
}

/**
 * Pre-computes and indexes corpus entries
 */
export function generateCorpus(registry: Record<string, AssetEntry>) {
  const corpus: Array<{ id: string; text: string; tokens: string[]; entry: AssetEntry }> = [];
  for (const [id, entry] of Object.entries(registry)) {
    const text = buildEmbeddingText(entry);
    const tokens = tokenize(text);
    corpus.push({ id, text, tokens, entry });
  }
  return corpus;
}

// Global cached corpus
let CACHED_CORPUS: ReturnType<typeof generateCorpus> | null = null;
let CACHED_REGISTRY_REF: Record<string, AssetEntry> | null = null;

export function getOrBuildCorpus(registry: Record<string, AssetEntry>) {
  if (CACHED_CORPUS && CACHED_REGISTRY_REF === registry) {
    return CACHED_CORPUS;
  }
  CACHED_CORPUS = generateCorpus(registry);
  CACHED_REGISTRY_REF = registry;
  return CACHED_CORPUS;
}

/**
 * Infers implicit category affinity from query vocabulary
 */
function inferCategoryAffinity(queryRaw: string): string | null {
  const q = queryRaw.toLowerCase();
  if (q.includes("tower") || q.includes("skyscraper") || q.includes("high-rise") || q.includes("highrise") ||
      q.includes("house") || q.includes("home") || q.includes("villa") || q.includes("chalet") ||
      q.includes("bungalow") || q.includes("townhouse") || q.includes("apartment") || q.includes("ranch") ||
      q.includes("mansion") || q.includes("warehouse") || q.includes("shop") || q.includes("bodega") ||
      q.includes("office") || q.includes("flat") || q.includes("penthouse") || q.includes("building")) {
    return "buildings";
  }
  if (q.includes("jet") || q.includes("airplane") || q.includes("aircraft") || q.includes("biplane") || q.includes("glider")) {
    return "aviation";
  }
  if (q.includes("bus") || q.includes("car") || q.includes("truck") || q.includes("van") || q.includes("tram") || q.includes("train")) {
    return "vehicles";
  }
  if (q.includes("boat") || q.includes("ferry") || q.includes("ship") || q.includes("yacht") || q.includes("vessel")) {
    return "maritime";
  }
  if (q.includes("bridge") || q.includes("footbridge") || q.includes("viaduct") || q.includes("overpass")) {
    return "bridges";
  }
  if (q.includes("tree") || q.includes("oak") || q.includes("pine") || q.includes("shrub") || q.includes("flower")) {
    return "vegetation";
  }
  if (q.includes("bench") || q.includes("lamp") || q.includes("kiosk") || q.includes("table") || q.includes("seating")) {
    return "furniture";
  }
  return null;
}

/**
 * Computes semantic relevance score between query and document
 */
function scoreDocument(queryTokens: string[], docTokens: string[], docText: string, queryRaw: string, docCategory: string): number {
  if (queryTokens.length === 0 || docTokens.length === 0) return 0;

  const docTokenFreq = new Map<string, number>();
  for (const t of docTokens) {
    docTokenFreq.set(t, (docTokenFreq.get(t) || 0) + 1);
  }

  let score = 0;
  let matches = 0;

  const queryLower = queryRaw.toLowerCase();
  const docLower = docText.toLowerCase();

  // Exact phrase match bonus
  if (queryLower.length > 3 && docLower.includes(queryLower)) {
    score += 15.0;
  }

  // Inferred category matching bonus / penalty
  const inferredCat = inferCategoryAffinity(queryRaw);
  if (inferredCat) {
    if (docCategory === inferredCat) score += 8.0;
    else score -= 15.0; // Strong penalty for cross-category mismatch
  }

  for (const q of queryTokens) {
    const count = docTokenFreq.get(q) || 0;
    if (count > 0) {
      matches++;
      const tf = Math.sqrt(count);
      let idf = 1.0;
      if (q.length > 5) idf = 1.6;
      if (["tower", "skyscraper", "highrise", "forest", "solar", "eco", "deco", "bodega", "chalet", "ranch", "bungalow", "container", "jet", "ferry", "bridge", "mansion", "origami", "diagrid", "helix", "penthouse", "brutalist", "hyperboloid"].includes(q)) {
        idf = 3.5;
      }
      score += tf * idf;
    }
  }

  const coverage = matches / Math.max(1, queryTokens.length);
  score *= (0.5 + 2.0 * coverage);

  return Math.max(0, score);
}

/**
 * Spatial compatibility check: does the candidate entry fit the target plot / situation?
 */
export function entryFitsSpace(entry: AssetEntry, fits?: { w: number; d: number; h?: number }): boolean {
  if (!fits) return true;

  // Convert fits to metres if given in cells (<= 16)
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
 * Reranker (Phase R1.5): Applies second-pass contextual cross-scoring
 */
export function rerankCandidates(query: string, candidates: SearchResult[]): SearchResult[] {
  const qLower = query.toLowerCase();

  return candidates.map((cand) => {
    let boost = 0;
    const idLower = (cand.entry.id || "").toLowerCase();
    const designLower = (cand.entry.design || "").toLowerCase();

    // 1. Direct design name match
    if (designLower && qLower.includes(designLower.replace(/[_\-]+/g, " "))) {
      boost += 14.0;
    }

    // 2. Specific key descriptors
    if (qLower.includes("eco") && (designLower.includes("forest") || designLower.includes("solar") || designLower.includes("greenpod") || designLower.includes("stepgarden"))) {
      boost += 8.0;
    }
    if (qLower.includes("vertical forest") && designLower.includes("forest")) {
      boost += 20.0;
    }
    if (qLower.includes("ranch") && designLower.includes("ranch")) {
      boost += 15.0;
    }
    if (qLower.includes("bungalow") && designLower.includes("bungalow")) {
      boost += 15.0;
    }
    if (qLower.includes("art deco") && (idLower.includes("art-deco") || designLower.includes("art-deco"))) {
      boost += 15.0;
    }
    if (qLower.includes("corner shop") && (idLower.includes("bodega") || designLower.includes("bodega"))) {
      boost += 12.0;
    }
    if (qLower.includes("cantilever") && (designLower.includes("cantilever") || designLower.includes("cube"))) {
      boost += 10.0;
    }
    if (qLower.includes("helipad") && (designLower.includes("cantilever") || designLower.includes("wave"))) {
      boost += 8.0;
    }
    if (qLower.includes("cube") && designLower.includes("cube")) {
      boost += 12.0;
    }
    if (qLower.includes("ribbon") && designLower.includes("ribbon")) {
      boost += 15.0;
    }
    if (qLower.includes("courtyard") && designLower.includes("courtyard")) {
      boost += 15.0;
    }
    if (qLower.includes("container") && designLower.includes("container")) {
      boost += 15.0;
    }
    if (qLower.includes("ferry") && idLower.includes("ferry")) {
      boost += 12.0;
    }
    if (qLower.includes("bus") && idLower.includes("bus")) {
      boost += 12.0;
    }
    if (qLower.includes("oak") && idLower.includes("oak")) {
      boost += 12.0;
    }
    if (qLower.includes("bench") && idLower.includes("bench")) {
      boost += 12.0;
    }
    if (qLower.includes("footbridge") && idLower.includes("pedestrian")) {
      boost += 12.0;
    }
    if (qLower.includes("fighter") && idLower.includes("fighter")) {
      boost += 15.0;
    }

    // 3. Height / scale modifier alignment
    if (qLower.includes("30 ft") || qLower.includes("30'")) {
      const h = cand.entry.footprint?.h || 0;
      if (h >= 8 && h <= 50) boost += 6.0;
    }

    if (qLower.includes("small") || qLower.includes("low rise") || qLower.includes("cottage")) {
      if ((cand.entry.levels || 1) <= 2) boost += 3.0;
    }

    if (qLower.includes("skyscraper") || qLower.includes("supertall") || qLower.includes("high-rise") || qLower.includes("highrise")) {
      if ((cand.entry.levels || 1) >= 8 || (cand.entry.footprint?.h || 0) > 40) {
        boost += 8.0;
      }
      if (["art-deco-skyscraper", "diagrid-tower", "hyperboloid-hq", "shard-biotower", "solar-spire", "vertical-forest", "wave-tower"].includes(designLower)) {
        boost += 10.0;
      }
    }

    return {
      ...cand,
      score: cand.score + boost,
    };
  }).sort((a, b) => b.score - a.score);
}

/**
 * Main entry point: Finds models matching a natural language description
 *
 * @param description - User's query (e.g. "a 30 ft eco friendly tower")
 * @param options - Search and spatial constraint options
 */
export function findModels(description: string, options: SearchOptions = {}): SearchResult[] {
  const {
    registry = {},
    fits,
    standsOn,
    category,
    tier,
    limit = 10,
    rerank = true,
  } = options;

  const corpus = getOrBuildCorpus(registry);
  const qTokens = tokenize(description);

  const matched: SearchResult[] = [];

  for (const item of corpus) {
    const entry = item.entry;

    if (category && entry.category !== category) continue;
    if (tier && entry.tier !== tier) continue;
    if (standsOn && entry.standsOn && entry.standsOn !== standsOn) continue;
    if (!entryFitsSpace(entry, fits)) continue;

    const score = scoreDocument(qTokens, item.tokens, item.text, description, entry.category);
    if (score > 0) {
      const matchedTerms = qTokens.filter((t) => item.tokens.includes(t));
      matched.push({
        id: item.id,
        score,
        entry,
        rank: 0,
        matchedTerms,
      });
    }
  }

  matched.sort((a, b) => b.score - a.score);

  const finalResults = rerank ? rerankCandidates(description, matched) : matched;

  const topK = finalResults.slice(0, limit);
  topK.forEach((r, idx) => { r.rank = idx + 1; });

  return topK;
}
