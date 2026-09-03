# CALIPER — ASSET LIBRARY LANE, BRIEF 4

Brief 3 landed. The contact sheet is real and it imports both libraries, so the
library finally has a consumer that is not its own self-test. `bridgeSpan`
exists with refusals. The five families are real generators, not renamed single
models. The mutation work went from one control tested twice to six distinct
controls, and the freeway/street discrepancy was chased down and explained
rather than waved away. That is the right direction.

Four things now, in this order.

## 1. LICENCES.md IS A FALSE PROVENANCE STATEMENT. FIX IT FIRST.

`public/vendor/kits/LICENCES.md` now says, of three separate packs:

> **Status on Disk**: Dimensionally transcribed and parameterised in
> `public/props.js` (mailboxes, bins, bollards, signs, bike racks, cafe
> furniture).

and that the geometry is "inspired by and calibrated against the CC0 reference
packs below".

That is not what the code does. `props.js` reads its dimensions from
`public/prop-manifest.js` — your own mutation 6 proves it, by failing with
`footprint width (2.5) must match manifest PROPS.bench.foot.w (1.8)`. The
manifest is the world lane's file. The dimensions were not transcribed from
Kenney, Quaternius or KayKit. Measured: **zero files from any of those three
packs are on disk** — `public/vendor/kits/` contains `LICENCES.md` and nothing
else.

Brief 3 asked you to reconcile this file with disk. It got a longer claim
instead of a smaller one. This repo goes to employers with Mark's name on it,
and a document asserting third-party provenance that did not happen is worse
than the empty file it replaced.

Two acceptable end states. Pick one:

- **(a) State the truth.** No third-party assets are used. All geometry is
  authored in this repo; dimensions come from `prop-manifest.js`. Keep a short
  CC0-only policy for any future import. Delete the three "Reference Pack
  Registry" entries entirely — not reworded, deleted. If you want to record that
  those packs were *looked at* for proportion, say exactly that, in one line,
  with no per-pack "Status on Disk" table.
- **(b) Actually import.** Pull real CC0 assets for the §2 long tail, put them
  under `public/vendor/kits/<pack>/`, and record name, source URL, the licence
  **as stated on that asset's own page**, and date retrieved. Verify the licence
  per asset at download — aggregators mix licences per item. Anything ambiguous:
  skip it and build it.

(a) is fine and is probably the stronger story. What is not fine is the current
text.

## 2. THE LONG TAIL — 29 OF 31 CATEGORIES ARE STILL MISSING

Measured against brief 3 §3. Present: `sign`, and a `quay-wall`. Missing:

    traffic lights          utility cabinets       manhole covers
    signage variants        gratings               market stalls
    playground equipment    fountains              statues
    flagpoles               fences                 gates
    hedges                  garden walls           garden furniture
    awnings                 shopfronts             shutters
    balconies               AC units               roof plant
    chimneys                aerials                satellite dishes
    solar panels

and the **entire airport set**: runway with centreline and threshold markings,
taxiway, apron stand, jet bridge, blast fence, approach lighting. `windsock` is
present; a windsock is not an airport.

Roof clutter — plant, chimneys, aerials, dishes, solar, AC — is the highest
value per unit of work in that list. It is what a city skyline is made of at the
distances this camera actually sits at, and there are 18,758 roofs.

Everything you add goes on the contact sheet with its footprint rectangle, same
as the rest.

## 3. PROVE THE REFUSALS ARE REACHABLE

`bridgeSpan` declares four refusals: span under 8 m, span over 800 m, grade over
8%, abutment on open water. A refusal that no test ever triggers is decoration —
it reads as rigour and defends nothing.

Write a case that reaches **each** of the four and asserts the specific reason
string, and pair each with a case just inside the limit that is accepted. Then
mutate: delete one refusal at a time and confirm the matching test goes red.
Four refusals, four mutations, one at a time.

Do the same for typology selection: a span at 31 m and one at 33 m must come
back beam and arch respectively, or the boundary is untested.

## 4. THE NEXT SIX MUTATIONS

Six distinct controls last time was right. Six more, each verified as landed
before its result is read, each reverted after:

1. **`sweep` vs `footprint`** — make a lamp's `sweep` smaller than its head and
   confirm something notices. If nothing does, `sweep` is a field nobody checks.
2. **`clearance`** — set one to a negative number.
3. **The 8 m module** — make a road piece 7 m long.
4. **Declared LOD triangle counts** — state 60 for a mesh that has 240. If the
   declaration is never compared against the real geometry, the budget in §7 of
   brief 3 is unenforced.
5. **Socket width / lane matching** — mate a 2-lane socket to a 4-lane one.
6. **Family variant coverage** — make `tree("conifer", "ancient")` return the
   sapling. If every variant is not verified distinct, "5 species × 3 ages" is a
   claim about arguments, not about geometry.

Record any that survive. A survivor is the useful result; it names a control
that does not exist yet.

## NOT YOURS, FOR AWARENESS

Nothing in the rendered world imports `props.js` or `roadkit.js` yet — the
contact sheet is the only consumer. That wiring is the world lane's job and it
is coming. You do not need to do anything about it, and you must not edit
`city-render.js` or `world-render-3d.js` to make it happen.

## HOW WORK IS ACCEPTED — unchanged

`npm test` green and `npx tsc --noEmit` clean before every commit. A green suite
is not evidence a control works. Nothing is deleted — move it to
`_TO-DELETE/<reason>/`. Commit to `assets-lane`; never merge to main yourself.

Report what you MEASURED and what you did not get to.
