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

## 3. PHASES V2–V8 (NOT STARTED)
- V2: Props enrichment — NOT STARTED
- V3: Building silhouettes & near-band massing — NOT STARTED
- V4: Ground plane & street surfaces — NOT STARTED
- V5: Material & character palettes — NOT STARTED
- V6: Dynamic life & animation — NOT STARTED
- V7: Distance-banded LOD — NOT STARTED
- V8: Regression gate & closeout — NOT STARTED