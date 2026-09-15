# BLD lane, 2026-09-14 -- handover

Brief: [docs/briefs/BLD-2026-09-14-look-proof.md](../briefs/BLD-2026-09-14-look-proof.md).
Worked in full through the brief's own stopping point (section 6: "stop
when 4.4 is committed with its verdict") and stopped there.

## Item 0 -- sync codex-lane to main

Done. Merged `main` (Phase 1 takedown + the 2026-09-14 `REBUILD-PLAN.md`
rewrite) into `codex-lane`. 8 real conflicts, each resolved against the
merged tree rather than picked by side (full account in the merge commit
`cebdb3f`), one additional build break found by running the suite rather
than trusting `tsc` alone (`test/propManifest.test.ts` — fixed the same
way `main` already handles its other quarantine-orphaned tests). A
mid-merge `git stash` mistake discarded `MERGE_HEAD`; recovered by
re-running the merge (deterministic, identical conflict set) and
restoring hand-resolved content from the stash, diffed byte-for-byte
against the original before proceeding. Confirmed
`docs/specs/REBUILD-PLAN.md`'s "ADDED 2026-09-14" section landed before
reading further, per the brief's own instruction.

## Items 1-4 -- the five pieces, the checklist

Done, one commit per mechanism as the brief itself asked:

| Commit | What |
|---|---|
| `99e0a8c` | 4.1 — shared material. 2 real CC0 packs (Kenney Modular Buildings + City Kit Roads), 4 pieces + ground, 1 draw call, one `DataArrayTexture`. Two real GPU-only defects found and fixed (`glslVersion: THREE.GLSL3` missing; `preserveDrawingBuffer` missing), both mutated and watched CAUGHT before being recorded. |
| `1ceab13` | 4.2 mechanism 1 — Half Lambert squared |
| `fb1fe97` | 4.2 mechanism 2 — warm-cool terminator |
| `368f0a9` | 4.2 mechanism 3 — rim separation |
| `82f3d85` | 4.2 mechanism 4 — contact darkening |
| `76c7c9d` | 4.2 mechanism 5 — horizontal/vertical value split |
| `638b0e3` | 4.3 — the one join (escalated tier 1 → tier 2 ground decal after confirming tier 1 alone did not touch the ground) |
| `a06edae` | 4.4 — the verdict: [docs/audits/BLD-2026-09-14-LOOK-PROOF-VERDICT.md](BLD-2026-09-14-LOOK-PROOF-VERDICT.md) |

Every before/after image pair is in `docs/look-proof-shots/`, committed
alongside its own mechanism.

**The verdict, in one line:** the scene does not read as a blockout, but
the sourced CC0 meshes' own detail did more of that work than the
lighting mechanisms, and the join treatment did more visible work than
all five mechanisms combined. Full account in the verdict document, not
restated here.

## What's open, named rather than silently dropped

- `docs/specs/LOOK-UPGRADE.md` (2026-09-06) rejects a GLB/CC0 pipeline;
  `REBUILD-PLAN.md` (2026-09-11 onward, this brief) reverses that.
  Unreconciled between the two documents — this run followed the newer,
  more specific, explicitly-cited instruction and named the conflict
  rather than resolving it, since resolving it is not this brief's own
  scope.
- `test/mutationEvidence.test.ts`'s summary is stale against
  `test/mutations.json` (149 real entries vs. its own recorded 133) — was
  already stale on both `main` and `codex-lane` before this run's own
  merge, confirmed directly, out of scope for both item 0 and the
  checklist.
- `test/deadExports.test.ts` has ~156 newly-unallowlisted exports plus 61
  stale allowlist entries for now-quarantined files — both already
  present verbatim in `main`'s own copy of the allowlist before this
  run's merge, a direct consequence of the holding page carrying no
  `<script>` tags. Not this run's defect to fix.
- Impostor baking (brief section 7.2's offered fallback work) was not
  started — 4.4 landed within budget, so it was never triggered.
- `CLAUDE.md` still points at `docs/WORLD-BUILD-PLAN.md` (dated
  2026-09-04, explicitly says "the aesthetic... is not to be changed") as
  "the current work" — stale since `REBUILD-PLAN.md`'s rewrite. This run
  read `REBUILD-PLAN.md` directly per the brief's own instruction rather
  than trusting `CLAUDE.md`'s pointer, but the pointer itself was never
  fixed.

## Guards held

`CALIPER_ALLOW_SPEND` unset throughout (CC0 asset downloads from
kenney.nl are not API spend). Nothing deleted — the merge's own
quarantine moves are `main`'s, not this run's; this run's only new files
are additions. `git commit -F` with explicit paths, no `git add -A`, for
every commit above. Two other lanes' own uncommitted files (the
`docs/briefs/BLD-2026-09-11-lighting-spike.md` brief and the many stale
`docs/pending-commits/*.txt` files present at session start) were left
untouched — not this run's to judge.

## Report, per the brief's own section 9

- **Before/after images by path, per mechanism:** the table above; the
  files are in `docs/look-proof-shots/01-baseline-material.png` through
  `07-join-decal.png`.
- **Whether the scene still reads as a blockout:** no — see the verdict
  document for the honest reasoning, including the caveat about how much
  of that answer comes from the sourced meshes rather than the shading
  system.
- **The draw count with two packs in one call:** 1 draw call, measured
  via `node scripts/shoot-look-proof.mjs`, both Kenney packs sampling the
  same `DataArrayTexture`.
- **What could not be implemented and why:** nothing on the checklist —
  all five mechanisms and the join landed. Two mechanisms (rim
  separation, warm-cool terminator) read as subtle in this camera's own
  framing, named as a framing limitation of this proof scene rather than
  a defect, since both are visible in their own before/after pair.
- **Anything in `REBUILD-PLAN.md` believed wrong:** nothing found wrong
  in the sections this run actually used (R1, R8, R9, C1.6, the revised
  build order). The one real inconsistency found is external to
  `REBUILD-PLAN.md` itself — its relationship to `LOOK-UPGRADE.md`, named
  above.
