# THE ROAD HIERARCHY — P2.1

`BOARD-CONVERSION-PLAN.md` P2.1: *"Road hierarchy, from the planning
research Mark supplied... a written description of the hierarchy with the
source for each rule, before any code."*

The planning research is `docs/CITY-PLANNING-SPEC.md`, built from primary
sources (AASHTO Green Book, ITE/CNU) — confirmed the only sourced planning
document in the repo, referenced by name in the commit that created it
(`fac2d39`, Mark: *"research how real cities are actually laid out before
building any more"*). Every rule below cites a section of it.

---

## WHY A HIERARCHY, NOT A GRID

Mark: *"the road layout doesn't make any sense or make a city that you
could drive at all."* The current generator stamps a rectangular grid at
fixed spacing across each settlement's bounding box and promotes every
Nth grid line to a wider class (`city-plan.js`'s own comment, line 2082:
*"Every road here used to be an AVENUE or a STREET at a fixed spacing,
which is a grid with no hierarchy: nothing was more important than
anything else, so nothing had a reason to be where it was."*). That
promotion is **counted from each settlement's own bounding-box corner**,
not routed toward anything — two adjacent settlements' "arterials" do not
generally line up, and nothing connects one settlement's centre to
another's. Converting this to pieces unchanged would preserve the
complaint exactly, which is why Mark chose this phase over a
representation swap.

A real network has a reason for each road: **arterials connect places,
collectors gather local traffic onto arterials, locals fill the blocks
between them.** That reason is what P2 builds.

---

## THE FOUR TIERS, MAPPED ONTO THE EXISTING ROAD CLASSES

No new road classes are introduced. `ROADS`' existing seven
(`FREEWAY`/`RAMP`/`BOULEVARD`/`AVENUE`/`STREET`/`LANE`/`ALLEY`) already
span the right range; what changes is **how a road of each class gets
placed**, not what classes exist.

| Tier | Class(es) | Role | Spacing / continuity | Source |
|---|---|---|---|---|
| **Regional** | `FREEWAY`, `RAMP` | Connects landmasses / far settlements at highway scale. **Unchanged by P2** — `HIGHWAYS`/`FREEWAYS` are hand-authored to Mark's own marked alignment (`city-plan.js:1615`, *"Drawn to the alignment Mark marked on the map"*), not generated, and nothing in P2's brief asks to replace hand-placed regional infrastructure. | — (hand-placed) | — |
| **Arterial** | `BOULEVARD` | Connects settlement **centres** to each other and to the regional network. | ≤ 400 m in a dense core, ≤ 800 m urban, up to 1,600 m only with 6-lane facilities | `CITY-PLANNING-SPEC.md` §1.2 |
| **Collector** | `AVENUE` | Feeds arterials; gathers local traffic. | 1.6–3.2 km continuity | `CITY-PLANNING-SPEC.md` §1.2 |
| **Local** | `STREET`, `LANE`, `ALLEY` | Fills the blocks between collectors. | Desirable block length 61–122 m; acceptable ceiling **183 m**; desirable intersection spacing < 122 m, max average 201 m | `CITY-PLANNING-SPEC.md` §1.3 |

**Junction class is determined by what meets what** (P2.1's own
requirement) — not a fixed lookup, a rule per pair:

| Meets | Piece | Why |
|---|---|---|
| Arterial × Arterial | `roundaboutModern` (3+ arms) or `intersection4Way` | Highest-order junction on the network; a roundabout handles the heaviest, most-conflicting movement with fewer conflict points than a signalised crossroads (§1.6: 4-leg crossroads has 32 conflict points, a roundabout's circulating design removes the crossing ones). |
| Arterial × Collector | `intersection4Way` (4-leg) or `intersection3Way` (T) | Standard signalised/priority junction — the ordinary case. |
| Freeway/Ramp × Arterial | `rampMerge` / `rampDiverge` | Grade-separated interchange, already the pattern `generateRamps()` uses for hand-placed interchanges (`city-plan.js:1653`) — kept, not replaced. |
| Collector × Local | `intersection4Way` / `intersection3Way` | Same shape as arterial×collector, narrower classes. |
| Local × Local | `intersection4Way` / `intersection3Way`, corner radii 3.0–4.6 m urban standard | `CITY-PLANNING-SPEC.md` §1.6. |
| Any × Any at < 60° | Avoided by construction | §1.6: *"avoid angles below 60°"* — arterial routing (P2.2) snaps a connecting leg's approach angle before it is allowed to become a junction. |

Corner radii, approach angles and conflict-point reasoning throughout this
table: `CITY-PLANNING-SPEC.md` §1.6.

---

## WIDTHS: PLACEMENT-CONTRACT.md's STANDARD TABLE, NOT `ROAD_STANDARDS`' REAL VALUES

Every piece P2 lays uses `PLACEMENT-CONTRACT.md` Part 0's standard road
widths, not `roadkit.js`'s `ROAD_STANDARDS` real-world ROW or
`city-plan.js`'s own `ROADS` table:

| Class | Standard width | Source |
|---|---|---|
| ALLEY / LANE | 8 m | `PLACEMENT-CONTRACT.md` Part 0 |
| STREET | 16 m | " |
| AVENUE | 24 m | " |
| BOULEVARD | 32 m | " |
| FREEWAY | 64 m | " |

Mark, on the deliberate mis-scaling this implies: *"nobody's going to
fault us for that. That's not the point of any of this."* — chosen so
block interiors divide evenly, not a measurement.

---

## SPACING, AS A CONCRETE ALGORITHM

**Arterial (P2.2).** `settlementCentres(s)` (`city-plan.js:1824`, existing,
currently unexported and unused by road placement) already computes
roughly one centre per 1.6 km of a settlement's longer bounding-box
dimension. P2.2 connects every settlement's centre(s) to its nearest
neighbours — other centres and the regional network (`HIGHWAYS`/
`FREEWAYS`) — as `BOULEVARD` piece chains. This is the mechanism that
makes §1.2's ≤ 800 m urban arterial spacing real rather than counted from
an arbitrary bounding-box corner: the arterial exists **because it
connects two real places**, and its presence or absence follows from that,
not from a modulo counter.

**Collector (P2.3).** Existing `generateSettlement()` density-aware block
spacing (`avEff`/`stEff`, already scaled by local density) is reused for
collector placement, but a collector's own *class* is no longer decided
by "is this the Nth grid line" — it is decided by **which junction it
actually terminates at**: a grid line that reaches an arterial becomes a
real `AVENUE` collector feeding that arterial via a real junction piece;
a grid line that does not reach one stays local.

**Local (P2.3).** Fills the remainder, same 61–201 m block-length target
already enforced elsewhere in this codebase (the ITE 183 m ceiling test
in `test/cityWorld.test.ts`, referenced in `CLAUDE.md`) — P2 does not
relax that existing check, it gives the local grid a real collector to
terminate against instead of running to the settlement's own edge.

---

## STANDING RULE, RESTATED

Zoning and planning codes are **knowledge that informs layout**, never a
compliance engine built into the game. Every number above is a *design
input* to where P2's generator places a piece — none of it becomes a
runtime rule a player's own road-building would be checked against. That
distinction is Mark's, stated identically for plot classes in
`PLACEMENT-CONTRACT.md` Part 1 and repeated for the road network in
`BOARD-CONVERSION-PLAN.md` P2.1 itself.

---

## WHAT THIS DOES NOT COVER, NAMED RATHER THAN IMPLIED

- **Freeway/regional alignment** is unchanged — hand-authored, out of scope.
- **Terrain-following curvature** for arterial legs: P2.2 checks each
  arterial connection against `grade.js`'s `ROAD_GRADE.BOULEVARD`
  (`maxGrade: 0.06`) and reports any leg that would exceed it; it does not
  attempt genuine switchback routing for a leg that fails — a failing leg
  is named as a finding, not silently forced straight through infeasible
  ground. `grade.js` and `land-use.js`'s `ROAD_SLOPE_MAX` already exist
  for this and are used, not reinvented.
- **Every collector and local road in the existing 700+-span network**
  converting to piece chains in this same pass is a size question, not a
  design question — addressed as work proceeds and reported honestly
  against P2.4/P2.5's gates, not assumed complete because P2.1–P2.3 are.
