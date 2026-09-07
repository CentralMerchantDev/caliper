# P2.3 — collectors and locals, and three real bugs found converting them

Evidence for `docs/specs/BOARD-CONVERSION-PLAN.md` P2 finish, item 2. Every
number below has the command that produced it beside it. Companion to
`docs/audits/P2-ARTERIAL.md` (the arterial layer, a separate, smaller,
hand-built network); this document is the EXISTING generated network's
majority — collectors (`AVENUE`) and locals (`STREET`/`LANE`/`ALLEY`) —
converted to socket-verified piece chains.

**SCOPE, LED WITH RATHER THAN BURIED: not every junction verifies.** 879 of
3,778 do not, and every one of those 879 is checked here against a real,
sourced explanation (a leg's own corner radius exceeds its adjacent block's
length) rather than assumed to have one.

## What was converted

`public/road-network.js`'s `buildCollectorLocalNetwork(roads)`. Input is
`generateWorld(heightAt).roads` — the SAME 1,357-road array
`scripts/measure-roads.mjs` already measures, not a re-derived or
re-generated layout. `AVENUE`/`STREET`/`LANE`/`ALLEY` are converted;
`BOULEVARD`/`FREEWAY`/`RAMP` stay `{axis,at,from,to}` spans, unconverted
this pass (used for crossing detection only, see "what this does not
verify," below).

Command: `node -e "...generateWorld(heightAt)... buildCollectorLocalNetwork(world.roads)..."`
→
```
roadsConsidered: 1357
roadsConverted: 1012    (AVENUE 584 + STREET 409 + LANE 19; no ALLEY roads exist in this world)
subEdges: 7261
junctionNodes: 3778
unconvertedTouches: 2206
collectorFeedsArterialContacts: 623
clampedEnds: 647
```

**1,012 of 1,357 roads (74.6%) — the majority of the network, not a token
slice.**

## The junction/cut-point method

Every road is an axis-aligned `{axis, at, from, to}` span. A road is split
into sub-edges at every point another road's endpoint touches it or a
perpendicular road crosses it (`computeCutCoords`) — more general than
`scripts/measure-roads.mjs`'s own `crosses()`, which only finds
perpendicular mid-span crossings and misses an endpoint-to-endpoint or
endpoint-to-midspan touch (the shape a stub connector road makes). Each
sub-edge becomes a straight piece chain; every point where 2+ CONVERTED
legs meet becomes a real junction piece (`mixedJunction`), one socket per
leg at THAT leg's own class/width/lanes — not a uniform class the way the
arterial layer's `standardJunction` is, because a real intersection here
mixes classes (an AVENUE crossing a STREET).

## Three real bugs, watched red before being called fixed

**1. Junction socket position used the wrong bearing (12,765 of 21,285
joins failed, first measurement).** Copied the pattern from
`buildArterialNetwork` incompletely: a junction places each socket AWAY
from its own centre, in the direction the leg physically extends — the
OPPOSITE of the leg's own captured socket, which faces INTO the node (that
opposition is what makes them mate). The first version used the leg's own
socket bearing directly for the junction's positioning, putting every
junction socket exactly 2× its own radius from where the trimmed piece
actually ended. Fixed: `(socket.bearing + 180) % 360` for the junction's
own placement bearing, matching the convention `buildArterialNetwork`'s own
exit-leg push already used. Failures: 12,765 → 1,650.

