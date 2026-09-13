# PHASE 1, ITEM 1 — THE SITE INVENTORY

Written 2026-09-13, before anything is moved. Per the lane brief's own
instruction: "Do not trust that list — derive your own." This document is
that derivation, not the four-file list `docs/briefs/PHASE-1-rebuild.md`
names as a starting guess.

**Method.** Not hand-grep. This project already owns a reachability tool —
`scripts/lib/module-graph.mjs`, the same forward/reverse dependency graph
`test/deadExports.test.ts` and `docs/MODULE-MAP.md` are built from — so the
inventory below is built the same way the codebase already measures
reachability, not a second, less-trustworthy parser. The exact commands:

```
node scripts/gen-module-map.mjs                    # regenerated docs/MODULE-MAP.md fresh
node scripts/_old-world-inventory-probe.mjs         # one-off probe, this item, kept alongside this doc
```

`scripts/_old-world-inventory-probe.mjs` is a throwaway script (matching the
convention of `scripts/_move-piece-probe.mjs`, `scripts/_isolate-probe.mjs`
etc. already in this repo) built on `loadModuleFiles`, `buildForwardDependencyGraph`,
`declareEntryPoints` and `reachableFilesFrom` — the exact functions
`classifyRepoReachability` composes for the dead-exports gate. Product entry
points, confirmed by the tool rather than assumed: `src/index.ts` (wrangler's
`"main"`), `public/index.html`, `public/city.html`.

---

## FINDING 0 — the brief's four-file list is a real undercount, and the reason is load-bearing

