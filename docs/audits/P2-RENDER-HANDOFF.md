# P2.6 handoff — `city-render.js` drawing roads from the kit

`docs/specs/BOARD-CONVERSION-PLAN.md` P2.6: *"`city-render.js` draws roads
from the kit, not from ribbons."* **Blocked on coordination, not attempted
here.** `public/city-render.js` is `sandbox-spike-agy`'s file — the worktree
split (`../sandbox-spike-agy`, branch `agy-lane`) exists specifically so two
lanes are not editing the same checkout at once
(`docs/BUILD-LOOP.md` STEP 8: *"one agent per checkout... two agents in one
working tree caused overwritten commits and git lock contention"*). This
document is the handoff, not the fix.

## What exists to hand off

Three piece-based road layers, all in `public/road-network.js`, all already
built, tested and committed this pass:

| Layer | Function | Gate | Commit |
|---|---|---|---|
| Arterial | `buildArterialNetwork({heightAt})` | 0/2,294 joins fail, 72/72 junctions ok | `11640b8` |
| Collector/local | `buildCollectorLocalNetwork(roads)` | 2,899/3,778 junctions verified, 879 named exceptions | `47945ac` |
| Connectivity bridges | `buildConnectivityBridges(roads)` | 52→1 components, 38→0 stranded | `e0629df` |

Every piece returned by these follows the shape `roadkit.js`'s own pieces
use: `{id, kind, footprint:{w,d}, height, clearance, origin, sockets[],
lod:[{level, tris, createGeometry(T) => THREE.BufferGeometry}]}`. Each
builder's `edges`/`placements` array carries, per placed piece, `{model, x,
z, rotY}` — everything needed to instantiate and position it.

## What `city-render.js` currently does instead

Roads are NOT drawn from placed pieces today — they are drawn as **ribbons**:
for each span in `world.roads` (`{axis, at, from, to, class}`, from
`city-plan.js`'s `generateRoads()`/`generateSettlement()`/etc, the OLD
representation), a strip of geometry is built by sampling terrain height
along the span's length and extruding a cross-section (carriageway, footway,
lane markings). Confirmed by reading, not assumed: the pattern `r.axis ===
"ew"` recurs at roughly a dozen call sites across the file (road decks,
footway ribbons, lane markings, rail, the surf/shoreline ribbon reusing the
same technique) — this is not one function to swap, it is one TECHNIQUE
used repeatedly for several different road-adjacent features. `wc -l
public/city-render.js` → 4,012 lines; the road/ribbon logic is woven through
`buildWorld()`, not isolated in its own function.

## What "draws roads from the kit" actually requires

1. A new code path that, given one of the three builders' output, walks its
   `edges`/`placements`/`junctions` arrays and instantiates each piece's
   `lod[0].createGeometry(THREE)`, positioned at `(x, z)` and rotated by
   `rotY` — this is straightforward; `roadkit-street-demo.js` (P0's own
   proof) already does exactly this for a 7-piece chain, and could be the
   template.
2. A decision about WHICH layer(s) actually replace the ribbon path.
   Right now the piece layers cover: arterials (real, ~80 edges), collectors/
   locals (real, ~1,012 of 1,357 roads, but 879 of 3,778 junctions are named
   exceptions, not silently smoothed), and pure connectivity bridges
   (geometrically real but not socket-verified against the roads they
   reach). The regional network (`FREEWAY`/`RAMP`/`BOULEVARD` — 345 roads)
   is not converted at all this pass. A real switch means either rendering
   a MIX of piece-based and ribbon-based roads by class (naming exactly
   which classes are which, so nothing is silently downgraded) or
   converting the remaining 345 regional roads first — a further, separate
   scope decision, not made here.
3. This is also P2.5's own scope in miniature: retiring ribbons in favour of
   pieces for the roads that already have a piece representation is
   PART of "retire the span representation," not independent of it — see
   `docs/audits/P2-SPAN-RETIREMENT.md` for the full scope of that gate,
   which found the span shape is load-bearing well beyond rendering (block/
   plot setbacks, bridge approaches, waterway crossings all read
   `world.roads` directly).

## Proposed division of work, not started

- **This lane (`sandbox-spike`/`main`) owns:** the piece data and its own
  verification — already done, three layers, three audits.
- **`sandbox-spike-agy` owns:** the render-path integration in
  `city-render.js` itself — the file, the ribbon technique's dozen call
  sites, and the decision about partial-vs-full replacement, all sit inside
  work already in progress there.
- **Suggested interface, for agy to pull rather than this lane to push:** a
  small, new, ADDITIVE export from `public/road-network.js` —
  `renderPieceLayer(scene, THREE, builderResult)` or similar — that does
  step 1 above (instantiate + position every piece), returning the meshes,
  so `city-render.js` can call it without this lane touching that file at
  all. Not built here, because building it without agreeing the interface
  first risks the same "built and never connected" pattern
  `BOARD-CONVERSION-PLAN.md`'s own opening section names as the standing
  failure this whole plan exists to break.

## Gate status

**P2.6 not met, and not attempted this pass — correctly named as blocked on
coordination, not silently skipped.** The dedicated top-down topology view
(`public/arterial-network-map.html`) remains the only place any of these
three piece layers is actually rendered, unchanged from P2.2.
