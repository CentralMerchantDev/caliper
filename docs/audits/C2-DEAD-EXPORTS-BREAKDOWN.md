# C2 — the dead-exports allowlist, broken down by real mechanism

`docs/briefs/RUN3-CLI-2026-09-09.md` item 6, `docs/specs/COMPLETION-PLAN.md`
C2: **"No number from this may be published anywhere until it is split by
real mechanism: product, demo-only, test-only, unreachable, and the fifth
class — data-reachable, where a string key selects from a registry and the
import graph cannot see it. UMAA trigger 2."**

No raw count from `test/deadExports.allowlist.json` has been published on
any public-facing surface (README, the live page, a résumé) — checked
directly before writing this, `grep -rn "2,76\|2761\|2762"` across
`README.md`/`public/index.html` returns nothing. This document is the
split itself, done mechanically first, honestly bounded where the
mechanical pass cannot finish the job tonight.

## The tool

`scripts/analyze-dead-exports-breakdown.mjs` — reads the real allowlist,
and for every entry already marked `unreachable` by
`scripts/lib/module-graph.mjs`'s own import-graph walk, checks whether the
export's bare identifier appears anywhere ELSE in its own file beyond its
declaration line.

**Why this can find a real class the import-graph walker cannot see, and
why it cannot fully confirm it alone.** `classifyRepoReachability` walks
`import`/`export` edges between files. It has no visibility into a plain
JS object literal inside one file that holds a LOCAL reference to a
function or constant declared in the SAME file — `public/buildings.js`'s
own `building(typology, seed, options)` dispatcher is the clearest real
example:

```js
const map = {
  "bld-villa": bldVilla, "bld-terrace": bldTerrace, /* ...12 entries */
  "bld-highstreet-terrace": bldHighStreetTerrace,
  "bld-business-park": bldBusinessParkBlock,
};
```

`building` itself is confirmed product-reachable — `docs/MODULE-MAP.md`:
`` `building` -- called from `public/city-render.js` ``, and
`city-render.js` is imported by both `public/index.html` and
`public/city.html`. So every one of those twelve `bldX` functions is
reached, by a visitor's own real browser, every time `building()` runs
with the matching typology string — a real, live, "data-reachable" path
the import graph has no edge for. `bldHighStreetTerrace` and
`bldBusinessParkBlock` were sitting in the seeded allowlist as
`unreachable` before this check, exactly as wrong as that sounds.

**What the tool cannot do alone: distinguish this from dead code calling
other dead code.** "This identifier is referenced a second time in its
own file" is necessary but not sufficient — a private helper called only
by another function that is ITSELF unreachable from anywhere real is
still genuinely dead, and would trip the same heuristic. Confirming the
class requires walking one level further: is the CONTAINING reference
(the dispatch table, the calling function) itself reachable from a real
entry point? That is a real, second pass this tool does not yet make —
named here as the honest limit, not silently assumed away.

## Measured result, mechanical pass only

```
node scripts/analyze-dead-exports-breakdown.mjs
```

| Class | Count | How it was determined |
|---|---|---|
| product | 0 | (the allowlist only ever holds non-product entries by construction — a product-reachable export is never allowlisted at all) |
| demo-only | 37 | already correctly classified by the import-graph walk |
| test-only | 210 | already correctly classified by the import-graph walk |
| **data-reachable CANDIDATE** | **1,779** | the export's bare name appears at least once more in its own file, beyond its declaration — **an upper bound, not a confirmed count** (see limitation above) |
| unreachable (no second reference at all) | 735 | no occurrence anywhere in its own file beyond the declaration itself — the strongest evidence of genuine dead code this pass can produce |

**One entry verified individually, all the way through, as the proof the
class is real and not a tooling artefact:** `public/buildings.js:
bldHighStreetTerrace` and `public/buildings.js:bldBusinessParkBlock`,
above. Confirmed: (1) the bare identifier appears in `building()`'s own
dispatch object; (2) `building()` is itself product-reachable per
`docs/MODULE-MAP.md`; (3) the dispatch key (`"bld-highstreet-terrace"`)
is a real, reachable typology string (`public/layout.js`'s own
`PLOT_CLASSES`/typology tables would need to be checked to confirm a real
plot class routes to it in practice, which this pass did not do — named
as the next link in the chain, not claimed proven).

## What is honestly still open

- **1,779 is a ceiling, not a headline.** The real data-reachable count
  is somewhere between the 101 originally found by a stricter (and
  buggy — see below) version of this same check and 1,779. Neither
  number should be published; this document exists so neither is
  mistaken for the other, and so nobody downstream quotes 2,762 as if
  it meant "2,762 dead things."
- **A real bug in this analysis, found and fixed while writing it,
  worth naming for the same reason this project names every other one:**
  the first version of this script required TWO occurrences beyond the
  declaration (`allOccurrences - declCount > 1`), which incorrectly
  excluded the very `bldHighStreetTerrace` example that motivated writing
  it — a single dispatch-table reference is exactly one additional
  occurrence, not two. Caught by testing the tool against the one case
  already known to be real, not by code review. Fixed to `> 0`.
- **A proper second pass** (does the CONTAINING reference reach a
  product entry point, not just "is there a second occurrence") is real,
  scoped future work, not done tonight.
- **The allowlist's own per-entry `reason` strings were not individually
  rewritten** to reflect this finding — they still say `unreachable` for
  every one of the 1,779 candidates, which is misleading if anyone reads
  a single entry in isolation. Left as-is rather than mass-edited under
  time pressure with an unconfirmed classification; a future pass should
  either confirm each one and rewrite its reason, or mark the whole class
  provisionally with a note pointing at this document.
