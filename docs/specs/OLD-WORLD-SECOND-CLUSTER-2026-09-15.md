# A second, independently-dead subsystem — found while quarantining the terrain chain, not part of it

**Found 2026-09-15, while executing docs/DECISIONS-FOR-MARK.md #22** (quarantine
`public/terrain.js` and its own direct dependency chain, per Mark's ruling to
rebuild TER-1..5 fresh from RESEARCH.md). That quarantine's own fallout
measurement turned up a second, larger cluster of files that are **also**
fully unreachable from product, but do **not** import `terrain.js` themselves
— they are connected only because a handful of their own tests separately
import `public/world.js` (part of the terrain chain) as fixture convenience.

**Not touched.** This document is the inventory `rule://quarantine` requires
before any Tier-2 action — "inventory, categorise, get the exact list
confirmed, then act." Nothing below has been moved. See
docs/DECISIONS-FOR-MARK.md #23 for the actual decision this inventory is for.

## What it looks like

This reads as a **complete second game-loop iteration**, predating the
current area-board rebuild: a world model with layers (`world-model.js`),
persistence (`world-store.js`, `world-registry.js`), an apply/edit pipeline
(`apply-and-persist.js`, `apply-layers.js`), an LLM change-request pipeline
distinct from the live one (`generate-request.js`, `run-generate-request.js`,
`model-forge.js`, `model-registry.js`), a quest system (`quest.js`,
`change-quest.js`), and its own building/road/prop content generators
(`buildings.js`, `roadkit.js`, `props.js`, `land-use.js`, `zoning.js`,
`typology-footprints.js`, `tier-models.js`, `settlement-fit.js`,
`resolve-models.js`, `showstoppers.js`, `footprint.js`, `grade.js`,
`prop-manifest.js`, `prop-placement.js`, `features.js`, `noise.js`,
`world-scale.js`).

**Verified independently non-product**, the same way the terrain chain was:
`scripts/lib/module-graph.mjs`'s own `classifyRepoReachability` — the exact
function `test/deadExports.test.ts` uses — reports **zero** files in this
list with a `product`-state export. None of it is reachable from
`public/index.html`'s own script tags or `src/index.ts`.

## The exact list, 63 files

### Source and scripts (45)

```
public/apply-and-persist.js
public/apply-layers.js
public/buildings.js
public/change-quest.js
public/features.js
public/footprint.js
public/generate-request.js
public/grade.js
public/land-use.js
public/model-forge.js
public/model-registry.js
public/noise.js
public/prop-manifest.js
public/prop-placement.js
public/props.js
public/quest.js
public/resolve-models.js
public/roadkit-street-demo.js
public/roadkit.js
public/run-generate-request.js
public/settlement-fit.js
public/showstoppers.js
public/tier-models.js
public/transform.js
public/typology-footprints.js
public/world-model.js
public/world-registry.js
public/world-scale.js
public/world-store.js
public/zoning.js
scripts/_board-adapter-probe.mjs
scripts/check-layout-geometry.mjs
scripts/check-parts.mjs
scripts/measure-k6-buildings.mjs
scripts/measure-layout.mjs
scripts/proto-art-deco.mjs
scripts/test-buildings-variety.mjs
scripts/test-circulation.mjs
scripts/test-city-rest.mjs
scripts/test-eco-showstoppers.mjs
scripts/test-part2-coverage.mjs
scripts/test-showstoppers.mjs
scripts/test-variant-mutations.mjs
scripts/variant-coverage.mjs
scripts/verify-roadkit.mjs
```

### Tests (18)

```
test/buildingExplicitSize.test.ts
test/buildingFeatureFlags.test.ts
test/buildingLODAndColors.test.ts
test/libraryStructure.test.ts
test/modelForge.test.ts
test/modelRegistry.test.ts
test/noise.test.ts
test/originStability.test.ts
test/propManifest.test.ts
test/propPlacement.test.ts
test/quest.test.ts
test/registryVolume.test.ts
test/roadkit.test.ts
test/trimAtlasPatch.test.ts
test/typologyFootprints.test.ts
test/worldExtent.test.ts
test/worldModel.test.ts
test/worldRegistry.test.ts
```

Method: seeded from the 12 files a hand-check found (`apply-and-persist.js`,
`apply-layers.js`, `change-quest.js`, `generate-request.js`, `model-forge.js`,
`model-registry.js`, `quest.js`, `run-generate-request.js`, `transform.js`,
`world-model.js`, `world-registry.js`, `world-store.js` — all confirmed
non-product independently of the terrain chain), then closed under both
"who imports this" and "what does this import, if that is ALSO confirmed
non-product" until nothing new was added. Zero files in the closure carry a
product-reachable export.

## What this is not

Not a claim that any of it is worthless. `noise.js` in particular (hash-based
value noise / fbm) is genuinely reusable, general-purpose code with no
project-specific coupling — the kind of thing TER-1..5's own coastline work
might reasonably want, if a decision is made to use it rather than write a
second noise implementation. Named here rather than assumed either way.

## Why this is a separate decision from #22

#22 already has Mark's ruling (quarantine `terrain.js`'s own chain, rebuild
terrain fresh). This is a different, independently-arrived-at 63-file
cluster with a different real cost if wrong: it looks like an entire
previous product iteration, not one subsystem, and — per the standing rule
("never bulk-delete... get the exact list confirmed, then act") — that is
exactly the kind of action that needs its own explicit yes, not inherited
from a decision about something else.
