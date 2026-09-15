# The look-proof verdict — does the scene still read as a blockout?

Written 2026-09-14, closing `docs/briefs/BLD-2026-09-14-look-proof.md`'s
checklist item 4.4. The evidence is the seven images in
`docs/look-proof-shots/`, committed one per mechanism, same fixed camera
throughout. This document states the verdict plainly, per the brief's own
instruction not to oversell a marginal result.

## The verdict

**No — this scene does not read as a blockout.** A blockout is "simple 3D
shapes… not textured, not lit, not detailed, with flat prototyping colour
on ground and walls" (R1's own definition). The final render
(`07-join-decal.png`) shows real window mullions, doors, balconies, roof
detail, road markings, varied albedo colour pulled from each pack's own
texture, soft light wraparound, a warm/cool shadow shift, rim highlights
on vertical edges, and a visible contact shadow where each building meets
the ground. None of that is present in a literal blockout.

**But the honest reason is not purely the lighting work, and saying so is
the more valuable finding.** Comparing `01-baseline-material.png` (the
material mechanism proven, zero lighting mechanisms on) against the final
image: the baseline *already* does not read as a severe blockout, because
the CC0 source meshes themselves (Kenney's Modular Buildings samples)
carry real geometric detail — windows, balconies, door reveals, a
stepped-back crown — and real texture variation, not flat single-colour
boxes. **Sourcing real assets (C1.6) did more of the escape-the-blockout
work than any single shading mechanism, before the shading work even
started.** That is not a criticism of the shading work; it is the
project's own R1 thesis one layer further back than R1 states it: the
look failure was lighting *given detailed geometry*. Feed undetailed
geometry (a true box) into this exact shader and the verdict might well
be different — this run never tested that case, because every piece here
was a real sourced mesh from the first commit, and that is worth naming
rather than implying the five mechanisms were tested against boxes.

## What each mechanism actually contributed, honestly

Read each pair in `docs/look-proof-shots/` yourself; this is a summary,
not a substitute.

| # | Mechanism | Before → after | Contribution, stated plainly |
|---|---|---|---|
| 1 | Half Lambert squared | `01`→`02` | Real, moderate. Shadow-side faces lift off a hard black cutoff into a soft wraparound — visible on the mid-rise's own left wall and the tower's side. |
| 2 | Warm→cool terminator | `02`→`03` | Real, subtle at this camera's own lighting angle. A cool cast on shadow faces, never to black. Would likely read stronger at a lower sun angle with a longer terminator band. |
| 3 | Rim separation | `03`→`04` | Real, subtle in this framing. A slight lightening along grazing silhouette edges. This scene's fixed camera was not chosen to show off rim lighting — a shot along a building's own edge would show it more clearly. |
| 4 | Contact darkening (R1's fourth) | `04`→`05` | Real but limited on its own — darkens each piece's OWN low vertices, does not touch the ground. Necessary but not sufficient for a convincing ground join, which item 4.3 found directly. |
| 5 | Horizontal/vertical value split | `05`→`06` | Real, subtle. The ground and the tower's own open roof lid read marginally brighter than the walls. |
| — | The join (tier 2 ground decal) | `06`→`07` | **The single most visible change in the whole checklist.** A real contact-shadow halo now sits on the ground around the mid-rise and tower — the difference between "resting on top of" and "meeting" the ground R8 names directly. |

**The join treatment did more visible work than the five shading
mechanisms combined.** That is a real, measured finding from this run,
not a hedge: R8's own framing — *"interesting things happen where
different things meet"* — predicted exactly this, and this proof confirms
it rather than merely repeating the quote.

## The draw-call proof, measured today

`node scripts/shoot-look-proof.mjs 07-join-decal`: **1 draw call**, two
different packs (Kenney Modular Buildings, Kenney City Kit Roads) both
sampled from the same `DataArrayTexture` in that one call, each pack's own
albedo intact — no palette-atlas remap, road markings and window glazing
both survive at full resolution. Triangle count rose from 1,270 to 12,068
between `06` and `07` solely because the join decal needed a subdivided
ground plane to carry a per-vertex gradient (a single quad cannot); draw
calls did not change.

## What this means for the catalogue budget

The brief's own instruction: if the scene still reads as a blockout after
all five mechanisms and the join, that means the problem is geometry and
the catalogue budget has to move. **It does not read as a blockout, so
that reallocation is not indicated by this run** — but the caveat above is
load-bearing for Phase 2 step 7 (the catalogue proper): **the shared
material and its five mechanisms are validated against real, detailed CC0
meshes, not against simplified placeholder geometry.** If the catalogue
is later built partly from lower-detail or hand-simplified pieces to save
budget, this proof does not cover that case, and the "does it still read
as a blockout" question should be re-asked against whatever the actual
catalogue pieces turn out to be — not assumed answered by this five-piece
run.

## What could not be implemented, and why

Nothing on the brief's own checklist was left unimplemented. Two
mechanisms (rim separation, warm-cool terminator) read as subtle rather
than dramatic in this specific camera framing — reported as a framing
limitation of this proof scene, not a defect in the mechanism, since both
are visibly present in a side-by-side comparison of their own before/after
pair.

## Sourcing note, separate from the verdict

`docs/specs/LOOK-UPGRADE.md` (2026-09-06) explicitly rejected a GLB/CC0
import pipeline in favour of pure procedural generation, on the grounds
that Mark had already decided building beats sourcing. `REBUILD-PLAN.md`
(2026-09-11 onward, and the brief this document closes) explicitly
reverses that, in detail, with sourcing named as the method (C1.6, A9).
Nobody has reconciled these two documents against each other — this run
followed the newer, more specific, explicitly-cited instruction rather
than stall on the conflict, but the conflict is real and worth a
deliberate resolution rather than leaving both standing.
