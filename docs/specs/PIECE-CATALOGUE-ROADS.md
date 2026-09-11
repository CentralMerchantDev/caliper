# PIECE CATALOGUE — ROADS

Status: **proposal, untracked, awaiting Mark's approval.** Drafted 2026-09-11
from Mark's spoken brief, `rule://standard-piece-sizes` ("Not yet decided: the
catalogue itself — how many sizes, and what they are") and a direct read of
`public/roadkit.js` and `public/board-generator.js`.

Roads only. Buildings, props and materials get the same treatment afterwards —
the point of doing roads first is that they block B4, and that the pattern
settled here is then repeated rather than re-argued.

---

## 1. TWO CATALOGUES, NOT ONE

The brief bundles two things that pull in opposite directions, and separating
them is most of the work:

- **Footprints — the set of distinct slot dimensions. Kept SMALL.** A large
  footprint set is exactly what `rule://standard-piece-sizes` exists to prevent:
  *"that'll make it really difficult to lay out the board."*
- **Types — the distinct pieces within a class: lane configurations, surfaces,
  furniture, aesthetics. Kept LARGE**, Mark's 20–30 per class. Once every piece
  snaps, variety is free.

So: roughly seven road footprints carrying thirty-odd road types. Thirty road
types is coherent. Thirty road widths is the chaos the rule forbids.

---

## 2. THE MODULE — 2 METRES

**Every road footprint is an even number of metres. Proposed module: 2 m.**

This is not invented. It is already true of every road class in the repository.
Read directly from `public/roadkit.js`'s `ROAD_STANDARDS`:

| Class | `row` (m) | Module multiple |
|---|---|---|
| `ALLEY` | 6 | 3 |
| `LANE` | 10 | 5 |
| `RAMP` | 14 | 7 |
| `STREET` | 18 | 9 |
| `AVENUE` | 28 | 14 |
| `BOULEVARD` | 44 | 22 |
| `FREEWAY` | 62 | 31 |

All seven are multiples of 2. The board's own grid atom is already 1 m
(`board-generator.js:84`, *"atoms (metres)"*), so a 2 m module is two atoms —
no re-basing of the coordinate system, and origin stability is untouched.

This matches published modular-kit practice, where every piece is an integer
multiple of one snap unit so pieces tile without gaps or overlaps.

**And it identifies the real defect.** `board-generator.js:84` sets
`ROAD_WIDTH = 9` — *"one local-street width for every road, P1 of this
generator."* **Nine is the only odd width anywhere in the system.** It is not
that roadkit is missing a 9 m class; it is that the board has a single width at
all, and that the one it picked cannot tile with anything else. See §6.

---

## 3. THE FOOTPRINT SET

**Proposal: keep the seven that exist. Add none yet.**

They already span alley to freeway, each carries a real, sourced cross-section
(`FREEWAY.kerbRadiusReason` cites the AASHTO / Austroads WB-15 design vehicle),
and each is defined as `strips` of `verge` / `carriageway` / `sidewalk` — which
is `rule://standard-piece-sizes`'s *"a road piece is lanes plus sidewalk in one
piece"*, already built.

Adding widths is cheap later and expensive to reverse once the board is
generated against them. Seven is enough to carry the type list in §4.

---

## 4. THE TYPE CATALOGUE

Mark's spoken list, mapped onto the footprints above. **A type is a variant on a
footprint, never a new width.**

| Type | Footprint | Status |
|---|---|---|
| Laneway | `ALLEY` 6 | built |
| One-lane local, sidewalks both sides | `LANE` 10 | built |
| Regular two-lane, sidewalks both sides | `STREET` 18 | built |
| Four-lane, two each way, sidewalks | `AVENUE` 28 | built |
| Partitioned two-lane (central median) | `BOULEVARD` 44 | built |
| Partitioned one-lane | `LANE` / `STREET` | **missing** |
| Highway, 6 lane | `FREEWAY` 62 | built |
| Highway, 2 / 4 / 8 / 10 lane | needs `lanes` variants | **missing** |
| On-ramp / off-ramp | `RAMP` 14 | built, with interchange sockets |
| Dirt road | any, surface variant | **missing** |
| Tram line | any, `hasTram` flag exists | flag built, geometry **missing** |
| Bridge (arch, cable-stayed) | `AVENUE` / `BOULEVARD` | built |
| Level crossing | `STREET` | built |
| Turning head / cul-de-sac bulb | `STREET` | built |
| Walking path | **not a road** — own class | **missing** |
| Subway | **not a surface piece** — own layer | **missing** |

Variety within a type — surface wear, markings, kerb treatment, street furniture,
lighting, planting — multiplies on top of this and does not change a footprint.
That is where the 20–30 per class comes from, and none of it touches layout.

---

