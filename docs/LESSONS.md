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

---

### 2026-09-06 · A fix that closed one resource class was written as though it closed all of them

**WHAT WAS MISSED** The entry above closed the exact chain a blind audit
demonstrated: read `ANTHROPIC_API_KEY`, execute the model's response,
exfiltrate it. The fix — an env-scrubbed child process — genuinely closes
that chain. The header comment written for it that same session did not
stop at the claim the fix earns; it said "**a successful sandbox escape in
this process has nothing to steal**." That sentence is not true. `new
Function` gives model-authored code the real Node API surface regardless of
what is or isn't in `process.env` — filesystem read, filesystem write, and
child-process spawning do not consult the environment at all. A blind audit
following K3 built a payload using the SAME unicode-escape technique the
original finding already demonstrated (`scanSource` still cannot catch it,
by the file's own admission it never claimed to), called
`process.getBuiltinModule("fs").readFileSync(...)` on a file outside
`public/`, and returned its contents through the verdict's own reason
string — a live proof-of-concept, not a hypothetical.

**WHY IT GOT THROUGH** The fix and the claim were written in the same pass,
against the one attack the audit that prompted them had actually
demonstrated (key theft). "This closes THAT chain" quietly became "this
process has nothing to steal" — a generalisation from one resource class
(environment variables) to all of them (also filesystem, also
child-process, also, unmitigated either way, network) that nothing checked
before it was published. The env-allowlist work was real and correct; the
sentence describing its blast radius was broader than the work.

**THE CONTROL** [`test/verifyUntrustedGeometry.test.ts`](../test/verifyUntrustedGeometry.test.ts)'s
new case runs the exact obfuscated-fs-read payload the audit built and
asserts it is refused, not merely that scanSource fails to catch it (it
doesn't, on purpose — see the entry above). The real fix is
[`scripts/verify-untrusted-geometry-caller.mjs`](../scripts/verify-untrusted-geometry-caller.mjs):
the child process is launched under Node's `--permission` flag,
`--allow-fs-read` scoped to only the two files it legitimately needs, and no
`--allow-fs-write` / `--allow-child-process` / `--allow-worker` at all — all
three throw unconditionally otherwise. Verified by trying to defeat it, the
same discipline as the finding that started this file: the identical
payload that read `package.json` and leaked it through the verdict's reason
string with no `--permission` flag now throws "Access to this API has been
restricted," while an ordinary builder is unaffected. Mutation
`verify-untrusted-geometry-child-process-is-permission-restricted` (removes
the flag) reintroduces the exact leak and turns the test red.

**WHAT IS STILL NOT COVERED, SAID PLAINLY RATHER THAN LEFT IMPLIED**: this
Node version has no `--allow-net` flag. `--permission` does not gate
`fetch`/`http` at all, so outbound network exfiltration from inside this
child process is not addressed by this fix. The corrected header comment in
`scripts/_verify-untrusted-geometry.mjs` says this explicitly now, rather
than making a scoped claim sound total the way its predecessor did.

**STATUS** **CLOSED** for the filesystem/child-process/worker resource
classes, each independently verified. **OPEN, and named as open, for
network** — no test exists for it because no mitigation exists for it yet;
this is not a gap in test coverage, it is a real, disclosed, unmitigated
path, correctly not claimed to be closed.

---

### 2026-09-06 · A standalone script reimplemented a call already made correctly in eight places, and drifted from all eight

**WHAT WAS MISSED** `src/claude.ts` sets `thinking: { type: "disabled" }`
at every one of its 8 `messages.create` call sites (via
`createWithTruncationGuard`) — a deliberate, correct, consistent setting.
`scripts/supervised-generate.mjs` calls `client.messages.create` directly,
written standalone for the one supervised path that can spend real money,
and never imported the shared wrapper or copied its setting. Nothing
checked that a NEW caller matched the other 8. Mark's real supervised run
found it the expensive way: `max_tokens: 1024`, `output_tokens: 1024`, of
which `thinking_tokens: 1023` — one token of actual content, so the
generated source was empty and `verifyModelSource` correctly refused at
the scan stage before anything unsafe ran. The refusal path worked exactly
as designed. The call that reached it was misconfigured.

**WHY IT GOT THROUGH** Every test written for this script (`test/
supervisedGenerateScript.test.ts`) proves its FOUR safety layers — API key
present, `--confirm` passed, valid args, the transform pre-approved — all
checked before any prompt is even built. Nothing tested the shape of the
CALL ITSELF once those four gates pass, because the four gates were the
part of this project's own discipline (money, consent, scope) that had
already been named explicitly. `thinking` is neither a spend gate nor a
consent gate; it is plumbing that happens to determine whether the money
already approved to spend buys a usable answer or an empty one. A file that
gets rewritten from scratch outside the module holding the pattern will
silently not inherit it, no matter how consistent that module is internally
— consistency inside `src/claude.ts` proved nothing about a caller that
never imports it.

**THE CONTROL** [`test/thinkingDisabledOnEveryCall.test.ts`](../test/thinkingDisabledOnEveryCall.test.ts),
a registry check in the same shape as `test/claimSpansAreChecked.test.ts`
(a different kind of "a new one won't inherit the old ones' discipline"
drift): every `createWithTruncationGuard(...)` call and every direct
`<x>.messages.create(...)` call across `src/` and `scripts/` is found by
scanning the real files, and each must carry an explicit `thinking:`
setting in its own arguments — a call that purely forwards an
already-built params object (`{ ...params, ... }`, the shape
`createWithTruncationGuard`'s own body uses) is exempted, since its caller
is what actually decides and is checked separately. Watched red first: the
setting was removed from one of `src/claude.ts`'s 8 real call sites (not a
synthetic fixture) and the guard test correctly named that exact call site;
restored, green again. Two mutations, `claude-generateFunctionBody-
disables-thinking` and `supervised-generate-disables-thinking`, both
CAUGHT.

**STATUS** **CLOSED.** The registry test was watched red against a real
call site, not only a synthetic one, then restored and reverified green.
`scripts/supervised-generate.mjs` now sets `thinking: { type: "disabled" }`
and prints the model id used (the real run's own transcript never named it,
so its cost could not be priced from the transcript alone — fixed
alongside the setting). The refusal itself is recorded in
`docs/WORLD-BUILD-PLAN.md`'s J2 entry, dated, with the real token counts
and stated plainly as a caller misconfiguration, not a capability finding
— and its measured cost ($0.0105, almost entirely wasted thinking spend)
is explicitly marked non-representative and excluded from K2, which stays
blocked until a real post-fix run is measured.

---

### 2026-09-06 · A prompt described what to build and never said what it could be built WITH

**WHAT WAS MISSED** `buildGeometryPrompt` (`public/generate-request.js`)
told the model everything about the OBJECT to build — footprint, support,
clearance, the visitor's own text — and nothing about the API SURFACE it
had to build it with. The system prompt said only "a THREE.js-like
namespace `T`." The second real supervised run (run 1's thinking-disabled
fix already held: `thinking_tokens: 0`) wrote a competent 3×3 shed and then
called `T.BufferGeometryUtils.mergeGeometries(...)` — a real three.js ADDON
module, not a property of the core namespace, a reasonable guess against a
contract that was never stated. The builder threw; `verifyModelSource`
refused at the "build" stage, after the response had already been evaluated
and run.

**WHY IT GOT THROUGH** Every test for this path proved the pipeline
correctly refuses BAD geometry (wrong footprint, too many triangles, not
deterministic) and correctly accepts GOOD geometry — both measured against
a hand-written fixture the test author already knew would compile. Nothing
tested what happens when a response is well-intentioned and syntactically
reasonable but reaches for something that was never offered, because no
fixture had ever done that — the gap was not in what was checked, it was in
what the model was TOLD, and a prompt that under-specifies its own contract
produces exactly the class of "reasonable but wrong" response that a
denylist of malicious tokens was never built to catch (it isn't malicious;
`BufferGeometryUtils` is a real, common three.js pattern for exactly the
job of merging shapes into one geometry).

**THE CONTROL** [`test/modelForge.test.ts`](../test/modelForge.test.ts)'s
new case runs the exact real payload shape (`T.BufferGeometryUtils.merge
Geometries(...)`, reached by plain property access, no `new` at all) and
asserts it is refused at `scan`, before the builder ever runs — not merely
that it fails eventually. The real fix is
[`public/model-forge.js`](../public/model-forge.js)'s new
`ALLOWED_GEOMETRY_CONSTRUCTORS`, a real, already-proven-safe set (every
name in it is already used in `public/props.js`/`public/buildings.js`), and
`findDisallowedApiSurface`, which reads the injected namespace's own
parameter name off the source (not assumed to be `T`) and flags any member
access outside that list. Crucially, the SAME list is exported into
[`public/generate-request.js`](../public/generate-request.js)'s
`buildGeometryPrompt`, which now tells the model exactly this set in plain
language — one source of truth for what is offered and what is enforced,
not two copies that could drift apart from each other the way the prompt
and the sandbox had drifted from each other here. Watched red first against
the real payload (refused at `build`, reproducing the actual incident, not
a paraphrase of it); green after. Mutation
`model-forge-enforces-allowed-api-surface` CAUGHT.

**STATUS** **CLOSED.** The registry test was watched red against the exact
real payload shape the incident produced, then restored and reverified
green. The fix is explicitly NOT "add BufferGeometryUtils to the sandbox"
— that would have widened exactly the surface K3's audit spent effort
narrowing. It is "say what IS there," which is both the safer fix and the
one that gives the model what it actually needed to succeed the first time.

---

### 2026-09-07 · A test file I wrote called a global that this harness does not provide, and it silently contributed zero tests

**WHAT WAS MISSED** `test/roadkit.test.ts` (written to gate
`BOARD-CONVERSION-PLAN.md` P0.1/P0.2) used bare `test(...)` and
`expect(...)`, Jest/Vitest-style, with no imports. This project's harness
(`test/run.mjs`) has no such globals — every other file in `test/`
explicitly does `import { test } from "node:test"; import assert from
"node:assert/strict"`. I never checked an existing file's *import lines*
before writing mine, only grepped for `test(`/`describe(` bodies, so I
never saw the missing piece. Running the full suite (`node test/run.mjs`)
afterward reported a normal-looking summary — "# test files: 105", a
clean pass/fail count — with my 6 new tests simply absent from it, not
flagged as an error.

**WHY IT GOT THROUGH** I read the first full-suite run's output as "P0.1
verified, gate met" because the overall counts looked sane and the
specific pre-existing failures I expected (seed pins, origin-stability)
were exactly the ones present — I didn't grep for my own test titles to
confirm they'd actually run. They hadn't. `git grep -c "roadkit"` across
the log came back empty. This is the exact shape `CLAUDE.md`'s standard
of proof warns about one level up: *"A green suite is not evidence a
control exists. It is evidence that nothing currently disagrees with
it."* Here nothing disagreed because nothing ran.

**How this was actually caught**: not by audit, by trying to reconcile
"6 new tests added" against a total-test-count delta that didn't add up
(614 → 615, not 614 → 620), then bundling and running the file standalone
(`node --test test/.built/roadkit.test.mjs`), which threw `ReferenceError:
test is not defined` immediately — the file had never registered anything.
Exactly why the *combined*-process run didn't crash outright and instead
produced a clean-looking summary was not fully chased down (a genuine open
question about `test/run.mjs`'s per-file isolation, not resolved here) —
the practical fix took priority once the real cause (missing imports) was
confirmed.

**THE CONTROL** Not yet built. The fix applied was direct — added the
missing imports, rewrote all six cases to `node:assert/strict`, reran
standalone (`node --test`, 6/6 pass) and then through the real harness
(`node test/run.mjs`), confirming all six titles now appear with `✔`. That
proves *this* file, not the general case. A real control would be
`test/run.mjs` itself asserting that every built file's test count
increases by at least 1 (node:test's own per-file summary already reports
this internally) — so a file that builds and imports cleanly but registers
zero tests fails the run loudly instead of vanishing into a normal-looking
total. Not written tonight; scope was the road kit, not the harness.

**STATUS** **OPEN.** The one instance is fixed and reverified (`node
test/run.mjs` → the 6 roadkit cases present and passing, full suite
973/978, the 5 failures all pre-existing and named in
`docs/audits/P0-ROADKIT.md`). The general control — a per-file
zero-tests-registered check in `test/run.mjs` — does not exist yet and
this entry stays open until it does and has been watched red against a
reintroduced case of this same bug.

---

### 2026-09-09 · A mutation test's own regex matched a comment describing the code, not only the code

**WHAT WAS MISSED** `test/navPad.test.ts`'s new assertion for U1's
live-position fix checked `assert.match(html, /trackLiveRect\(navPadEl,/, ...)`
— meant to confirm `index.html`'s bottom module script actually calls the
shared tracker against the pad. The mutation-test proof (rename the call to
`trackLiveRectXXX`) was run to watch it fail before trusting it, following
this project's own standing rule. It did not fail. The regex was still
satisfied — by a comment, six lines above the real call, that described the
mechanism in near-identical call syntax: `"...bottom module script's
trackLiveRect(navPadEl, ...) call overrides both..."`. A test written to
prove a specific line of code exists was, in practice, proving a *sentence
about* that code exists, and the two had silently become different claims
the moment someone (this session, this same lane) wrote a comment that
happened to look like the thing it described.

**WHY IT GOT THROUGH** The mutation-test discipline was followed correctly
— red-first was actually attempted, not skipped — and it still passed
green on the first attempt, because the *assertion itself* could not tell
code from prose about code. This is a sharper case of the exact pattern
this session's own audit work was, at the same time, writing up elsewhere
in this file and in commit messages: a check that reads as proving a
property while actually proving something adjacent and weaker. Committing
runs of red-first discipline correctly is not sufficient if the assertion
underneath it has a blind spot the discipline itself cannot see.

**How this was actually caught**: by the discipline working exactly as
designed — the mutation was applied, the test was run, and it passed when
it should not have. That mismatch was the signal, not a separate
inspection. Read `git grep`-style for every place `trackLiveRect(navPadEl,`
appears in the file and found two: the real call, and the comment.

**THE CONTROL** Reworded the comment to describe the mechanism without
reproducing its call syntax (`"...call into live-position.js's tracker
overrides..."` instead of the literal `trackLiveRect(navPadEl, ...)`
phrase). Re-ran the same mutation: now correctly caught. This fixes the one
instance. **Not yet built**: a general check that a source-matching test's
regex does not ALSO match inside a comment block near the real call — e.g.
stripping `/* ... */` and `//` comment spans from the haystack before
matching, in a shared test helper every string-based `assert.match(html,
...)` check in this suite could use instead of matching raw source. This
project's own tests do this kind of raw-source string matching often
(`navPad.test.ts`, `navWheel.test.ts`, and others) — the same blind spot
plausibly already exists elsewhere, unfound, because it was never looked
for as a category.

**STANDING WARNING, recorded per Mark's instruction because this is now the
fifth time in one week a mutation check has caught a test rather than
code**: A REGEX OVER SOURCE MATCHES YOUR COMMENTS TOO. Any assertion of the
shape `assert.match(sourceText, /literalCodePattern/)` is a claim about the
FILE'S TEXT, not about the CODE — and a comment that describes code well is,
to a regex, indistinguishable from the code it describes. Writing the
comment in different words than the call it documents is not pedantry; it
is the only thing that keeps the assertion honest.

**STATUS** **CLOSED**, 2026-09-09 overnight (`codex-lane`). The general
control is [`test/stripSourceComments.ts`](../test/stripSourceComments.ts):
strips both `//` line comments and `/* */` block comments (the original
instance's bug was a block comment specifically, which is why a `//`-only
helper would not have been enough), blanking rather than deleting so
existing `indexOf()`/`slice()` offsets downstream keep working.

**It was not built from nothing.** While locating every raw-source
`assert.match` check in this suite to sweep, `test/isolate.test.ts` was
found to already carry a local, `//`-only `stripLineComments`, with a
comment on it recording that it was written after this *exact* bug
class defeated an unprotected check there first (a comment-out mutation
of `this._restoreIsolateState();` left the string intact) —
`test/movePiece.test.ts` had a byte-identical copy. Neither was shared,
and neither reached `test/navPad.test.ts`, which is how the same bug was
found a third time, independently, days later. Textbook Failure pattern D:
an enumerated instance fixed twice while a sibling instance — here, the
literal absence of a shared module — went unrecorded. Both duplicates now
import the shared helper instead of defining their own.

**Swept into:** `test/navPad.test.ts`, `test/navWheel.test.ts`,
`test/isolate.test.ts`, `test/movePiece.test.ts`, `test/lookPipeline.test.ts`,
`test/describeRequestUI.test.ts` (this one guards an XSS-relevant property —
`.innerHTML` never receives visitor-typed text — so the same blind spot
here was worth closing in both directions: a comment could have hidden a
real regression, or wrongly failed a correct one), the one HTML-diffing
check in `test/evidence-forwarding.test.ts`, the `test/run.mjs` alias check
in `test/threeIsSingle.test.ts`, and the `mutate.mjs` harness checks in
`test/repoHygiene.test.ts`. **Reviewed and deliberately excluded**, with a
reason each: `test/publicClaims.test.ts` and
`test/generatedClaimsAreCurrent.test.ts` match computed diff messages, not
source-with-comments; `test/duplicateKeys.test.ts` matches an analysis
function's return value, not raw file text; `test/reachability.test.ts`'s
`data-menu="build"` check and `test/threeIsSingle.test.ts`'s import-spec
scan are markup/string scans where a false match would read as an
*extra*, wrongly-loud failure, not a silent wrongly-quiet pass — the
opposite risk direction from what this entry is about; `.gitattributes`
checks in `test/repoHygiene.test.ts` are immune by construction (its `#`
comment syntax can't satisfy their `^\*`-anchored patterns).

**Watched red, for real, in a file other than the one that found it.**
`public/nav-wheel.js`'s real `trackLiveRect(hub, ...)` call (line 91) was
renamed to `trackLiveRectDISABLED` and a comment reproducing the exact
original call syntax was left directly above it — the AUDIT-PROTOCOL
disabling-mutation pattern, applied here on purpose. Against that mutation:
the **protected** `test/navWheel.test.ts` correctly failed —
`AssertionError: the ring does not track the hub's live position via
trackLiveRect`. Reverting the same test's check back to raw, unstripped
`src` (temporarily, to demonstrate the counterfactual) against the
identical mutated file produced 6/6 passing, including that exact test —
proving the old shape of this check would have shipped the regression
silently, in this file, not only in the one that first found the bug.
Both files were then restored and verified byte-identical to their
pre-mutation state (`md5sum`, matched; `git diff` on `public/nav-wheel.js`,
empty). `node test/run.mjs stripSourceComments.test.ts navPad.test.ts
navWheel.test.ts isolate.test.ts movePiece.test.ts lookPipeline.test.ts
describeRequestUI.test.ts evidence-forwarding.test.ts threeIsSingle.test.ts
repoHygiene.test.ts` — 64/64 green on the restored tree. `npx tsc --noEmit`
clean. The full suite was not re-run tonight — host memory sat at 2.47–3.99
GB through this work, this project's own 4 GB floor, so a 1087-test full
run (documented elsewhere as OOM-risking at module scope) was deferred
rather than attempted below the floor; the 64 tests above are every test
in every file this change touched.

---

### 2026-09-09 · A hand-written string hash passed by eye and failed on the exact input shape this codebase actually uses

**WHAT WAS MISSED** `public/facade-textures.js`'s new `pickVariant`
(RUN2 item 1, facade atlas variety) needed a deterministic
`character + variantSeed → [0, N)` selector. The first version was a plain
polynomial accumulator, `h = h*31 + charCode`, `% 100000`. Written, read
back, and it looked fine — a standard textbook string hash. It was not
tested against the actual shape of a real seed until the test that would
prove it worked was written.

**WHY IT GOT THROUGH, then didn't** `test/facadeVariants.test.ts`'s
distribution check (`SAMPLE_SEEDS = "sample-0".."sample-39"`) went red on
its first real run: `postwar: 40 sample seeds only ever reached 1 distinct
variant`. A polynomial hash that only accumulates by `*31 + charCode`
barely changes between strings differing in one trailing digit —
`"postwar|sample-8"` and `"postwar|sample-9"` differ by exactly 1 before
the final `% 100000`, so both land in the same third of `[0,1)` almost
every time. This is not a corner case for this codebase: every `bld*`
function's own default seed is exactly this shape (`"terrace-0"`,
`"terrace-1"`, ...), and `layout.js`'s real per-plot seeds are built the
same sequential way. A hash that looks fine on scattered test strings and
fails specifically on the input pattern the codebase actually produces is
worse than one that fails everywhere — it would have shipped clustering
almost every real building onto variant 0 anyway, silently defeating the
entire feature while `each character has at least 3 variants` and every
other structural test still passed green.

**THE CONTROL** [`test/facadeVariants.test.ts`](../test/facadeVariants.test.ts)'s
`"different variant seeds reach different variants"` test, run against
40 sequentially-suffixed sample seeds per character — not scattered random
strings, the exact repetitive shape real seeds take. `hash01` was replaced
with FNV-1a (`h ^= charCode; h = Math.imul(h, 0x01000193)`), which mixes
every byte through a multiplication rather than only adding it, and the
same test now reaches 2–3 distinct variants per character across the same
40 samples. Watched red first (the polynomial version), fixed, watched
green — not assumed safe from reading the replacement formula's reputation
either.

**STATUS** **CLOSED.** Found by the test on its first real run, not by
audit or by a deliberately-planted mutation — the ordinary case CLAUDE.md's
standard of proof describes ("write the test first... watched failing") is
also the case that already caught this. `git diff` on
`public/facade-textures.js` before committing confirmed only `hash01`'s
body changed, nothing else. **General lesson, stated for the next hash
someone writes by hand in this codebase**: a hash function is not verified
by reading its formula or by trying it on a handful of unrelated strings —
verify it against the actual, often repetitive/sequential shape of the
real inputs it will receive (`"x-0"`, `"x-1"`, ...), because that is
exactly the shape naive accumulator hashes are weakest against, and it is
exactly the shape seeds, ids, and keys take throughout this project.

---

### 2026-09-09 · A helper's own docstring claimed an offset-preservation guarantee that was only ever true for half of what it strips

**WHAT WAS MISSED** `test/stripSourceComments.ts` (closed above, `bac6c1b`)
documents that it "blanks" comments rather than deleting them specifically
"so existing `indexOf()`/`slice()` offsets downstream keep working." That
was true for `/* */` block comments (replaced character-for-character with
spaces) and false for `//` line comments, which the same function
*truncated* (`line.slice(0, i)`) — shortening the line, which shifts every
position after it. Every caller written against this helper so far
(`navPad`, `navWheel`, `isolate`, `movePiece`, `lookPipeline`,
`describeRequestUI`, `evidence-forwarding`, `threeIsSingle`, `repoHygiene`)
only ever computed offsets by searching the *already-stripped* text and
using them within that same string, so the bug had no way to surface.

**WHY IT GOT THROUGH** RUN2 item 4 (finishing the comment-stripping sweep
as a category) added `test/pickSelection.test.ts`, whose existing
`I3 (wiring)` test does something none of the nine prior callers needed:
it finds an anchor position by searching the RAW text for a section-header
*comment* (`"CITY MODE PICKS AGAINST THE SCENE"` — the anchor has to be
a comment, since that is what the real file uses to mark the section), then
slices the *stripped* text at that same offset to check the code beneath
it. This is exactly the offset-correlation the docstring already promised
and nothing had tested. The test failed immediately with "could not find
the city-mode pick handler by its own comment" (because stripping had
blanked the very anchor text being searched for in the raw string — fixed
by searching the raw text on purpose, which is correct) and then, once
that was fixed, failed a second time in a way that pointed straight at the
real bug: the sliced region was empty/misaligned, because a `//` comment
earlier in the 5,000-line file had truncated a line and shifted every
offset downstream of it in the stripped copy relative to the raw one.

**THE CONTROL** `stripSourceComments`'s line-comment branch now pads with
spaces to the original line length instead of truncating
(`line.slice(0, i) + " ".repeat(line.length - i)`), matching the block-
comment branch's already-correct behaviour. A new direct unit test in
`test/stripSourceComments.test.ts` asserts the property by name: stripping
must not change the string's overall length, and a position found in the
raw text must reference the same content in the stripped text. Watched red
first, for real, twice over: the failing padding formula was reverted to
the original truncating one and both the new unit test AND
`test/pickSelection.test.ts`'s real-file test failed together for the
matching reason; restored (`md5sum` matched) and reverified green, along
with the other ten files that already used this helper (78/78 green,
confirming the length-preserving change is not merely locally safe but
does not alter any existing caller's result either).

**STATUS** **CLOSED.** Found by writing a new, legitimate use of an
existing helper, not by an audit — the same shape as the hash entry just
above it: a control's own claim about itself was untested for the one
case that would have exercised it, and the very next real caller did.
**General lesson**: a "should still work the same way" docstring claim
about a shared helper is a hypothesis, not a fact, until a second, different
kind of caller actually exercises the part of the claim the first caller
never needed.
