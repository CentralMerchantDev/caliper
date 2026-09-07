# P3.3 — bridges as piece chains

Evidence for `docs/specs/BOARD-CONVERSION-PLAN.md` P3.3.

**Gate: "every bridge end lands on a road piece, socket-verified."
PARTIAL — the piece half is real and gated; the "lands on a road piece"
half is measured and found NOT met with the road-piece layers this project
has built so far.**

## P3-exit blind audit — two real findings, both fixed

Run per `docs/AUDIT-PROTOCOL.md`, UMAA trigger 3 ("the no-floating-edge
assertion... covering the whole world").

**CRITICAL, fixed:** `test/bridgePieces.test.ts`'s own bearing-opposition
check was inverted — it hand-rolled a formula that compared the raw
bearing DIFFERENCE against 180 directly (`diff = |((b0-b1+540)%360)-180|`,
asserted `< 1e-6`), where a genuinely correctly-opposed pair produces that
difference AT 180, not near 0. The test was red on every real, correct
bridge, and — the more serious half — was structurally incapable of
catching the actual defect: two sockets facing the SAME direction (the
literal floating edge this test exists to catch) would have produced
`diff ≈ 0` and PASSED. Fixed by extracting `verifySocketMating`'s own
canonical bearing-opposition formula (`target = sockA.bearing + 180`,
compare `sockB.bearing` against it) rather than re-deriving one
independently. `verifySocketMating` itself is not called directly, because
it also requires position coincidence — correct for two ADJACENT pieces'
touching sockets, wrong for one bridge's own two ends, hundreds of metres
apart.

**MEDIUM, fixed:** `verifyBridgeEnds` picked only the single nearest
candidate node by raw XZ distance and tried just that one. A closer
candidate whose own socket does not actually mate (wrong bearing) would
report "no match," hiding a real, slightly-farther candidate that DOES
mate. Currently latent (today's real distances are hundreds to thousands
of metres regardless, so no existing measurement changes), but a real
logic gap for whenever two piece-network nodes both land near one bridge
end. Fixed: every candidate within tolerance is tried, closest first, and
the first that actually mates wins. `test/bridgePieces.test.ts`'s new case
constructs exactly this scenario and confirms the fix finds the correct,
farther-ranked match.

## What was built

`public/road-network.js`'s `buildBridgePieces(BRIDGES, {heightAt})` calls
`roadkit.js`'s existing `bridgeSpan(a, b, options)` once per real `BRIDGES`
entry (`public/city-plan.js`) — not a reimplementation; `bridgeSpan` already
produces a real piece with two sockets in WORLD space directly (a bridge
spans between two fixed points; there is no generic local copy of one to
place, unlike every other piece this project builds). `verifyBridgeEnds`
checks a built bridge's own two end sockets against the nearest node of any
piece-network the caller supplies, within a tolerance, via the SAME shared
`verifySocketMating` every other layer this pass built already uses.

## Gate, measured

Command: `node -e "...buildBridgePieces(BRIDGES, {heightAt})..."` (also
`test/bridgePieces.test.ts`) →

| | value |
|---|---|
| real `BRIDGES` entries | 19 |
| built as a real piece | **8** |
| refused | **11** |

**Every refusal is `roadkit.js`'s own real engineering ceiling, not a
defect in this pass:** `bridgeSpan`'s own refusal text, "Span distance
exceeds maximum engineering limit (800m)" — the world's two harbour
crossings and several inter-island causeways genuinely run 852–1,924 m.
`bridgeChain` (the multi-span plan `bridgeSpan` itself is preferred over —
see below) is documented to refuse at the identical 800 m *total*, so
switching to it would not close this gap either. Measured, not assumed:
worst case is `east-inlet` at 1,924 m, 2.4× the ceiling.

**Every built piece carries two real, mateable sockets:** world position,
finite bearing, real width/lanes, and the two ends are bearing-opposed to
within 1e-6° — checked directly against the piece's own geometry, not
assumed from `bridgeSpan`'s own doc comment.

**"Lands on a road piece" — checked against the arterial layer, found NOT
met.** Arterial-network nodes (`buildArterialNetwork`) are settlement/
landmass CENTRES, spaced roughly 1.6 km apart by design — there is no
reason to expect them to coincide with a bridge's own landing point, and
measuring confirms they do not: every one of the 8 built bridges' 16 ends
is hundreds to thousands of metres from the nearest arterial node. This is
not a bug in `verifyBridgeEnds` (exercised directly in
`test/bridgePieces.test.ts` against a planted matching node, which it
correctly finds and verifies) — it is a real gap between what this pass's
piece layers cover and where bridges actually land.

## Why `bridgeSpan` was used directly, not `bridgeChain`

`roadkit.js` has two bridge builders. `bridgeChain(spanTotalM, ...)` returns
an ABSTRACT plan (`{type: "abutment"|"pier"|"span", at/from/to, ...}`,
relative positions only, no world coordinates, no sockets) — it would need
a second layer of code to place each piece in the world and verify the
internal joins, none of which exists yet. `bridgeSpan(a, b, options)` takes
real world points directly and returns ONE complete, positioned,
socket-carrying piece per call — the simpler, already-adequate tool for
"does every bridge exist as a real piece," which is what this gate asks.
`bridgeChain`'s own multi-span decomposition would matter for a LATER pass
building the actual deck/pier/abutment geometry in segments; not needed to
answer this gate.

## What is genuinely open for the next pass, named plainly

1. **The 11 over-ceiling bridges** — `roadkit.js`'s own 800 m limit (both
   `bridgeSpan` and `bridgeChain`) does not cover them. Closing this means
   either raising that ceiling (an engineering decision, not this pass's to
   make unilaterally) or composing multiple 800 m segments end to end with
   a real intermediate pier/island anchor, unattempted here.
2. **"Lands on a road piece," for real.** None of this project's three
   piece-network layers (arterial, collector/local, connectivity bridges)
   currently reaches a real bridge's actual landing coordinate. Closing
   this needs either: connecting each bridge end to its nearest piece-
   network node the same way `buildConnectivityBridges` already connects
   disconnected road components (a real, buildable next step, same
   technique already proven this pass), or reconciling with
   `generateBridgeApproaches()`'s own existing road-approach spans (which
   DO land at the bridge's real coordinate, by construction, but are still
   the old `{axis,at,from,to}` shape — `docs/audits/P2-SPAN-RETIREMENT.md`'s
   own scope).
3. **Pier/abutment sub-geometry** — `bridgeSpan`'s own `piers` array (real
   intermediate pier positions) is computed but not turned into its own
   verified sub-pieces here; the bridge is adopted as one piece, not a
   chain of its own components, despite the phase's own name.
