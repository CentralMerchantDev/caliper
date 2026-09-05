# Build lessons — where the process itself has failed

**Nothing is learned until it is a check.** `docs/AUDIT-PROTOCOL.md` §7 is
where an *audit* records what it missed and why. This is the same idea one
step earlier — a **build** lesson, not an audit finding: a place where the
work itself, not the review of it, let a defect through. A note saying "be
careful of X" is worthless — the next session has no memory of a note. An
entry here stays **OPEN** until it names a real test, and that test has
actually been run and seen **red** at least once. Closing an entry without
that step is the exact failure this file exists to prevent one level up.

Format per entry: what was missed, why it got through, the control that now
prevents it, and its status.

---

### 2026-09-05 · A performance fix silently relaxed a safety property a correctness fix had established three commits earlier

**WHAT WAS MISSED** `public/world.js`'s Finding 5 fix (memoizing
`LandField`/`heightAt` per seed, so a repeat `createWorld()` call for the
same seed is ~50% cheaper) made two same-seed world instances share the
identical `land` object. `A3`, three commits earlier in the same session,
had established the opposite-sounding but related rule — "one world's state
must not alias another's" — for `DISTRICTS`' `bounds` field specifically,
and fixed it with a deep copy. Finding 5 shared a *different* object for a
*good* reason (land is derived, read-only, and safe to share once frozen),
but nothing forced that decision to be checked against the general property
A3 had already established. It landed, and `test/worldSpec.test.ts` — the
test that caught A3's own bug — stayed green, because it was never asked
about `LandField`.

**WHY IT GOT THROUGH** The property was tested specifically (district
bounds, one named field) rather than generally (any two worlds sharing any
mutable object by reference). A different object slipped straight past a
test that only ever looked at the one it was written for. This is the same
shape of gap `AUDIT-PROTOCOL.md` names in general ("a test that reimplements
the logic it is checking", "asserted a value was recorded, never checked")
— here it is "asserted one field is not shared, never asked about the
others."

**Found while building the control below** (not by audit, by writing the
general check and running it against the real code) — the general test
surfaced two more instances of the identical gap, neither previously known:

- `public/city-plan.js`'s `WORLD` constant is embedded by reference in every
  `plan.world`, for every seed, and had never been frozen (unlike
  `DISTRICTS`/`SETTLEMENTS`/`BRIDGES`/`GRID`, which were).
- `LANDMASSES`' raw `.points` outlines and `HIGHWAYS`' route entries are
  *also* shared by reference into every plan (`landmassPolygonsDesign`'s
  `{ ...lm, polygon }` and `roads`' `...HIGHWAYS` spread both leak a nested
  field or an un-copied element the same way `DISTRICTS`' original bug did),
  and neither table had been frozen either.
- `DISTRICTS`' own per-world copy was itself still incomplete: A3's fix
  cloned `bounds` but not the `f` and `allow` fields sitting right next to
  it on the same object — the exact same bug, unfixed in two fields A3
  never named.
- `generateCityPlan`'s own seed-keyed cache (from A2b, predating both A3 and
  Finding 5) meant two same-seed `generateWorld()` calls already shared
  `city.plots`, and `generateWorld`'s shallow `{ ...p, settlement:
  "downtown" }` copy left each plot's nested `.buildable` rectangle aliased
  across both — live since A2b, never exercised until this test ran.

Every one of these was fixed the same session this file was created,
following the same choice A3 first made explicit: freeze the object and
share it deliberately (`WORLD`, `LANDMASSES`, `HIGHWAYS`, `LandField` — all
static or memoized read-only data, nothing writes to any of them, verified
directly, not assumed), or deep-copy it so each world's instance is
genuinely independent (`DISTRICTS.f`/`.allow`, `plot.buildable` — data a
per-world copy is expected to be freely, silently mutable, matching what its
own neighbouring field already did).

**THE CONTROL** [`test/worldAliasing.test.ts`](../test/worldAliasing.test.ts).
Builds two worlds with the same seed and two with different seeds, walks
every object reachable from `plan`/`land`/`layers`/`grid` by reference
(depth-capped, visited-set-bounded, primitives and TypedArray contents
skipped since only objects can alias), and asserts that everything reachable
from *both* worlds is on a declared, reasoned allow-list. Anything else
shared by reference between two worlds is an assertion failure naming the
object's shape and path, not a silent pass. A named mutation
(`world-aliasing-districts-f-and-allow-stay-independent`, reintroducing a
narrower version of A3's own shallow-copy bug) turns this test red — proving
it subsumes the original, specific `test/worldSpec.test.ts` check rather
than merely duplicating it in different words.

**STATUS** **CLOSED.** The control exists, and has been seen red: it failed
three times in sequence while it was being written — first on `WORLD` +
`LANDMASSES` + `HIGHWAYS` (before those tables were frozen), then again on
`DISTRICTS.f`/`.allow` and `plot.buildable` (before those copies were
completed) — each failure read, diagnosed against a real, isolated
reproduction (not guessed at), and fixed before the test was allowed to pass.
The named mutation above was then run and confirmed `CAUGHT`, and the walk's
own cost was measured in isolation (64 ms for one world's full graph,
~75,000 objects) to confirm the slow part of this test is `createWorld()`'s
own already-documented generation cost, not the check itself.
