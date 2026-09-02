# Full system audit — plan and phase order

**Why this document exists.** The audit is larger than one working context. This
file and `AUDIT-LEDGER.md` are the durable state: after clearing memory, read
these two, run the verification block at the bottom, and continue from the first
phase not marked DONE. Nothing else needs to be remembered.

**Standard.** F1 — every finding either fixed and covered by a test that fails
when the fix is reverted, or written down with a reason it was not fixed. A
finding that is closed without evidence is not closed.

---

## The rule this audit exists to enforce

Every defect found so far has been the same shape: **something asserted that
nobody measured.** A coordinate typed into a table. A comment describing code
that had changed. A test reading a field a later commit superseded. A count in
the UI copied from memory. The fix is never "be more careful" — it is to make
the claim measurable and then measure it.

So each phase asks the same three questions of its area:

1. **What does it claim?** (comments, docs, UI copy, commit messages, test names)
2. **Is that true right now?** — verified by running it, not by reading it
3. **Would anything notice if it stopped being true?** — mutate it and see

Finding (3) fail is worth more than finding (2) fail. A wrong fact gets fixed
once; a fact nothing guards goes wrong again.

---

## Phases

Each phase is self-contained. Audit with a **fresh agent that has no knowledge of
the intent** (this has caught things every single time), record findings in the
ledger, fix by severity, verify by mutation, commit, then clear.

### Phase 1 — The known backlog
Already found, not yet fixed. No new audit needed; just do them.
- `generateWorld` ~2.7 s synchronous before first paint
- Street/walk camera confined to a 440×160 m box, calling *village* terrain in city mode
- At `WORLD_SCALE = 0.4` the container port becomes unplaceable and the world silently loses every warehouse zone
- Silent `catch { return; }` in `_refreshFeatureTargets` reinstates the stale-bookmark bug it exists to fix
- `stats.featurePlacement`, `featuresUnplaced`, `refusedWhy`, `settlementFit`, `zoningChanges` are written and never read on the main page
- Dead imports across `public/` and `src/`; `driveableRun` dead and drops its `cls`
- `findQuay`'s `along` option permanently `"ew"` — every N–S branch unreachable
- Airport fence declared twice with different numbers (`features.js` 3600×1200 vs `zoning.js` 2200×900)
- `WORLD.SIZE = 40000` does not scale; `index.html` says both "31 km" and "40 km"
- `citySummary.generated.ts` tells the model "roads may not exceed 0.13 slope" — superseded by per-class `ROAD_SLOPE_MAX`
- `world-scale.js` header predicts 32.0% settled; measured 29.2%
- Tests that re-derive the feature manifest instead of importing `FEATURES`
- `placementLayout.test.ts` asserts on source text, including a **comment**
- Airport-platform test samples too coarsely (108 points over 4.3 km²) to see water in the platform
- "Railway runs on land" test probes `-3900·k`; the railway resolves to `-2695`

### Phase 2 — The pipeline (`src/`)
The part that takes a visitor's words and changes the world. Highest stakes:
this is what the portfolio claim rests on.
- `changePipeline.ts`, `claude.ts`, `openai.ts`, `criteria*.ts`, `grounding.ts`
- `controlLayer.ts`, `spendCap.ts`, `spendCounterDO*.ts`, `rateLimit.ts`
- `sandbox.ts`, `simSandbox.ts`, `worldEdit.ts`, `attacks.ts`
- Dead: `generateArtifact`, `repairArtifact`, `generateBrief`, `DispatchNamespaceSandbox`, `REVIEW_MODEL_ALTERNATIVE`, `callWithValidationRetry`
- Specifically: every gate, every refusal, every place a failure could be
  swallowed, and whether the review loop's guardrails actually bound it

### Phase 3 — The world generator (`public/`, non-render)
- `terrain.js`, `city-plan.js`, `land-use.js`, `grade.js`, `zoning.js`,
  `features.js`, `settlement-fit.js`, `footprint.js`, `spatial-index.js`, `noise.js`
- Determinism, scale-invariance, and what happens at `k` = 0.4, 0.65, 1.0
- Every constant that must agree with another constant

### Phase 4 — Renderer and UI
- `city-render.js`, `world-render-3d.js`, `buildings.js`, `index.html`, `city.html`
- The editable layer (`_reconcilePlacements`) — the thing the coding agent drives
- Camera, LOD, disposal, leaks, mobile
- Accessibility and the public copy

### Phase 5 — The tests themselves
Audit the suite as a system. For each of the 26 files: would deleting the
feature it covers fail it? Budgets that never trigger, assertions that cannot
fail, tests constructing the data they assert on.
- Run the 9 Cloudflare Worker tests — **they have never been executed in this sandbox**

### Phase 6 — Claims, docs and copy
Every assertion in `docs/`, every comment stating a measured number, every line
of UI copy, checked against what the code does now.

### Phase 7 — Security, cost and deploy readiness
- Sandbox escape surface, prompt injection, the nine regression checks
- Spend caps and rate limits under failure, not just success
- `wrangler.jsonc`, secrets, what is public
- Deploy and verify live

---

## Verification block — run this after any context clear

```bash
cd C:\Code\sandbox-spike
npm test                      # expect: 26 files, all pass, exit 0
npx tsc --noEmit              # expect: clean
git log --oneline -5          # where the work got to
```

Then read `docs/AUDIT-LEDGER.md` and continue at the first phase not DONE.

## Ground rules for every phase

- **Never mark a finding fixed without a test that fails when the fix is reverted.**
  Mutation-check it and record the result in the ledger.
- **Correct claims rather than the code** when the code is right and the claim
  drifted. Write down which it was.
- **Do not delete a test to make a phase green.** If a test is wrong, say why in
  the ledger and rewrite it deliberately.
- **Zoning is a layout hint and must never gate an edit.** The city exists to be
  edited; refusals are for physical reality only.
- Commit at the end of each phase with the findings in the message.
