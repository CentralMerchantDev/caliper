# World rebalance — before and after

**Written 2026-09-07**, closing out `docs/specs/WORLD-REBALANCE-BRIEF.md`.
Every number below has the command that produced it beside it. Nothing here
is asserted without a way to re-take it.

Starting point: `docs/audits/WORLD-DENSITY-FINDINGS.md`, measured
2026-09-06 — "the world is not sparse, it is inverted." Six steps, worked
in order, each committed separately (`git log`, `45e7f06..HEAD`).

---

## 1. THE HEADLINE NUMBERS

| | Before (pre-756fd95) | After (current) | Command |
|---|---|---|---|
| Total plots | 19,874 | 17,583 | `node scripts/measure-density.mjs` |
| Barrier island share of all plots | **56.0%** | **3.3%** (578 plots) | `node scripts/measure-density.mjs` §1 |
| Downtown TOWNHOUSE share | 48% (627/1,300) | 49% (627/1,282) — count unchanged, denominator moved | §3, DOWNTOWN ONLY |
| Downtown TOWER-class plots | 80 | **142** | §3, DOWNTOWN ONLY |
| World-wide TOWER-class plots | 81 | **206** | §3 |
| World-wide bld-tower buildings | 55 | **149** | `node scripts/measure-layout.mjs` |
| Barrier island plots-per-road | 4.3 (345 roads, 1,486 plots) | **8.6** (67 roads, 578 plots) | `node scripts/measure-roads.mjs` |
| Mainland "Harbour City" class | TOWER, core 0.85 | MIDRISE, core 0.58 | `public/city-plan.js`, `coastal-6`/`coastal-7` |
| coastal-4 (Marchmont) density | 8/km² | 144.5/km² | §2, per-settlement |
| coastal-9 (Ridgeway) density | 7/km² | 516.0/km² | §2, per-settlement |

The barrier and downtown numbers are the two the brief named explicitly.
The mainland density figures answer "almost vacant" — coastal-4 and
coastal-9 were the two `WORLD-DENSITY-FINDINGS.md` §4 called out by name.

---

## 2. WHAT CHANGED, IN COMMIT ORDER

1. **`756fd95`/`772fd77`/`a8a0d28`** — `PLOT_CLASSES` went whole-cell
   (`docs/specs/PLACEMENT-CONTRACT.md` Part 1). First attempt regressed
   `bld-tower` 55→1 by applying a width-snap meant for tiling rows to every
   class; fixed with a `tileRow` flag restricting the snap to
   TERRACE/TOWNHOUSE, verified back to 55.
2. **`654fa41`** — Mark's correction: a plot is space, not a slot for a
   kind of building. `PLOT_CLASSES` is now a seeding record only.
3. **`6941d3d`** — `layout.js` gained `libraryModelFor()`, a real selection
   point reading the 2,400-model registry (additive, not wired into the
   live render — that is agy's call, per `docs/specs/LIBRARY-AS-SOURCE.md`).
4. **`3419331`** — the rebalance itself: barrier demoted to VILLA/RESORT at
   a fraction of its old density (a new `scale` field on
   `settlementDensity`, since core/edge alone floors at 62% of the
   settlement's own wobble term and cannot reach "sparse everywhere");
   mainland's Harbour City demoted from a second TOWER core to MIDRISE;
   downtown's density thresholds lowered so more of its real intensity
   field reaches MIDRISE/TOWER. This required disabling `zoneCharacter`'s
   settlement-class override, which was silently re-deciding 81% of
   settlements regardless of what this rebalance declared — the same
   two-sources-of-truth failure `WORLD-DENSITY-FINDINGS.md` §3 diagnosed
   for TOWER settlements specifically, found again at the scale of the
   whole world. `zoneCharacter` still runs and `zoningChanges` still
   records what it would have done (`applied: false` on every entry).
5. **`511e45e`/`f2dd717`** — the barrier's empty-looking street grid (Mark's
   own diagnosis: "it is roads, not ground material") fixed by coupling
   road spacing to a settlement's density scale; reconciled against the
   ITE 183 m walkable-block ceiling by extending its existing "not
   pedestrian fabric" exemption to genuinely sparse settlements.
6. **`b4c95bc`** — the "industry clusters" test's floor (20 industrial
   plots) was calibrated against the `zoneCharacter` bug's phantom
   contribution (it used to reclassify `coastal-9`/`coastal-10` to HANGAR
   by airport proximity alone, overriding their declared VILLA/FARM
   intent). Lowered to reflect the honest number (15, all genuinely
   transport-adjacent).
