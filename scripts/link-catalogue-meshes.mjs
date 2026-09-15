#!/usr/bin/env node
// =============================================================================
// BO7A — docs/specs/REBUILD-CHECKLIST.md, resolved 2026-09-15 (Mark, directly,
// after the brief's own wording was found ambiguous): "BO7A is a JOIN, not a
// creation." `data/catalogue.json` has 50 abstract entries (footprint,
// category, adjacency) with no mesh reference; `public/look-proof-pieces.js`
// (L12) has 20 real CC0 meshes with no game semantics. This script writes a
// `glb` field onto EXISTING catalogue entries where a real L12 mesh matches
// that entry's own footprint AND category — it never creates a new entry and
// never invents a category or an adjacency value.
//
// THE MATCHING RULE, disclosed per entry rather than typed in silently:
// footprint match is mechanical (both sides are real data). Category match,
// where a footprint has more than one catalogue slot, is read from the
// mesh's own id or source kit name — e.g. a mesh literally named "house-2x3"
// binds to the catalogue's own residential 2x3 slot, not its commercial one;
// a mesh sourced from kenney-city-kit-COMMERCIAL binds to a commercial slot.
// This is treated as recognising an already-stated fact about what the asset
// depicts, not inventing what "residential" or "commercial" means — those
// are already fixed by the existing entries this script only links to.
//
// A MESH WITH NO MATCHING ENTRY IS A FINDING, NOT A LICENCE TO INVENT ONE.
// Where a footprint has only one slot of the right category and TWO L12
// meshes could plausibly fill it (an "-alt" variant), the second is left
// unbound — UNMATCHED_MESHES below, named, not silently dropped and not
// force-bound to a guessed different category.
//
// PROPS ARE NOT CATALOGUE PIECES. C1.3 covers roads, C1.4 covers buildings;
// neither covers scene dressing (a lamp, a dumpster, an awning). This
// repo already keeps props in a separate system (public/prop-manifest.js,
// public/prop-placement.js) — PROP_MESH_IDS below is disclosure that these
// five L12 meshes were considered and deliberately excluded, not missed.
//
// Idempotent — recomputes the `glb` field on every entry fresh from the
// tables below on each run, same discipline as
// scripts/migrate-catalogue-s2-fields.mjs. Run once per table change:
// `node scripts/link-catalogue-meshes.mjs`.
// =============================================================================

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { basename, dirname, join } from "node:path";
import { PIECES } from "../public/look-proof-pieces.js";

// Same walk-up-to-CLAUDE.md pattern as migrate-catalogue-s2-fields.mjs, for
// the same reason: a fixed relative offset breaks under esbuild bundling
// (test/run.mjs, scripts/_mutcheck.mjs both inline local imports into one
// output file at a different depth than this file's own real location).
function repoRoot() {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let up = 0; up < 6; up++) {
    try { readFileSync(join(dir, "CLAUDE.md"), "utf8"); return dir; } catch { /* not this level */ }
    dir = join(dir, "..");
  }
  throw new Error("link-catalogue-meshes: could not locate the repo root");
}

export const CATALOGUE_PATH = join(repoRoot(), "data", "catalogue.json");

