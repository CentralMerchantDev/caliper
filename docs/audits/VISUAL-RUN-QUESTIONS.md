# CALIPER — Visual Run Questions & Decisions for Mark

**Date:** 2026-09-06  
**Status:** Live Log for Phases V1–V8

---

## 1. PLACEMENT CONTRACT & FOOTPRINTS (Landed in de2573b)

### Decision 1: TOWER Footprint Cell Bracket
- **Context:** PLOT_CLASSES.TOWER historically declared minW: 45, maxW: 90 (5.625 to 11.25 cells).
- **What We Chose:** Proposed **6–11 cells (48×48 m to 88×88 m)** as suggested in docs/specs/PLACEMENT-CONTRACT.md.
- **Alternative:** 4–11 cells or 5–11 cells.
- **Status:** VOID, per Mark, 2026-09-06. This question only made sense when a plot's declared class bound what could be built on it -- a "TOWER plot" that a tower model had to fit inside. Mark's correction removes that binding: a plot's only property is its free space, so bld-tower's own clamp (4-8 cells, read straight from buildings.js) already fully answers what a tower needs. PLOT_CLASSES.TOWER now just uses the same mechanical floor/ceil widening as every other class (5-12 cells / 40-96 m, in public/city-plan.js) as a record of what world generation seeds there -- not a bracket anything has to fit. Left here rather than deleted, so the reasoning that produced 6-11 isn't lost.

### Decision 2: Single Neutral Footprint Constant
- **What We Chose:** Exported TYPOLOGY_FOOTPRINT_CELLS in public/typology-footprints.js derived directly from uildings.js clamps, tested via 	est/typologyFootprints.test.ts.

---

## 2. PHASE V1 — FACADE TEXTURING (Landed in 280b029)
- **Decision:** Procedural PBR Texture Atlases (public/facade-textures.js).
- **What We Chose:** 4 architectural character atlases (heritage, interwar, postwar, contemporary) @ 1024×1024 with Diffuse, Roughness, Normal, and Emissive maps. Added UV attribute merging in mergeGeometries (uildings.js).
- **Texture Memory:** 4 atlases × 4 maps @ 1024×1024 = 16 MB texture memory total (<= 64 MB budget).

---

---

## 1a. `clear`: THE GAP MARK'S CORRECTION LEFT OPEN

**PROPOSED, not decided. Mark and agy own these numbers -- this is a starting
point derived from what each typology needs to be approached and entered, not
a measurement of anything, because nothing declares this today.**