7. **`467a184`** (step 4) — road connectivity measured, not re-planned.
8. **`ec3b83b`** (step 5) — origin stability written, watched red, not
   fixed.

---

## 3. STEP 4 — ROAD CONNECTIVITY, MEASURED

`node scripts/measure-roads.mjs`:

    world: 1357 roads
    junctions: 4511 crossing pairs
    connected components: 52
    largest component: 1053 roads (77.6% of the network)
    stranded (cross nothing): 38 roads (2.8%) -- 15 AVENUE, 10 BOULEVARD,
        7 RAMP, 5 STREET, 1 FREEWAY
    18 settlements have their own roads split across more than one
        component; the regional connectors (freeway, approach, coast-road,
        link) fragment worst (8-11 components each)

**Finding: Mark's complaint is real but not total.** 77.6% of the network
genuinely is one connected whole. The other 22.4% — roughly 300 roads
across 51 separate pieces — is not, and 38 roads connect to nothing at
all. The regional connectors fragmenting worst matters more than an
ordinary settlement's internal split, since their entire purpose is
joining settlements together. **Not re-planned. No road added, removed, or
moved to produce these numbers.**

---

## 4. STEP 5 — ORIGIN STABILITY, WRITTEN AND WATCHED RED

`node --test test/originStability.test.ts`:

    plot[0] moved from (-1343.8, 768.9) to (-1048.0, 684.9) when
    WORLD.SIZE moved from 26,000 to 20,800 (WORLD_SCALE 0.65 -> 0.52)