// L12 mesh id -> catalogue entry id. Every binding's own one-line reason:
export const MESH_BINDINGS = {
  // id itself names the catalogue slot almost exactly ("-a" suffix aside).
  "tower-base-6x6": "tower-base-6x6-a",
  // source file is literally "building-skyscraper-*.glb"; id says "mega-tower".
  "mega-tower-8x8": "mega-tower-a",
  // id says "house"; the modular-buildings pack's own house-shaped meshes are residential.
  "house-2x3": "house-a",
  "house-2x2": "small-house-a",
  // second residential 2x3 mesh ("-alt") binds to the catalogue's OTHER 2x3 residential slot.
  "house-2x3-alt": "terrace-unit-a",
  // "midrise" is standard apartment/residential terminology, not commercial or civic.
  "midrise-4x4": "apartment-block-a",
  // sourced from kenney-city-kit-COMMERCIAL -- kit name states the category.
  "commercial-2x2": "corner-shop-a",
  "commercial-3x3": "small-commercial-a",
  "commercial-4x4": "mid-commercial-a",
  // tileType read from the mesh's own descriptive name against the catalogue's own vocabulary.
  "street-tile-4wide": "street-straight",
  "street-bend": "street-curve", // "bend" and "curve" name the same real-world road shape
  // CORRECTED, CAT-2 (2026-09-16, docs/briefs/BLD-2026-09-16.md): this
  // mesh id's own glb (public/look-proof-pieces.js) was road-crossing.glb
  // -- "LEAST CERTAIN OF THE THREE ROAD BINDINGS" per BO7A's own original
  // disclosure here, and the doubt was correct. Rendered both candidates
  // top-down against the pack's own real texture: road-crossing.glb is a
  // STRAIGHT road with a crosswalk painted on it, not a junction at all.
  // The id "street-crossing" is kept (so this table's own key does not
  // need restructuring) but now points at road-crossroad.glb, a genuine
  // 4-way -- see public/vendor/kits/LICENCES.md's own CAT-2 entry.
  "street-crossing": "street-cross",

  // CAT-2 (2026-09-16, docs/briefs/BLD-2026-09-16.md, PLAN.md §5.1) -- 26
  // dedicated instances (public/look-proof-pieces.js) of the two already-
  // vendored road shapes (straight, curve) plus three newly-verified ones
  // (intersection="t", crossroad="cross", end), one per catalogue
  // footprint tier. tileType (the catalogue's own field) names the shape
  // directly; each mesh id below is spelled identically to its target
  // catalogue id since it is a dedicated, non-shared instance.
  "lane-straight": "lane-straight",
  "lane-curve": "lane-curve",
  "lane-t": "lane-t",
  "lane-cross": "lane-cross",
  "lane-end": "lane-end",
  "street-t": "street-t",
  "street-end": "street-end",
  "avenue-straight": "avenue-straight",
  "avenue-curve": "avenue-curve",
  "avenue-t": "avenue-t",
  "avenue-cross": "avenue-cross",
  "avenue-end": "avenue-end",
  "highway-straight": "highway-straight",
  "highway-curve": "highway-curve",
  "highway-t": "highway-t",
  "highway-cross": "highway-cross",
  "highway-end": "highway-end",
  "lane-street-t": "lane-street-t",
  "lane-street-cross": "lane-street-cross",
  // "transition" tileType has no dedicated taper/merge mesh in this pack
  // -- reuses road-straight.glb (see look-proof-pieces.js's own comment
  // on these three entries, and LICENCES.md's CAT-2 entry, for why a
  // plausible fifth asset, road-split.glb, was found and set aside
  // instead of used here).
  "lane-street-transition": "lane-street-transition",
  "street-avenue-t": "street-avenue-t",
  "street-avenue-cross": "street-avenue-cross",
  "street-avenue-transition": "street-avenue-transition",
  "avenue-highway-t": "avenue-highway-t",
  "avenue-highway-cross": "avenue-highway-cross",
  "avenue-highway-transition": "avenue-highway-transition",
};

// CAT-3 (docs/specs/PLAN.md §5.2, Mark: "two towers of the same footprint
// should not be the same tower"). These three were the exact reason UNMATCHED_
// MESHES existed BEFORE CAT-3 -- "only ONE catalogue slot of that footprint+
// category exists, already taken by another L12 mesh". Nothing about that has
// changed (CAT-2's own "no new entries, no changed footprint or category"
// still holds); what changed is public/board-renderer.js can now hold a
// SECOND real mesh per catalogue entry (glbVariants) and pick between them per
// PLACEMENT, so an entry with no second SLOT can still have a second LOOK.
// R2/C1.5's own "start far lower than instinct says": zero new assets, these
// three were already vendored, licensed and sitting unused.
export const VARIANT_BINDINGS = {
  "tower-base-6x6-a": ["tower-base-6x6-alt"],
  "apartment-block-a": ["midrise-4x4-alt"],
  "corner-shop-a": ["commercial-2x2-alt"],
};

// L12 meshes with NO available catalogue slot AND no plausible variant use --
// both a same-footprint, same-category entry already taken by another L12
// mesh above, and no second slot of that category exists at that footprint to
// bind to instead. A finding for the handover, not silently dropped and not
// force-bound to a DIFFERENT category with no signal supporting the choice.
export const UNMATCHED_MESHES = [];