## 5. JUNCTIONS — MIXED-CLASS BY CONSTRUCTION, ALREADY BUILT

**An earlier draft of this document proposed that junctions be same-class only,
with width changes forced into a dedicated transition tile between junctions.
That was wrong and has been withdrawn.** It is recorded here rather than deleted
because the reason it was wrong is the useful part.

Mark's objection, 2026-09-11: a four-lane road necking down to two lanes before
a junction and back to four after *"doesn't make sense"*, the transition tiles
consume grid cells that then cannot be built on, and the thing actually wanted
is *"two lanes in the one, four lanes on the other."*

**`public/roadkit.js`'s `junction()` already does exactly that.** Read directly,
lines 335–366:

- It takes **`arms = [{ class, bearing }]`** — a class **per arm**. The
  `STREET`-on-all-four default is a default, not a constraint.
- The square is sized to the widest arm:
  `totalBoxSize = maxRow + maxKerbRadius * 2`.
- **Each arm keeps its own width and lane count** — each socket carries
  `width: std.row` and `lanes: std.lanes` from *that arm's* standard.
- The piece id is generated from the arm mix
  (`junction-4way-street-street-avenue-lane`), so junction types are enumerated
  **by construction**, not hand-authored. Mark's *"the more junction types you
  have, the better you can lay it out"* costs nothing to satisfy: they already
  all exist.

**And the combinatorial fear that motivated the withdrawn rule was unfounded.**
Junction squares land on the 2 m module automatically, for every arm mix:
`maxKerbRadius * 2` is even whatever the radius, every `row` is even (§2), and
even plus even is even. No enumeration, no constraint, no exception. Checked
against the real values — `FREEWAY` 62 + 15×2 = 92, `BOULEVARD` 44 + 12×2 = 68,
`RAMP` 14 + 12×2 = 38.

So the withdrawn rule would have replaced a working, more capable mechanism with
a weaker one — the project's own Failure pattern E.

**Transitions are not deleted, but they are demoted:** a transition piece is a
legitimate *optional* type for a road genuinely narrowing mid-block, between
junctions. It is never required, and it is never the way a junction handles
mixed arms.

Current state, read from `roadkit.js`:

- `junction(arms)` — mixed-class, per-arm, square sized to the widest arm. Built.
- A second four-arm builder defaulting to `AVENUE` arms. Built.
- Ramp and interchange socket geometry, with a comment recording that a socket
  offset was corrected against `ROAD_STANDARDS` itself rather than an assumed
  grid. Built.
- **No roundabout builder exists.**
- **No signalised-junction variant exists** — junction geometry is built,
  signals are not.
- **No mid-block transition piece exists** — optional, per above, not blocking.

---

## 6. WHAT THIS MEANS FOR DECISION 5

Decision 5 asked: add a 9 m roadkit class, change `ROAD_WIDTH` to 10, or accept
a 1 m mismatch. **All three accept the premise that the board has one road
width. That premise is the defect.**

`rule://standard-piece-sizes` already settles the parts that made the original
question feel expensive:

- *"Widths need not match real-world dimensions"* — so no cross-section has to be
  researched into existence to justify a 9 m class.
- *"Regeneration is accepted. Coverage and density numbers get re-taken when the
  catalogue changes. That cost was accepted explicitly."* — so the argument
  against changing the board's widths, which was the whole basis of the original
  recommendation, does not hold.

**Proposed replacement for decision 5:** retire `ROAD_WIDTH` as a single
constant. The board generator places **typed** road pieces whose widths come from
`ROAD_STANDARDS`, defaulting to `STREET` where the current code assumes one
width. Regenerate, and re-take the coverage and density numbers as the rule
already accepts.

This is a larger change than any of the three original options, and it is the
one that stops the question recurring.

---

## 7. WHAT THIS DOES NOT DECIDE

- **The building catalogue.** Same treatment, separate document, after roads.
- **Which types get built first.** This is the catalogue, not the sequence.
- **The variety count per type.** Mark's 20–30 is a target for the variety layer,
  not a commitment that all seven footprints need thirty variants each.
- **Whether the existing board is regenerated now or at B5.** Timing is Mark's.

---

## 8. OPEN FOR MARK

1. **Is the 2 m module right**, or should it be 1 m (every width, not just even
   ones) — 1 m is more permissive and slightly weaker as a guarantee.
2. **Seven footprints, or does the partitioned one-lane road need its own
   width** rather than sharing `LANE` or `STREET`?
3. **Junction squares are large, and the largest are very large.** A `FREEWAY`
   junction is 92 m square by the formula in §5, against settlement blocks
   measured in tens of metres. Is an at-grade 92 m square acceptable on the
   board, or should freeway-class junctions always be grade-separated
   interchanges instead — which `roadkit.js` already has ramp and socket
   geometry for? This is a real design question, not a gap to fill in.