Mark's 2026-09-06 correction: a plot is space; a building declares `foot`
(the ground it stands on, already in public/typology-footprints.js) and
`clear` ("extra free ground required around it... towers need room around
them for walking and driveways and such"). The board's only question becomes
whether a free rectangle of `foot` + `clear` exists where a player wants to
build.

**The precedent to follow, not invent a new pattern for:** public/
prop-manifest.js already carries exactly this concept for small objects --
`clear`, "extra free ground required around `foot`, in metres" -- consumed by
`propFootprint()` as a flat pad added to both width and depth (`pad * 2`,
i.e. applied symmetrically on every side): bin 0.25 m, bench 0.4 m,
busShelter 0.5 m, lampPost 0.3 m, container 0.1 m. Buildings need the same
shape of number, just a larger one.

| Typology | Proposed `clear` (m) | Why |
|---|---|---|
| bld-villa | 2.0 | Front path to the door plus a modest side/garden gap. |
| bld-terrace | 1.0 | Row unit, party walls both sides in practice -- only the front realistically needs clearance (doorstep, bins). Flagged below: a symmetric pad may be the wrong model for a tiling row typology. |
| bld-townhouse | 1.5 | Same row-tiling caveat as bld-terrace; slightly more frontage for a wider unit. |
| bld-midrise | 3.0 | Shared entry/lobby approach for multiple households or tenants. |
| bld-shop | 2.0 | Frontage for browsing, queuing, signage -- pedestrian, not vehicle. |
| bld-office | 3.5 | Entry plaza plus occasional vehicle drop-off. |
| bld-apartment-walkup | 2.5 | Shared entry, bike/stroller storage immediately outside. |
| bld-workshop | 4.0 | Vehicle access for trade/delivery, smaller than full truck turning. |
| bld-warehouse | 8.0 | Truck turning radius and loading-dock apron -- the one typology where `clear` is load-bearing, not cosmetic. |
| bld-tower | 6.0 | Mark's own example: pedestrian flow and driveway/drop-off room around a tall building's base. |

**Open question this proposal surfaces, not resolves:** `propFootprint()`'s
symmetric pad-on-every-side model is right for a free-standing object like a
bin or a tower, but bld-terrace/bld-townhouse butt against neighbours on
purpose -- padding every side of a row unit would either overstate the space
a full row needs (each interior unit does not actually need its own side
clearance, the row does) or, if applied per-unit at placement, quietly break
tiling. Whether `clear` needs a per-typology "which sides" shape, or terrace/
townhouse simply declare a smaller front-biased number and accept the
approximation, is Mark/agy's call, not resolved here.

---

---

## 4. STRUCTURAL REPETITION IN `bldTownhouse` (Recorded for Review)

- **Finding:** `bldTownhouse` in `public/buildings.js` hardcodes `footW = 16` and `footD = 24` (2×3 cells), meaning all 5,342 townhouses placed across the city share identical dimensions. No texture variation can fully hide identical footprint geometry repeating across miles of streetscape.
- **Why It Is Not Fixed In This Step:** Changing `bldTownhouse`'s footprint or adding parametric width variation right now directly impacts plot carving, which is actively owned by the CLI lane during the rebalance.
- **Proposal for Post-Rebalance:**
  1. Parameterize `bldTownhouse` width across whole-cell variants (e.g. 2 cells = 16m, 3 cells = 24m, 4 cells = 32m, matching `PLOT_CLASSES.TOWNHOUSE` [8, 32]m bounds).
  2. Allow `layout.js` to assign 2-cell, 3-cell, and 4-cell townhouse models based on carved plot width.
  3. Wire library townhouse variants (`bld-*-townhouse` across tiers) once world generation draws from the library.

---

## 5. CURRENT PHASE STATUS
- Phase V1: Facade Texturing — LANDED (280b029)
- Phase V2: Prop & Generator Geometry — COMPLETED / GATED (4f80434)
- Corrections: Roof UV Remap (no windows on roofs) & Live Phase-Delta Gate — LANDED (ab3589b)
- Model Library Reachability (Populated 2,400 models at build time) — LANDED (9d1693b)
- Library Model Enrichment (Steps 2 & 3 of LIBRARY-AS-SOURCE.md) — Awaiting Mark's Review

---

## 6. LIBRARY-AS-SOURCE.md STEP 4 — THE SELECTION POINT, BUILT AND WAITING TO BE WIRED

**For agy, one line, when convenient -- nothing here is blocking.**

`public/layout.js` now exports `libraryModelFor(className, situation)`: given
a plot's class and its free space (`situation.fits`, the same value
`typologyFor`'s `fits` predicate is already asked about), it filters the real
`ASSET_REGISTRY` to the `buildings`/`civic` category and a proposed tier band
per class (`LIBRARY_TIERS_FOR_CLASS`, see its own comment for the reasoning),
checks each candidate's real footprint against the space in both
orientations, and returns a real model id or `null`. Tested against the live
2,400-entry registry, not a mock -- see test/layout.test.ts, "the library, as
a second source."

**It is additive, not wired in.** `typologyFor` and everything that calls it
(`planPlot`, `planBlock`, `planCity`) are byte-for-byte unchanged;
`city-render.js:279`'s `planCity(..., makeFits())` keeps building from the
twelve typologies exactly as it does today. Activating library selection in
the live render is a decision LIBRARY-AS-SOURCE.md itself defers ("procedural
and library models can coexist... that is a decision for after step 4, made
by looking at both on screen") and a one-line change in `city-render.js`,
which is your file, not this one.

**Not done, and worth naming rather than silently skipping:** no `clear` on
any library entry yet (step 2, yours) -- `libraryModelFor` reads it if
present and defaults to 0 if not, so it will start respecting clearance
automatically the moment step 2 lands, no change needed on this side. No
footprint cell-alignment yet either (also step 2) -- fit-checking works fine
against the raw metric footprints in the meantime. And tier-matching is the
only axis considered so far, not style ("Art Deco Skyscraper" vs "Alpine
Chalet") -- a villa plot can currently draw a model named "Wave Tower" as
long as its tier and footprint both fit. Real, not a stub, but a first pass
on suitability, named as one.