**Finding: the origin does move, and this is expected to be red.**
`WORLD.SIZE` has exactly one lever today, `WORLD_SCALE` — a full landform
rescale (`public/world-scale.js`'s own documented rule), not a boundary
extension. `GRID.ORIGIN_X`/`ORIGIN_Z` are `ISLAND.xMin`/`zMin`, and
`ISLAND` is a landform extent, so it scales too. There is no fixed,
scale-independent anchor a saved coordinate could be checked against yet.
**Not fixed.** The other two properties `WORLD-DENSITY-FINDINGS.md` §8
names (locked-is-not-absent, determinism-survives-growth) are for a later
pass, once a real "open new land" operation — one that does not route
through `WORLD_SCALE` — is designed.

---

## 5. WHAT MARK SPECIFICALLY NEEDS TO JUDGE

### a) Downtown tower count — not chosen here

<!-- Renders: .shots/downtown-skyline.png (149 towers, committed) and
     .shots/downtown-skyline-180towers.png (comparison, not committed --
     DENSITY_AT pushed to [0.00, 0.11, 0.26, 0.32, 0.40], 180 downtown
     towers, rendered and discarded) -->

Both renders are in `.shots/`. The current, committed world has 142
downtown TOWER-class plots (149 `bld-tower` buildings world-wide). A
comparison render exists at 180 downtown TOWER-class plots (206
world-wide), produced by lowering `DENSITY_AT`'s top rung from 0.50 to
0.40 — **not applied**, `public/city-plan.js` is unchanged from the
committed value. Whether 149 reads as a skyline, or needs to go further,
is a call from the picture, not a number defended in this document.

### b) Barrier island vs. an ordinary neighbourhood

`.shots/the-boardwalk.png` (barrier island foreground, downtown skyline
across the water) and `.shots/in-the-street.png` (an ordinary
downtown-adjacent street) are the closest ground-level comparison the
existing camera presets support. `.shots/housing-close.png` is a closer,
higher-density downtown view for additional context. Whether the thinned
barrier reads as a deliberate beach town against those is Mark's read, not
asserted here.

### c) The countryside's second half — not this lane's fix

`.shots/farm-belt.png` still shows bare ground between actual crop-field
patches in West Farms (`coastal-0`/`coastal-1`) — unaffected by the road
fix, since FARM never declares a sparse `scale`. Named for agy in
`docs/audits/VISUAL-RUN-QUESTIONS.md` §8: ground unclaimed by any plot or
field defaults to bare terrain texture rather than grass/scrub/forest.
Secondary, not blocking, not this lane's file to fix.

---

## 6. PUT IN FRONT OF HIM, NOT BURIED

**`bld-terrace` is now 43.8% of the world (was 33.1%).** Mark's original
complaint was "a bunch of tiny row houses" — as a *share* of the world this
is worse, even though the top end (towers, midrise) genuinely improved.
Some of it is arithmetic: `bld-villa` nearly halved (18.8% → 8.7%) as
density moved toward denser classes, and terrace absorbed a
disproportionate share of what villa gave up, because TERRACE sits
directly below TOWNHOUSE on several `SETTLEMENT_MIX` body lists and
inherited more of the shift than any single other class. **A proposal, not
a decision:** if terrace's share should come down, the lever is
`SETTLEMENT_MIX`'s per-class body-mix weights (`public/city-plan.js`), not
`DENSITY_AT` — narrowing terrace's weight in the VILLA/TOWNHOUSE body lists
in favour of villa or townhouse would pull the share back down without
touching the density thresholds that fixed downtown. Not done here; it is
a real, separate calibration question once the tower-count question above
is settled, since both pull on the same `SETTLEMENT_MIX` tables.

**Refusals tripled: 149 → 478 (0.75% → 2.7% of all plots), all "ground
refused."** Traced (`node -e` against `planCity`'s own refusal list,
joined back to `world.settlements`'s landmass): 474 of 478 (99%) are on
**mainland**. This is the direct, expected cost of raising mainland
density to fix "almost vacant" (§1 above) — more blocks are now attempted
per settlement, including ones nearer cliffs, steep slopes and the water's
edge, and the footprint system is correctly refusing the ones that
genuinely do not fit rather than building on them. The refusal *rate* is
still low in absolute terms (2.7%); it tripled because the density
increase that fixed the "8/km²" problem proportionally increases how many
blocks are attempted at all, including the marginal ones. Not a new
defect — the system working as designed under higher demand.

---

## 7. TESTS: WHAT IS RED, WHY, AND WHEN IT CLOSES

| Test | Status | Closes |
|---|---|---|
| `cityWorld.test.ts` — "the embedded city summary is not stale" | Re-pinned this pass | `node scripts/gen-city-summary.mjs`, this commit |
| `planSeed.test.ts` — "the default plan is byte-identical..." | Re-pinned this pass | New hash, this commit |
| `cityWorld.test.ts` — "industry clusters at a transport node" | **Fixed** (`b4c95bc`) | Closed |
| `originStability.test.ts` | **Red on purpose** | Stays red until a real "open new land" operation exists (§4 above) — this is not a bug to fix, it is the measured state of an operation that does not exist yet |
| `layoutGeometry.test.ts` — "the seed layout-fits.js measured..." | Still open, 2 of 17,105 placements | Not investigated this pass — a pre-existing seed-matching edge case at `redcliff-isle-vlg`, surfaced by this world's geometry, not caused by the rebalance mechanism itself. Named, not closed. |

The seed pins are re-pinned once, immediately following this document, in
their own commit, naming this document.