`docs/specs/REBUILD-PLAN.md`'s "Goes" list names four categories: the old
world (`layout.js`, `instance-groups.js`, `road-network.js`, `city-plan.js`,
`city-render.js`'s old-world path); the current board's generated output and
the parts of its generator encoding old assumptions; the models and the
process that makes them; and every test describing the above.

**The first category is not one cluster, it is two, and only one of them can
move today.** `city-plan.js` is not a self-contained old-world file that
`city-render.js` alone reads. It is the terrain/plot data source for files
this plan explicitly keeps:

- `public/terrain.js` imports `WORLD` from `city-plan.js` directly.
- `public/world-render-3d.js` (the shell's `WorldRenderer` — CLAUDE.md names
  this "not the weak part") imports `WORLD` from `city-plan.js` directly.
- `public/board-adapter.js` imports `ROADS` from `city-plan.js`, and its own
  header says exactly what it does: *"generateWorld() -> a list of placed
  pieces... Converts today's world -- plots, roads, bridges -- into the
  uniform placed-piece record board.js operates on."* This file **is** "the
  parts of the generator encoding assumptions that produced a world Mark did
  not ask for" — but it currently sits between `city-plan.js` and
  `world-render-3d.js`, which is live.
- `public/buildings.js` imports `PLOT_CLASSES` from `city-plan.js`, and is
  itself imported by `public/props.js` (props/trees drawn on the live board).

And underneath all of that, a shared web of terrain-generation primitives —
`noise.js`, `land-use.js`, `features.js`, `waterways.js`, `spatial-index.js`,
`grade.js`, `footprint.js`, `zoning.js`, `settlement-fit.js` — is imported by
**both** `city-plan.js` (old world) **and** `board-adapter.js` /
`board-generator.js` / `board.js` / `bridge-generator.js` / `ground.js` (the
kept board pipeline). Moving any of these breaks the board, not just the old
world.

**Why this is not a Phase 1 problem to force through.** Untangling it means
either rewriting `world-render-3d.js`/`terrain.js`/`board-adapter.js` to stop
reading `city-plan.js`, or building a replacement terrain/board source for
them to read instead. Both are code construction, and "Phase 1 builds
nothing" (`docs/briefs/PHASE-1-rebuild.md` line 12, restated at the plan's own
close). Phase 2 items 2.1 ("a flat board... no terrain, no generator, no
art"), 2.5 ("Terrain") and 2.7 ("the generator, LAST... calls the same
place()") are exactly the work that removes the need for `city-plan.js` —
which is the correct place for this to happen, not here.

**The models cluster has the identical shape.** `props.js` and
`prop-models.js` (trees, street furniture) are imported by
`public/board-render.js` — the live board's own renderer — via
`tier-models.js`, `roadkit.js`, `asset-registry.js`, `facade-textures.js`.
"The models, and the process by which models are made" is going per the plan,
but the board currently draws its trees and lamps through this same
pipeline. Same conclusion: real, currently load-bearing, not separable
without Phase 2's new catalogue-driven pipeline (C1, A9) existing first to
replace it.

**Recorded rather than asked as a blocking question**, per `rule://decision-queue`
(never block): the least irreversible path is to quarantine only what is
provably safe today, and name everything else as identified-but-deferred
rather than force a break into currently-live product code, or invent a
decoupling refactor this phase does not authorise.

---

## WAVE 1 — safe to quarantine now, zero live breakage

Every file below has **no importer outside this set**, once `public/city.html`
(the entry point) is included. Confirmed by `_old-world-inventory-probe.mjs`'s
direct-importer listing for each file, cross-checked against `docs/MODULE-MAP.md`.

| File | Direct importers (non-test) | Verdict |
|---|---|---|
| `public/road-network.js` | **none** — only its own tests (`test/roadNetwork.test.ts`, `test/bridgePieces.test.ts`, `test/collectorLocalNetwork.test.ts`, `test/connectivityBridges.test.ts`) | Already fully orphaned. `city-plan.js` is imported *by* it, not the reverse — nothing calls in. |
| `public/instance-groups.js` | `public/city-render.js` only | Safe once city-render.js moves too. |
| `public/layout-fits.js` | `public/city-render.js` only | Safe once city-render.js moves too. Not in the brief's four-file list — found by the graph, not the brief. |
| `public/layout.js` | `public/city-render.js`, `public/layout-fits.js` (both moving) | Safe. |
| `public/city-render.js` | `public/city.html` only (its `LOOK`/`buildWorld` exports — the only two anything outside tests calls) | Safe once city.html moves. |
| `public/city.html` | Linked from `public/index.html` line 1651 (`◱ The City`) — the only inbound edge | Root of this cluster. Moving it orphans everything above. |

**The dangling link.** `public/index.html:1651` links to `./city.html` with
the label *"The 26 km city on its own, without the application chrome"* —
literally advertising the rejected old world as a feature. Quarantining
`city.html` without removing this link leaves a 404 on the live product page,
which is a defect this move introduces, not one it fixes. Removing the
anchor is scoped as part of *this* quarantine (clearing a dead link is
clearing the site, not building anything) and is done in the same commit as
the `city.html` move.

**Expected breakage, named in advance.** Nine tests exercise `city.html`
directly (`test/boardRender.test.ts`, `test/publicClaims.test.ts`,
`test/cullingRatio.test.ts`, `test/regressionGate.test.ts`,
`test/envLuminance.test.ts`, `test/claimSpansAreChecked.test.ts`,
`test/reachability.test.ts`, `test/lookPipeline.test.ts`,
`test/rendererStatic.test.ts`), plus the eight tests that import
`city-render.js` directly and the five that import `layout.js` directly (full
list in the reachability dump captured alongside this document). **These are
expected to go red or need updating as a direct result of this move — that is
item 2's job** (retiring the ~37 old-world test pins by name), not a defect in
this move. Named here so item 2 starts from a known set rather than
rediscovering it.

---

## DEFERRED — identified, not quarantined this pass

**`public/city-plan.js`.** Load-bearing for `terrain.js`, `world-render-3d.js`,
`board-adapter.js`, `buildings.js` — all reachable from the live
`public/index.html`. Cannot move until Phase 2 supplies a replacement terrain
source (2.5) and the generator calls `place()` instead of being read
directly (2.7).

**`public/board-adapter.js`.** This *is* "the current board's generated
output" mechanism per REBUILD-PLAN — it converts `city-plan.js`'s plots and
roads into board pieces. Currently the only source of board content
`world-render-3d.js` draws (`boardPiecesById`). Removing it removes the
board's content with no replacement. Deferred to Phase 2.1/2.7 for the same
reason as `city-plan.js`.

**`public/board-generator.js`.** Already fully orphaned like `road-network.js`
(zero product/demo callers, only `test/boardGenerator.test.ts`) — but its
*static output*, `public/board.generated.json`, is what `board-load.js`
serves to the live board today. The generator script itself could quarantine
today with no live breakage; its generated JSON artefact cannot, until Phase
2.7 produces a replacement. Not moved this pass, to keep the generator and
the artefact it produced together rather than splitting one from the other
mid-phase.

**The shared terrain-generation primitives** — `noise.js`, `land-use.js`,
`features.js`, `waterways.js`, `spatial-index.js`, `grade.js`, `footprint.js`,
`zoning.js`, `settlement-fit.js` — imported by both `city-plan.js` and the
kept board files (`board.js`, `board-adapter.js`, `board-generator.js`,
`bridge-generator.js`, `ground.js`). Cannot separate "old-world use" from
"board use" without rewriting the board's callers. Deferred with `city-plan.js`.

**The models/kitbash generation cluster** — `model-registry.js`,
`model-forge.js`, `kitbash-assembler.js`, `kitbash-parts.js`,
`kitbash-recipe-map.js`, `kitbash-exemplar.js`, `tier-models.js`,
`resolve-models.js`, `roadkit.js`, `roadkit-street-demo.js`,
`facade-textures.js`, `asset-registry.js`, `typology-footprints.js`,
`showstoppers.js`, `props.js`, `prop-models.js`, `prop-manifest.js`. REBUILD-PLAN
names this whole cluster as going ("the models, and the process by which
models are made"), but `props.js`/`prop-models.js` currently supply the live
board's trees and street furniture via `board-render.js`. Deferred until
Phase 2.6 ("models to the catalogue's visual specification") exists to
replace what these currently provide.

**Not touched, and not old-world at all** — named so nobody re-derives this
later: `world-model.js`, `world-store.js`, `world-registry.js`,
`apply-layers.js`, `undo.js`, `selection.js`, `describe-request.js`,
`generate-request.js`, `run-generate-request.js`, `change-quest.js`,
`stage-artefact.js`, `apply-and-persist.js`, `model-caller.js`, `quest.js` are
Side B — the Build pipeline CLAUDE.md names as working and kept. They
currently read the old-world plan through `world.js`'s `generateWorld` import,
which is the same entanglement as above and gets re-pointed at the new board
in Phase 3.2, not Phase 1.

---

## WHAT THIS MEANS FOR THE PHASE GATE

REBUILD-PLAN 1.5's gate — *"nothing in `src/`, `public/` or `test/` references
the old world"* — is **not fully reachable in one item**, because two of its
four "Goes" categories are genuinely entangled with code this same plan says
to keep, and untangling them is Phase 2's stated job, not Phase 1's. Wave 1
above is committed to fully in this item. The deferred sections are real,
named, dependency-graph-verified findings, not a shortcut — the alternative
was either breaking `public/index.html`'s live board (not authorised: nothing
about clearing the site should regress the thing being kept) or writing new
decoupling code under a phase whose entire brief says not to build anything.