// L12 meshes considered and deliberately excluded -- scene dressing, never a
// catalogue piece. See this file's own header.
export const PROP_MESH_IDS = [
  "street-lamp-1x1",
  "utility-pole-1x1",
  "dumpster-1x1",
  "awning-1x1",
  "parasol-1x1",
];

function main() {
  const catalogue = JSON.parse(readFileSync(CATALOGUE_PATH, "utf8"));
  const glbByMeshId = new Map(PIECES.map((p) => [p.id, p.glb]));
  const variantMeshIds = Object.values(VARIANT_BINDINGS).flat();

  // Every id this script's own tables name must be a real look-proof-pieces.js
  // mesh -- a typo here would silently bind nothing rather than error.
  const realMeshIds = new Set(PIECES.map((p) => p.id));
  for (const meshId of [...Object.keys(MESH_BINDINGS), ...variantMeshIds, ...UNMATCHED_MESHES, ...PROP_MESH_IDS]) {
    if (!realMeshIds.has(meshId)) {
      throw new Error(`link-catalogue-meshes: "${meshId}" is not a real id in look-proof-pieces.js's own PIECES`);
    }
  }
  // Every VARIANT_BINDINGS target must itself already be a real, bound
  // catalogue entry -- a variant with no primary binding would be a mesh
  // pool with nothing to be an ALTERNATE to.
  for (const catalogueId of Object.keys(VARIANT_BINDINGS)) {
    if (!Object.values(MESH_BINDINGS).includes(catalogueId)) {
      throw new Error(`link-catalogue-meshes: VARIANT_BINDINGS names "${catalogueId}", which has no primary MESH_BINDINGS entry`);
    }
  }
  // Every real L12 mesh must be classified somewhere (bound, a variant,
  // unmatched, or prop) -- a new mesh added to PIECES later and never
  // classified here would otherwise fall through silently rather than
  // surfacing as a gap.
  const classified = new Set([...Object.keys(MESH_BINDINGS), ...variantMeshIds, ...UNMATCHED_MESHES, ...PROP_MESH_IDS]);
  for (const p of PIECES) {
    if (!classified.has(p.id)) {
      throw new Error(`link-catalogue-meshes: "${p.id}" is a real look-proof-pieces.js mesh not classified in MESH_BINDINGS, VARIANT_BINDINGS, UNMATCHED_MESHES, or PROP_MESH_IDS -- classify it before running`);
    }
  }

  const glbByCatalogueId = new Map();
  for (const [meshId, catalogueId] of Object.entries(MESH_BINDINGS)) {
    glbByCatalogueId.set(catalogueId, glbByMeshId.get(meshId));
  }

  const linked = catalogue.map((entry) => {
    const { glbVariants: _stale, ...rest } = entry; // never carry a previous run's own value forward unrecomputed
    const variantIds = VARIANT_BINDINGS[entry.id];
    return {
      ...rest,
      glb: glbByCatalogueId.get(entry.id) || null,
      ...(variantIds ? { glbVariants: variantIds.map((id) => glbByMeshId.get(id)) } : {}),
    };
  });
  writeFileSync(CATALOGUE_PATH, JSON.stringify(linked, null, 2) + "\n");
  console.log(`linked ${glbByCatalogueId.size} of ${catalogue.length} catalogue entries to a real L12 mesh`);
  console.log(`${Object.keys(VARIANT_BINDINGS).length} of those carry a second real variant (CAT-3): ${Object.keys(VARIANT_BINDINGS).join(", ")}`);
  console.log(`${UNMATCHED_MESHES.length} L12 meshes have no matching entry (finding, not invented): ${UNMATCHED_MESHES.join(", ")}`);
  console.log(`${PROP_MESH_IDS.length} L12 meshes are scene dressing, deliberately not catalogue pieces: ${PROP_MESH_IDS.join(", ")}`);
}

// Same basename-on-argv[1] guard as migrate-catalogue-s2-fields.mjs, for the
// identical bundling reason documented there -- importing this module (for
// its exported tables) must never have the side effect of overwriting the
// real catalogue.
if (process.argv[1] && basename(process.argv[1]) === "link-catalogue-meshes.mjs") {
  main();
}