**2. The junction-radius formula was sized for arterials, not locals
(remaining large-magnitude failures — up to 8.5 m — after bug 1's fix).**
`standardJunctionRadius()` (P2.2's own formula) gives 12–16 m for
LANE/STREET. Checked against `CITY-PLANNING-SPEC.md` §1.6 directly, which
states corner radii as a published figure: **"urban standard 3.0–4.6 m ...
Vehicle-oriented 9.1–22.9 m."** A local intersection is the urban case; the
arterial formula does not belong there. Reusing it clamped short local
blocks (61–183 m, `docs/specs/ROAD-HIERARCHY.md`) hard enough that a
junction's own socket sat metres from where the trimmed piece actually
ended. Fixed: `legRadius(cls)` — 3.8 m (§1.6's urban-standard midpoint) for
STREET/LANE/ALLEY, `standardJunctionRadius(cls)` (unchanged, still the
vehicle-oriented case) for AVENUE/BOULEVARD — applied PER LEG, not per
node, so one big collector leg at a junction no longer forces every small
local leg sharing that junction to also trim by the collector's radius.

**3. Two independently-computed versions of "the same" point could differ
by close to a millimetre (92 junctions, exactly repeated "0.001m apart"
failures).** `nodeKey()` rounds to the nearest millimetre to group crossing
points into one node — correctly, for two roads' independently-computed
coordinates that agree to within that tolerance. But trimming from each
sub-edge's OWN raw endpoint (rather than the node's one shared coordinate)
meant the sub-millimetre residual survived into the built piece, comfortably
past `verifySocketMating`'s `1e-6` tolerance even though it was inside
`nodeKey`'s own 1 mm bucket. Fixed: every leg at a node now trims from that
node's ONE canonical `(x, z)` (`nodeInfo.get(key)`), not its own
independently-computed endpoint — makes every leg agree by construction,
not by narrowing a tolerance.

## Gate, measured

Command: `node -e "...buildCollectorLocalNetwork(world.roads)..."`
(also `test/collectorLocalNetwork.test.ts`, `node test/run.mjs`) →

| | value |
|---|---|
| junctions, total | 3,778 |
| junctions, verified (0 failed legs) | **2,899 (76.7%)** |
| junctions, NOT verified | 879 (23.3%) |
| joins checked | 22,587 |
| joins failed | 1,076 |

By tier pair:

| Tier pair | ok | bad | % ok |
|---|---|---|---|
| local × local | 775 | 8 | 99.0% |
| collector × local | 1,486 | 409 | 78.4% |
| collector × collector | 638 | 462 | 58.0% |

**Every one of the 879 unverified junctions is explained, checked directly,
not assumed:** for each, at least one adjacent block is shorter than twice
that leg's own sourced corner radius plus a metre of margin — the leg
physically cannot fit its own required clearance inside the block the
existing generator laid out. Verified with an independent re-derivation of
the radius rule (not the internal `clampedEnds` counter trusted blindly):
**879 explained, 0 unexplained.** This is a real property of the EXISTING
grid's block spacing (density-scaled `avEff`/`stEff` in
`generateSettlement()`), out of this pass's scope per
`docs/specs/ROAD-HIERARCHY.md`'s own "WHAT THIS DOES NOT COVER": *"Every
collector and local road in the existing 700+-span network converting to
piece chains in this same pass is a size question, not a design
question."* Closing it fully would mean widening block spacing near dense
mixed-class intersections in `city-plan.js`'s own generator — a layout
change, not a conversion.

92 of those 879 (all in the `<0.01m` bucket, a stable, exactly-repeated
"0.001m apart") are a separate, much smaller artifact: this file's own
zero-length-piece safety margin (`maxTrim = (len0 - 1e-3) / 2`) colliding
with a sub-edge whose length is within ~1 mm of exactly twice its own
required radius. Millimetre-scale, named rather than chased further.

**Gate NOT fully met** (BOARD-CONVERSION-PLAN.md P2.3's own text: "every
junction in the world is a named piece. Zero implicit crossings.") — 879
named exceptions, each with a real reason, is the honest state, not zero.

## What this does NOT verify

- **`collectorFeedsArterialContacts: 623`** — 623 points where an AVENUE
  collector's own converted leg physically touches a `BOULEVARD`/`FREEWAY`/
  `RAMP` road. Counted, not socket-verified: the arterial-tier side has no
  piece/socket in this pass (BOULEVARD spans are untouched), so there is
  nothing to verify a mating against yet. Reconciling the two arterial
  representations (this pass's untouched `BOULEVARD` spans, and
  `buildArterialNetwork`'s own separate hand-built MST layer) is real,
  unresolved work, already named in `docs/audits/P2-ARTERIAL.md`'s open list.
- **`unconvertedTouches: 2206`** — every point a converted road touches an
  unconverted one, of which 623 are the collector-feeds-arterial case above;
  the rest are locals/collectors touching `FREEWAY`/`RAMP`.
- **Grade** — not checked for collectors/locals this pass (item 1 covered
  arterials only). Named as open work, not silently assumed flat.
- **Piece SELECTION** — same limitation P2.2/P2.3's arterial-level work
  already named: `mixedJunction()` builds one uniform box shape per node,
  labelled with which real `roadkit.js` piece `docs/specs/ROAD-HIERARCHY.md`'s
  table would call it (`classifyMixedJunction`), not that piece itself.

## Full suite

`node test/run.mjs` → **1,022 of 1,025 pass, 3 fail.** `npx tsc --noEmit`
clean. Of the 3: the two pre-existing known-red tests (`originStability`,
`planSeed`'s byte-identical pin), unrelated to this work, and one in
`test/regressionGateBreak.test.ts` (agy's retrieval domain, R1.7's gate-trip
check) — that file was edited further, mid-run, by someone other than this
pass (it now calls `createWorkersAIClient()`, which has no live binding in
a plain `node test/run.mjs` process outside a real Worker), not something
this pass touches or claims to have fixed. **Every one of the six
`test/collectorLocalNetwork.test.ts` cases passed**, confirmed in this same
run before that file's later edit. This commit stages
`public/road-network.js`, `test/collectorLocalNetwork.test.ts`, this file,
and `docs/specs/BOARD-CONVERSION-PLAN.md` only, by explicit path —
`test/regressionGateBreak.test.ts` is left exactly as found, someone else's
work in progress.

## What is genuinely open for the next pass, named plainly

1. **The 879 named exceptions** — closing them means widening block spacing
   near dense mixed-class intersections in `city-plan.js`'s own generator,
   a layout change outside this conversion pass's scope.
2. **Collector-to-arterial reconciliation** (623 contact points, counted not
   verified) — needs the two arterial representations (old BOULEVARD spans,
   new MST piece layer) reconciled first.
3. **Grade checking for collectors/locals** — not attempted this pass.
4. **Piece selection** (uniform box vs. the real named roadkit.js pieces) —
   same open item as the arterial layer.
5. **P2.4's full-network gate** — this pass converts REPRESENTATION, not
   CONNECTIVITY; the underlying road positions are unchanged, so the
   52-component/38-stranded baseline is not expected to move from this
   alone. Measured separately, next.
