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

---

### 2026-09-05 · A script built to prove "zero spend" honestly ran the thing it was proving safe in the same process as the credential that pays for it

**WHAT WAS MISSED** `scripts/supervised-generate.mjs` (I5) was built with
four documented safety layers, all genuinely about *whether* to call a real
model — API key present, `--confirm`, the printed prompt, a terminal `y/N`.
None of them were about what the model's *own answer* is then allowed to
do. Its `evaluate` ran the response through plain `new Function`, in the
same OS process that had just read `process.env.ANTHROPIC_API_KEY` — while
`public/model-forge.js`'s own docstring, written earlier the same session
and never re-checked against this new caller, states the contract plainly:
"in production this is a Dynamic Worker isolate." The one concrete caller
this session ever built does not use one. The only thing between a real
model's response and the API key was `scanSource`'s `FORBIDDEN_TOKENS`
denylist — and that same file's own comment already says a denylist is not
real protection, in a section of code sitting one screen away from a caller
built as though it were.

**WHY IT GOT THROUGH** Every test written for I5 proved the *authorisation*
chain (money is never spent without an explicit key + flag + typed `y`).
Nothing tested what happens *after* authorisation is granted and a real
response arrives — the exact split `docs/UMAA-CALIPER.md`'s own Failure
Floor draws between item 2 (spend cap) and item 3 (sandbox escape), treated
here as one problem when they are two. The docstring's contract was read as
satisfied because the code *around* it was consistent with it (the module
genuinely never chooses where `evaluate` runs, exactly as documented) — the
gap was one level further out: at the one place that decision actually gets
made, for real.

**Found by a blind audit** (`docs/audits/UMAA-I5-L-J4.md`, Finding 1, HIGH),
which built and ran a standalone proof-of-concept: a "geometry builder"
source string using a standard JS unicode-escaped identifier (`process`,
which V8 resolves to the real `process` global at parse time but which never
contains the literal substring `"process"` for `.includes()` to catch) —
confirmed it passes `scanSource` and genuinely reads
`process.env.ANTHROPIC_API_KEY` once evaluated.

**THE CONTROL** [`test/verifyUntrustedGeometry.test.ts`](../test/verifyUntrustedGeometry.test.ts),
exercising [`scripts/verify-untrusted-geometry-caller.mjs`](../scripts/verify-untrusted-geometry-caller.mjs).
Rather than trying to fix the denylist (an unwinnable arms race the code's
own comment already names — more substrings does not close a unicode-escape
bypass, or `String.fromCharCode`, or any of the others), the fix is
architectural: the model's response now runs in a **separate child
process**, spawned with an **allowlisted** environment
(`PATH`/`SystemRoot`/`windir`/`TEMP`/`TMP` only, never the parent's). The
audit's own exploit still executes against this fix — the denylist is
unchanged and still bypassed, and the test says so plainly rather than
claiming otherwise — but reading `process.env.ANTHROPIC_API_KEY` inside the
child now returns `undefined`, because the child process never had it. The
secret is not hidden from untrusted code; it does not exist where that code
runs. A named mutation
(`verify-untrusted-geometry-child-env-is-allowlisted-not-inherited`,
reverting the child's environment to the parent's full `process.env`)
reintroduces the exact exploit and turns the test red.

**STATUS** **CLOSED.** The audit's exact exploit was reproduced against the
fix (not a paraphrase of it) and confirmed to still execute — `ok: false`
at the `"build"` stage, the payload's own thrown error naming what it
found: the literal string `"undefined"`, not a real key. The named mutation
above was run and confirmed `CAUGHT`, restored byte-identical. This is
explicitly **not** a claim that model-authored code is now safe to execute
in general, or that the denylist has been strengthened — both are false.
It is a narrower, honestly-scoped claim: the one credential this session's
own new code could reach has been moved somewhere that code cannot follow
it to. Before any future caller of `run-generate-request.js`/`model-caller.js`
is built against a real Worker route, the same "does the response run
where the secret lives" question needs to be asked again, from scratch, for
that caller specifically — this fix does not generalise to a different
process architecture.
