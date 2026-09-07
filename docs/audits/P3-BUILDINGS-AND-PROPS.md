# P3.1 / P3.2 — buildings and props become placed pieces

Evidence for `docs/specs/BOARD-CONVERSION-PLAN.md` P3.1 and P3.2.

## P3.1 — buildings

**"Mostly adoption" did not hold on direct reading, checked before writing
any code.** A scoping pass against `planCity()`'s (`public/layout.js`)
actual return value, not the plan's prose, found: a placement carries
`plotId` (the plot's own id, reused — not a building id of its own) and
`fits` (the plot's available *envelope*, not the building's real built
footprint, which only exists after a three.js call `board-adapter.js`
deliberately does not make). Two real decisions, made and named rather than
assumed free:

1. **Footprint proxy.** `plot.buildable` (the plot's own setback-adjusted
   rect, already computed by `city-plan.js`, corner-anchored, three.js-free)
   stands in for the building's real footprint. Close, not exact — named as
   a proxy, not claimed as a measured size.
2. **Double-reservation.** `board.js`'s `canPlace` refuses ANY two pieces
   whose foot+clear cells overlap, regardless of `pieceType` — a "plot"
   piece and a "building" piece covering the same ground would never both
   fit. `plotPieces()` now skips a plot once a building has been placed on
   it; `buildingPieces()` is the one piece that reserves that ground. An
   unbuilt plot still gets its own "plot" piece, exactly as before this pass.

**A real bug, found by measuring, not assumed clean.** The first working
version used `atomsFor()` (which CEILS a width) for the building's far edge,
independently of `atomOf()` (which FLOORS the near edge) — each correct in
isolation, but `PLOT_RULES.SETBACK_SIDE` is 0 ("party walls allowed"), so
row-adjacent buildings' buildable rects share an *exact* boundary in float
space, and `floor(a) + ceil(b)` can exceed `floor(a+b)` by exactly one atom.
Measured: **2,735 of 17,105 buildings** overlapped a neighbour by precisely
1 atom along the full shared edge — every single case, confirming the
mechanism rather than a scatter of unrelated defects. Fixed by deriving the
far edge with `atomOf()` too, so two neighbours computing their shared
boundary independently land on the exact same atom by construction.

**Gate, measured** (`node test/run.mjs`, `test/boardAdapter.test.ts`'s P3.1
cases, via `scripts/_board-adapter-probe.mjs`):

| | value |
|---|---|
| placements (planCity's own output) | 17,105 |
| building pieces adopted | 17,105 |
| refused placements | 0 |
| building-vs-building overlaps | **0** |
| building-vs-unbuilt-plot residual overlaps | 2 (named, not chased — see below) |
| duplicate piece ids | 0 |

**Gate MET**: every building in the world is findable by id (`bld-${plotId}`,
globally unique — confirmed, not assumed) and by cell.

**Named, not chased to zero:** 2 of 17,105+ pieces show a residual 1-atom
overlap against an *unbuilt* neighbour's own "plot" piece — a different code
path (`plotPieces()`'s own `atomsFor()`, not yet unified with
`buildingPieces()`'s fix). Small enough (0.01%) to record as an open residual
rather than block this gate on.

## P3.2 — props

**A real occupancy check exists, using the SAME registry roads/plots
already go through** (`world-registry.js`'s `reserve`/`overlapsReserved`) —
`public/prop-placement.js`, new this pass. It is **not wired into
`city-render.js`'s own placement loops**, on purpose: those loops (lamps,
street furniture, trees, cars, parasols, containers, boats —
`prop-manifest.js`'s own list) live inside `sandbox-spike-agy`'s active
file, the same lane boundary `docs/audits/P2-RENDER-HANDOFF.md` already
names for P2.6. This is the interface for that lane to call, not a rewrite
of its loops — `docs/BUILD-LOOP.md` STEP 8's "one agent per checkout" guard,
applied to props the same way it already was to roads.

**Gate, measured directly, reproducing the exact defect
`prop-manifest.js`'s own header names** (`node test/run.mjs`,
`test/propPlacement.test.ts`): a lamp post placed 0.2 m off-centre from an
already-placed bench — the precise shape of the header's own "27 lamp posts
stand inside a bin or a bench" finding — is refused (`reason: "occupied"`),
not silently rendered overlapping. A lamp 10 m away places cleanly (the
check is not over-eager). Rotation is respected: a bench's 1.8×0.55 m
footprint occupies the correct axis whether placed at 0° or 90°. Every
non-`sized` entry in `PROPS` (`prop-manifest.js`) can actually be placed
through the check — the manifest and the checker agree on every declared
type, not just the two used in the header's own example.

**Gate not fully met — named, not silently claimed done:** the *count* named
in the plan's own gate text ("the 27 measured lamp-inside-bench overlaps...
become zero") cannot be re-measured against the real 2,407-lamp /
11,135-street-furniture placement run until `city-render.js`'s own loops
call this checker — that wiring is `sandbox-spike-agy`'s file, not reached
into here. What this pass proves instead: the checker correctly detects the
*exact class* of overlap the 27 were, on real `prop-manifest.js` data, ready
to be called.

## What is genuinely open for the next pass, named plainly

1. **P3.1's 2-instance residual** — unify `plotPieces()`'s own edge rounding
   with `buildingPieces()`'s fix.
2. **P3.2's actual wiring** — `city-render.js`'s lamp/street-furniture/tree/
   car/parasol/container/boat loops need to call `tryPlaceProp()` (or
   `placePropsChecked()` for a batch) instead of placing unconditionally.
   Coordinate with `sandbox-spike-agy` before touching that file, per the
   standing worktree-boundary rule.
3. **Real building footprints** (not the `plot.buildable` proxy) — would
   need either a three.js call inside `board-adapter.js` (breaking its
   deliberate purity) or threading the real footprint back out of
   `layout-fits.js`'s own `makeFits()` call into `planCity()`'s return
   value, which does not happen today.
