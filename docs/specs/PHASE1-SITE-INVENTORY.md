# PHASE 1, ITEM 1 — THE SITE INVENTORY

Written 2026-09-13, before anything is moved. Per the lane brief's own
instruction: "Do not trust that list — derive your own." This document is
that derivation, not the four-file list `docs/briefs/PHASE-1-rebuild.md`
names as a starting guess.

---

## CORRECTION — 2026-09-13, from the blind plan review this document itself required. READ FIRST.

**WAVE 1 below is WRONG and none of it was moved.** Per `rule://reviewer-independence`,
this plan was handed to a fresh, blind agent before any file moved. It found
that `public/city-render.js` is not reachable only through the dead
`public/city.html`, as WAVE 1's table claims — `public/world-render-3d.js`
(the shell's kept `WorldRenderer`) contains `const { buildWorld } = await
import("./city-render.js")` at line 1722, called from `_buildCityBase`
whenever `this._cityMode` is true, and `public/index.html` — the live
product's real entry point — constructs `new WorldRenderer(canvas3d, { city:
true, ... })` unconditionally, under a comment titled *"THE CITY IS THE
WORLD NOW... the city replaces the ground."*

**So `city-render.js`, and everything it privately depends on
(`layout.js`, `instance-groups.js`, `layout-fits.js`), is not a dead demo
path. It is the code that renders `public/index.html` today** — exactly the
world Mark opened on a real device and rejected. Verified independently after
the review returned: `grep -n "await import(\"./city-render" public/world-render-3d.js`
and `sed -n '2570,2580p' public/index.html`, both confirming the finding
verbatim before this correction was written, per `rule://subagent-contract`'s
"re-run the gate yourself rather than trusting the pasted output."

**Root cause, and why the tool used to build WAVE 1 could not see this**:
`scripts/lib/module-graph.mjs`'s own header names its own limitation — "No
dynamic `import()`. Only static `import ... from \"...\"` is text a regex
scanner can see" — and states "Not used anywhere in this codebase today,"
which was true when that comment was written and is no longer true.
`docs/MODULE-MAP.md`, built by the same tool, has the identical blind spot,
so cross-checking against it gave false confidence rather than catching the
gap. **This is a real, standing limitation of `test/deadExports.test.ts`'s
own reachability gate, not just this document's mistake** — recorded as a
lesson (`process_append_lesson`, id `dynamic-import-blind-spot`) since any
other file reachable only via a dynamic `import()` would be misclassified
the same way, silently, by the gate this whole project trusts for dead-code
findings.

**The review also found two smaller gaps, both folded into the corrected
sections below**: `public/plan-preview.html` redirects to `city.html` and is
a second live inbound edge the original WAVE 1 never accounted for, and the
"expected breakage" list omitted `road-network.js`'s own four direct test
importers and `test/terrainLandmassOwnership.test.ts`'s
`KNOWN_STATIC_IMPORTERS` tripwire, which hard-codes `"public/road-network.js"`
and must be updated in the same commit as that file's move.

**What this changes.** Only `public/road-network.js` is quarantined this
pass — see the revised WAVE 1 below. Everything else this document
originally proposed moving is deferred, now for a stronger reason than
"entangled with kept code": it is not dead at all, it is the live rendering
path, and Phase 1 cannot remove a live product's only rendered content
without Phase 2's flat board existing to replace it. The sections below are
left as originally written, with corrections inline, so the mistake stays
visible rather than quietly disappearing from the record.

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

## WAVE 1 — REVISED after the blind review. One file, not six.

`public/city-render.js`, `layout.js`, `layout-fits.js` and `instance-groups.js`
are **withdrawn from WAVE 1** — see the CORRECTION block at the top. They are
the live rendering path for `public/index.html`, not a dead demo, and stay in
place until Phase 2 exists to replace what they currently render.

`public/city.html` is also withdrawn, for a related but separate reason:
it has a second live inbound edge the original draft missed —
`public/plan-preview.html`, a committed redirect stub whose entire purpose is
forwarding bookmarked/shared preview URLs to `/city.html` (`location.replace("/city.html"...)`.
Quarantining `city.html` without also resolving that stub would leave a live
redirect target pointing at nothing — a regression, not a cleanup — and
`city.html` is entangled with `city-render.js` regardless, which is not
moving this pass.

**Only `public/road-network.js` is quarantined in this item.**

| File | Direct importers (non-test) | Verdict |
|---|---|---|
| `public/road-network.js` | **none** — confirmed by both the forward-graph probe and a direct grep for `await import(` across `public/*.js` and `public/*.html` (the blind review's own method, applied here rather than trusted secondhand) | Already fully orphaned. `city-plan.js` is imported *by* it, not the reverse — nothing calls in, statically or dynamically. |

**One committed test constant must change in the same commit.**
`test/terrainLandmassOwnership.test.ts`'s `KNOWN_STATIC_IMPORTERS` array
hard-codes the literal string `"public/road-network.js"` as part of a named,
tracked list of files still reading `city-plan.js`'s `LANDMASSES` directly —
its own header says as much: *"public/road-network.js... are outside this
pass's own routing"* (a prior pass already anticipated this file leaving).
Once the file is no longer in `public/`, the test's own directory scan
(`findCityPlanLandmassImporters`) will no longer find it there, `actual` will
shrink to 5 entries, and the hardcoded 6-entry `KNOWN_STATIC_IMPORTERS` will
fail `assert.deepEqual` — exactly the tripwire the test's own message
describes: *"If this shrank (a file migrated to the real, authoritative copy
in terrain.js), update KNOWN_STATIC_IMPORTERS to match and say so in the
commit."* Doing exactly that, in the quarantine commit, is not a workaround —
it is the test performing its documented job.

**Expected breakage, named in advance, corrected against the blind review's
finding #2.** Four tests import `road-network.js` directly and will need
retirement or a rewrite in item 2: `test/roadNetwork.test.ts`,
`test/bridgePieces.test.ts`, `test/collectorLocalNetwork.test.ts`,
`test/connectivityBridges.test.ts`. Plus the one test constant named above,
handled in this same commit rather than deferred to item 2, since it is a
one-line, mechanical, already-documented update rather than a judgement call
about whether a test still describes something real.

---

## DEFERRED — identified, not quarantined this pass

**`public/city-render.js`, `layout.js`, `layout-fits.js`, `instance-groups.js`,
`public/city.html`, `public/plan-preview.html`.** Moved from WAVE 1 to here
after the blind review — see the CORRECTION block. Not merely entangled with
kept code: `city-render.js`'s `buildWorld` is the live render path for
`public/index.html` today, reached via a dynamic `import()` in
`world-render-3d.js` that the module-graph tool cannot see. Cannot move until
Phase 2's flat board (2.1) and re-pointed shell (2.8) exist to replace what a
visitor actually sees when the page loads.

**`public/city-plan.js`.** Load-bearing for `terrain.js`, `world-render-3d.js`,
`board-adapter.js`, `buildings.js`, and now also `city-render.js` directly
(above) — all reachable from the live `public/index.html`. Cannot move until
Phase 2 supplies a replacement terrain source (2.5) and the generator calls
`place()` instead of being read directly (2.7).

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
the old world"* — is **far from reachable in this item**, and further from it
than the original draft of this document believed. The blind review's
central finding is not just that one more file is entangled — it is that the
old world is not a quarantinable side-path at all today. It is what
`public/index.html` renders. There is no version of the live product today
that does not run `buildWorld()` from `city-render.js`. Clearing it is
therefore not a file-move problem; it is contingent on Phase 2 (2.1, 2.2,
2.8) existing first, so the shell has something else to point at before the
old renderer is removed. Only `public/road-network.js` — genuinely orphaned,
confirmed by both static and dynamic-import checks — is quarantined in this
item. Everything else this document names is a real, dependency-graph- and
dynamic-import-verified finding, not a shortcut: the alternative was either
taking the live site's only rendered content away with nothing to replace
it, or writing replacement/decoupling code under a phase whose entire brief
says not to build anything.
