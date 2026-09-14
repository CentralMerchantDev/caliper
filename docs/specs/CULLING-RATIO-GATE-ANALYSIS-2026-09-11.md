# What does `street.triangles / skyline.triangles < 0.40` actually measure now?

Item 1 of `docs/briefs/CLI-2026-09-11-autonomous-3.md`. Written before any
fix, per that item's own gate: "a written answer with the property named,
not a number changed."

## The property, named

Read `test/regressionGate.test.ts:96-108` directly. The check compares two
of the project's own fixed real-world camera framings — "Street level" (a
narrow, close, ground-level view) against "Downtown skyline" (a wide,
elevated establishing shot) — and asserts the narrow one submits under 40%
of the wide one's triangle count.

The property this protects: **a narrow-view camera must not make the GPU
do the same amount of work as a wide establishing shot.** In practice
that's a proxy for "is frustum/distance culling actually discarding
geometry the camera cannot see" — using two very different real framings
as a natural experiment rather than asserting culling worked directly.
This matters most on the device nobody has tested yet (a phone), where a
player is far more likely to be looking at a narrow street-level view than
a wide skyline shot, and GPU/vertex-shader budget is smallest.

The specific `< 0.40` cutoff is, like the retired 4 GB memory floor and
the "Hard assertion budgets" comment forty lines above it in the same
file, **unsourced** — nothing in the repo cites where 40% came from. That
does not make the SHAPE of the check meaningless (a narrow view legitimately
submitting close to what a wide view submits IS a real signal something
isn't culling), only the specific number arguable.

## A correction to the brief's own premise, checked directly

The brief says this ratio "was written for a world of per-piece meshes."
Checked against git history, not assumed: `test/regressionGate.test.ts`
was introduced in commit `d48455b` (2026-09-07). At that commit,
`public/city-render.js` already had **35 `InstancedMesh` call sites** of
its own, with its own documented spatial chunking ("1.6 km spatial chunks
with tight bounding spheres so Three.js frustum culling culls off-screen
regions" — that file's own Phase V7 comment). `public/board.js` and
`public/board-render.js` did not exist yet; B2/B3 (the board's own first
work) landed around 2026-09-08/09, over a day later.

So the gate was written against a world that was **already well-instanced
with proper spatial chunking** — not a "per-piece mesh" world. The board,
added afterward, was the FIRST per-piece-mesh addition to this scene (B3's
own `board-render.js`, one `Mesh` per piece), and it is specifically the
board's own rendering — first un-instanced (B3), then instanced without
spatial chunking (this lane's prior run, 2a/b/c) — that has moved this
metric, not a shift away from some earlier per-piece baseline the whole
scene once had. This is not load-bearing against item 2 (spatial chunking
is the right fix either way) — if anything it strengthens the case:
**spatial chunking is not a new technique being proposed here, it is the
same pattern `city-render.js` already uses successfully elsewhere in this
exact codebase**, being brought to the one part of the renderer (the
board) that never had it.

## Does the ratio still detect the property? Measured, not just reasoned

Three points of data, all from this lane's own prior run tonight,
`docs/specs/COMPLETION-PLAN.md`'s own R3.5 section:

| | Street level | Downtown skyline | ratio |
|---|---|---|---|
| Before board (implied by B3's own un-instanced measurement) | 141,764 tri | 276,635 tri | 51.25% |
| After 2a+2b+2c (whole-board InstancedMesh, no spatial chunking) | 377,088 tri | 478,299 tri | 78.84% |

The narrow view's own triangle count grew by **+235,324** (141,764 →
377,088); the wide view's grew by **+201,664** (276,635 → 478,299). The
narrow view gained MORE in absolute terms than the wide one did, even
though the wide view already legitimately saw more of the board before
this change. That is exactly the signature a whole-board, un-chunked
`InstancedMesh` group would produce: its own bounding volume spans the
entire archipelago, so it is essentially always in-frustum regardless of
camera framing, and it now contributes close to the SAME triangle load to
both the numerator and the denominator — a roughly camera-independent
floor added to both sides of a ratio that was designed to measure a
camera-DEPENDENT difference.

**So: the ratio is currently detecting a mix of both, not one cleanly.**
- **The underlying property IS genuinely violated right now** — street
  level really is being asked to submit ~235k triangles of board content
  it does not need for a ground-level shot, which is real, wasted GPU work
  regardless of what any threshold says. This is not a measurement
  artefact; it is the exact defect this lane's own last-run hypothesis
  named (an `InstancedMesh` frustum-culls as one object against its own
  whole bounding volume).
- **The specific NUMBER (78.84%, or the gap from 51.25%) should not be
  read as "twice as much genuine over-draw as before."** Once a large,
  roughly camera-independent term is added to both sides of a ratio, the
  ratio moves toward 1 (worse) even for a FIXED amount of real over-draw,
  purely as an arithmetic consequence — and once the board's own
  contribution is large enough, the ratio would eventually saturate near 1
  and STOP discriminating between "this got worse" and "the board's own
  floor is just big," even if every other part of the scene culls
  perfectly. It has not reached that saturation point yet (the measured
  change is real and directionally correct for the real defect), but the
  MECHANISM is now partly artefactual, which matters for whether this
  ratio remains a trustworthy regression detector once today's specific
  defect is fixed.
- It is **not** detecting nothing — a ratio near 1 (or one that had gone
  DOWN instead of up) would have been a real, false "all clear" reading
  had the board's own defect somehow happened to leave the ratio
  unchanged. That did not happen here; the direction of the measured
  change is consistent with the real problem, which is itself informative
  (a metric that moved in the RIGHT direction for the right reason, even
  if not by a cleanly interpretable amount, is still doing useful work).

**One deliberately separate note, not conflated with the above:** an
already-open, unrelated defect (`docs/DECISIONS-FOR-MARK.md` #4) has this
same test pair reading the skyline view as "12 triangles / 100% culling"
under measurement contention on a busy box, root-cause not fully traced.
This run's own measurements were taken on a box confirmed quiet (16% CPU
load, zero render/test/mutation contention) and showed zero spread across
three runs, so they are not exhibiting that particular pathology — but the
existence of a second, independent way this exact metric can mislead is
worth naming rather than treating this analysis as the only source of
doubt about it.

## What I think, per the brief's own invitation to say so

**Fix the real problem now; do not invent a replacement number now.**

The property this gate protects ("a narrow view must not redraw the whole
world") is real, matters most on the untested device, and is currently
genuinely violated by the board's own un-chunked instancing — spatial
chunking (item 2) fixes the actual cause, independent of what any
threshold says, and should proceed.

**Do not invent a new numeric threshold to replace `< 0.40` right now.**
If a new metric is warranted once chunking lands — an absolute
triangle-or-draw-call ceiling at street level specifically, rather than a
ratio against a different camera that a shared bounding-volume floor can
distort — the METRIC can be proposed (both triangles-at-street-level and
draw-calls-at-street-level are already being measured by this same test),
but any NUMBER attached to it right now would be exactly the kind of
unsourced figure Rule Zero and the retired 4 GB floor already named as a
defect pattern in this repo. Leave the number open, or label it explicitly
unsourced if one must be stated for a gate to exist at all.

**On waiting for the BLD lane's off-loopback dev server before sourcing a
number: worth waiting for the NUMBER, not worth waiting to do the FIX.**
Spatial chunking is correct engineering regardless of what threshold ends
up attached to it — delaying the structural fix until a phone measurement
exists would leave a known, real defect (genuine wasted GPU work on the
one framing that matters most) sitting unaddressed for no benefit tied to
the measurement itself. Once real device data exists, it should be used to
source (or replace) the ratio's own `< 0.40` and the draw-call ceiling's
own `<= 900` — both currently unsourced — but that is a separate, later
step this run does not attempt.

## Conclusion, matching item 1's own gate

The property is named above. The ratio currently detects a real,
directionally-correct signal of genuine wasted GPU work, delivered through
a partly artefactual mechanism (a shared, camera-independent floor now
sitting under both sides of the ratio) that would make it a weaker
regression detector once today's specific defect is fixed. This is not "a
number changed" — it is a case for proceeding to item 2 (spatial chunking)
on the real property, reporting three real numbers afterward (draw calls,
the ratio, and triangles per camera if obtainable) without tuning to or
inventing any threshold.
