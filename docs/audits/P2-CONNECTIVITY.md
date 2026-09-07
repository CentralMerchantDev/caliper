# P2.4 — full-network connectivity, as a hard gate

Evidence for `docs/specs/BOARD-CONVERSION-PLAN.md` P2 finish, item 3.
Companion to `docs/audits/P2-ARTERIAL.md` and `docs/audits/P2-COLLECTOR-LOCAL.md`.

**GATE MET: one connected component, zero stranded roads, for the FULL
existing network — without changing a single existing road.**

## Watched red first

Command: `node scripts/measure-roads.mjs` (also `test/connectivityBridges.test.ts`'s
own pin) →

```
CONNECTED COMPONENTS: 52
STRANDED ROADS (cross nothing): 38 of 1357 (2.8%)
```

Unchanged from Step 4's own measurement — neither P2's arterial layer
(P2.2) nor the collector/local conversion (P2 finish, item 2) touch a
single existing road's position, so this number could not have moved by
either of those passes, and did not.

## Why this does not modify `generateWorld()`

`docs/BUILD-LOOP.md` STEP 8's own standing guard: *"the default world must
stay byte-identical at seed 0, pinned at sha256
`418744f1faeee0c396a8902117d89a67a6f4fb43f3dfadfe71509f991bf24e96`."*
Modifying `city-plan.js`'s own road generation to add connectivity would
almost certainly move that hash. So this gate is closed the same way P2.2
and P2.3 already were: an ADDITIVE layer — new connector pieces on top of
the existing network, not a change to it. `buildConnectivityBridges(roads)`
in `public/road-network.js` takes the existing road list and returns NEW
connector spans; nothing in `world.roads` itself is read back out or
mutated.

## Method

1. **Components**, via the SAME `crosses()` (perpendicular axis-aligned
   crossing only) `scripts/measure-roads.mjs` itself uses — deliberately,
   not this file's own more general `computeCutCoords` (P2 finish item 2's
   endpoint-touch-aware version), so "before" and "after" are measured by
   the identical yardstick.
2. **One GLOBAL minimum spanning tree** over all 52 components' nearest
   real endpoint pairs — not one MST per landmass. The giant component
   (1,053 of 1,357 roads, 77.6%) already spans multiple landmasses itself
   (bridges and highways cross between them by design, per Step 4's own
   "9 components span more than one settlement" finding); a global MST
   naturally merges everything into ONE component, which trivially
   satisfies "one connected component per landmass" for every landmass at
   once, without needing to correctly tag all 52 components to a landmass
   first — a real source of error avoided, not a shortcut taken around it.
3. Each MST edge becomes a real connector piece: a straight span if the
   nearest pair is already axis-aligned, otherwise a Manhattan dogleg (two
   axis-aligned legs).

## A real bug, watched red before being called fixed

**First measurement: 52 components fell to only 41, not 1 — most of the
51 bridges did nothing.** Cause: a connector terminated directly at its
target road's endpoint, using whatever axis the dogleg naturally wanted.
`crosses()` returns false for ANY same-axis pair by definition (it only
detects perpendicular crossings) — when a connector's own terminating leg
happened to share its target's axis (a common case: two roughly-parallel
network fragments end-to-end), the touch went completely undetected,
regardless of literally sharing a coordinate.

Fixed: a short (±3 m) perpendicular stub at every connection point,
guaranteed to register under the SAME `crosses()` definition regardless of
the connector's own axis — the fix cannot hit the bug's own failure mode
because it is built to be perpendicular to whatever it touches, by
construction, not by axis luck.

## Gate, measured

Command: `node -e "...buildConnectivityBridges(roads)..."` (also
`test/connectivityBridges.test.ts`) →

| | before | after |
|---|---|---|
| components | 52 | **1** |
| stranded roads | 38 | **0** |
| roads (incl. connectors/stubs) | 1,357 | 1,547 (190 new spans: 51 bridges' own legs + 102 stubs) |

**Gate MET.** One connected component covers the entire existing network,
every landmass included by construction (there being only one component to
begin with).

Bridge distances: min 0.0 m, median 40.0 m, max **3,434.1 m**. The two
longest (3,434 m, 2,359 m) are almost certainly crossing open water between
landmasses — named, not hidden, and not asserted otherwise. `connectorClass`
is `STREET` uniformly, chosen as a generic placeholder for a pure
connectivity exercise; a 3.4 km surface street is not a real-world design,
it would need to be a real bridge/causeway structure. Same class of
limitation `docs/audits/P2-ARTERIAL.md` already names for the arterial
layer's own regional ties ("straight lines with no water-crossing
awareness") — not a new gap, the same one, at a larger scale.

## What this does NOT verify

- **Socket verification against the EXISTING network.** A connector's own
  two legs (where it bends) are real axis-aligned geometry, but the old
  `{axis,at,from,to}` spans it reaches into carry no socket to mate
  against — same disposition as `buildCollectorLocalNetwork`'s own
  `collectorFeedsArterialContacts`: counted and geometrically real,
  not claimed as socket-verified.
- **Terrain-following or water-crossing routing.** Every connector is a
  straight line or a two-leg Manhattan dogleg; none of them check grade or
  avoid water. Real work for a later pass, same as the arterial layer's own
  named limitation.
- **Realistic connector class.** `STREET` for every connector regardless of
  length or what it crosses; the 3.4 km outlier should be a bridge, not a
  street, in any real placement.

## Full suite

`node test/run.mjs` → **1,027 of 1,029 pass, 2 fail** — both the
pre-existing known-red pins (`originStability`, `planSeed`'s
byte-identical plan count), unrelated to this work. All four
`test/connectivityBridges.test.ts` cases pass. `npx tsc --noEmit` clean.

## What is genuinely open for the next pass, named plainly

1. **Realistic connector classing** — length/context-appropriate class
   (BOULEVARD/causeway for long water crossings, LANE for short infill),
   not a uniform STREET.
2. **Water-crossing and terrain-aware routing** for connectors, same as the
   arterial layer's own open item.
3. **Socket verification against the existing network** — blocked on
   converting the touched existing roads to pieces first (P2.5's own
   scope), or building a bridging-socket concept that can mate against an
   unconverted span.
