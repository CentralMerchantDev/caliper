# R3 — every red on b1-land, named and classed in one place

Written 2026-09-11 (b1-land, CLI, autonomous run, item 4 of
`docs/briefs/CLI-2026-09-11-autonomous.md`). `docs/specs/COMPLETION-PLAN.md`'s
own R3: *"Full suite green, or every red named and justified in one place."*
This is that place.

**Measured today, not carried forward from a stale number:**
`NODE_OPTIONS="--max-old-space-size=8192" node test/run.mjs`, output
redirected straight to disk (`gen-test-count.mjs`'s own double-buffering
warning — one process, no parent re-capturing it). At HEAD `a67b48e`:

```
tests 1222
pass  1160
fail    46
skip    15
todo     1
```

Neither of the two stale numbers in circulation (46 measured earlier on
`b1-land`, 7 on `codex-lane`) describes this tree — this run's own 46 is a
**coincidental match** to the earlier `b1-land` figure by count only; the
actual set of 46 titles was independently re-derived and re-classified
below, not assumed identical.

**Compared against this same session's own full-suite run from earlier
tonight** (after the ROAD_WIDTH retirement's Steps 2–5 landed, before this
brief's items 0–3): **zero new failures, one resolved** (`test/
originStability.test.ts`'s WORLD.SIZE test — fixed in that earlier session,
commit `101ac09`). Items 0–3 of tonight's own brief introduced nothing new.

---

## Class A — already-decided-red, decision number cited

| Test | File | Decision |
|---|---|---|
| B2.5 gate: generation time... | `boardGenerator.test.ts` | `docs/DECISIONS-FOR-MARK.md` #3 |
| GATE (currently RED...#7): every one of the 12 settled boundaries... | `bridgeGenerator.test.ts` | #7 (cited in its own title) |
| every mutation in the manifest has a committed, checkable CAUGHT result | `mutationEvidence.test.ts` | #10 |
| the summary is not stale against the manifest it claims to cover | `mutationEvidence.test.ts` | #10 |
| the test counts on the page are the test counts | `publicClaims.test.ts` | #9 |

**5 of 46.**

## Class B — same generated-claims-staleness mechanism as #9, not yet individually decision-numbered

Confirmed by reading the imports directly: both read `src/
citySummary.generated.ts`/`src/generatedClaimChecks.ts` — the same
generated-artefact family #9 already names, but #9's own text is scoped to
the page's test-count claim specifically; these two were not individually
folded into it before tonight.

| Test | File |
|---|---|
| CLAUDE.md's verification line names the real test counts | `claudeMdIsCurrent.test.ts` |
| P4.6: no published generated claim is stale... | `generatedClaimsAreCurrent.test.ts` |
| P4.6 (synthetic): checkAllGeneratedClaims itself would report exactly one named claim... | `generatedClaimsAreCurrent.test.ts` |

**3 of 46.** Root cause, checked directly: the node test count moved again
tonight (this session's own new tests — `extractTestTitles.test.ts`'s 6,
plus the `decision-5 step 1/2/4` tests from earlier tonight — pushed the
real count past whatever `test/testCount.generated.json` currently
records), the exact **recurring** gap #9's own addendum already named
("every time work lands, the generated record needs re-running... the page
needs this decision resolved before it can ever catch up on its own").
Re-running `node scripts/gen-city-summary.mjs`/`node scripts/
gen-test-count.mjs` would very likely turn these green again — not done
here, because #9 itself is still Mark's open call on whether the PAGE's
claim should even be an equality-to-a-moving-target in the first place; a
regeneration now would be re-fighting the same battle #9 already queued.

## Class C — B2.8's own already-catalogued old-world tests, deferred behind B4

`docs/specs/COMPLETION-PLAN.md` B2.8: *"Re-pin the 38 old-world tests --
CATEGORIZED 38/38; ~4 bridge-shaped ones already superseded by
`bridgeGenerator.test.ts`; the remaining ~30 need B4 first (their own
old-world import chain -- `layout.js`/`instance-groups.js`/`road-network.js`
-- is what B4 replaces)."* Checked directly, per file (not assumed uniform):
every file below EXCEPT `isolate.test.ts` imports `public/city-plan.js`
directly (`cityConnectivity`, `cityJoin`, `cityWorld`, `connectivityBridges`,
`instanceGroups`, `layout`, `planSeed`, `roadNetwork`, `worldOccupancy`) or a
module that imports the old-world pipeline transitively (`ground.js`,
`world-registry.js` for `ground.test.ts`/`umaaFindings.test.ts`) — the same
plot/road pipeline B2.8 already names, never `public/board-generator.js` or
`public/bridge-generator.js`. `isolate.test.ts` has NO direct `public/`
import (it spawns a subprocess via `execFileSync`) but is independently,
explicitly named old-world-blocked by `docs/DECISIONS-FOR-MARK.md` #2
("`test/isolate.test.ts` carries one already-catalogued old-world-pin
failure") and `docs/specs/COMPLETION-PLAN.md` line 215 ("5
isolate.test.ts-scoped (blocked on B2.8/B4)") — included on that basis, not
on the import-chain evidence the rest of this class rests on.

| File | Count | Basis |
|---|---|---|
| `cityWorld.test.ts` | 20 | imports `public/city-plan.js` directly |
| `cityJoin.test.ts` | 3 | imports `public/city-plan.js` directly |
| `worldOccupancy.test.ts` | 2 | imports `public/city-plan.js` directly |
| `ground.test.ts` | 2 | imports `public/world-registry.js` (old-world) |
| `connectivityBridges.test.ts` | 2 | imports `public/road-network.js`, `public/city-plan.js` |
| `cityConnectivity.test.ts` | 2 | imports `public/city-plan.js` directly |
| `roadNetwork.test.ts` | 1 | imports `public/road-network.js` directly |
| `planSeed.test.ts` | 1 | imports `public/city-plan.js` directly |
| `layout.test.ts` | 1 | imports `public/city-plan.js` directly |
| `isolate.test.ts` | 1 | named old-world-blocked by decision #2 and COMPLETION-PLAN.md:215, not by import |
| `instanceGroups.test.ts` | 1 | imports `public/city-plan.js`, `public/layout.js` |
| `umaaFindings.test.ts` | 1 | imports `public/world-registry.js` (old-world) |

**37 of 46** (20+3+2+2+2+2+1+1+1+1+1+1 = 37, summed and checked, not
estimated).

**Not individually root-caused tonight, and not claimed to be** — B2.8's own
count is "~30", this reconciliation finds 37 in the same import-chain
family; the gap is plausibly new tests added to these files since B2.8 was
last counted (`cityWorld.test.ts` alone accounts for 20), not a
mis-classification, but that arithmetic was not chased further within this
item's own scope.

**The open question `docs/briefs/CLI-2026-09-11-autonomous.md` §12 item 3
already names, not resolved here:** B4 has moved since B2.8 was written —
`ROAD_WIDTH` is retired (`docs/DECISIONS-FOR-MARK.md` #5, §9 all six steps
done) and roads carry real `ROAD_STANDARDS` classes. Whether that changes
B2.8's own "~30 need B4 first" deferral for any of these 37 is a real,
separate re-check this item did not have scope or budget to perform — named
per the brief's own instruction, not silently assumed still true.

## Class D — genuinely new since the last check of this pattern

**None found.** Confirmed by the diff against this session's own earlier
full-suite run (above): zero titles are new.

## Class E — unknown-and-untraced

**One: `supervisedGenerateScript.test.ts`'s "I5 script safety: refuses a
transform the ground does not approve, before printing a prompt or reaching
the confirmation step".** Checked and genuinely does not fit Classes A–C:
no `public/` import at all (spawns `scripts/supervised-generate.mjs` via
`execFileSync`, like `isolate.test.ts` does), not named in
`docs/DECISIONS-FOR-MARK.md`, not named in `docs/specs/COMPLETION-PLAN.md`'s
B2.8 line or elsewhere. This is the honest fallback this reconciliation's
own header promised rather than something silently folded into Class C
because it "smells" old-world the same way `isolate.test.ts` does — it has
not been shown to be, and is named here as genuinely unexamined instead.

---

## Total: 5 + 3 + 37 + 0 + 1 = 46

Matches the measured fail count exactly — every one of the 46 carries a
class, four of five classes are non-empty, and Class E (one real entry) is
the fallback used honestly rather than left unexercised by construction.

## What was not done, per the brief's own §12 scope note

This item classifies. It does not re-pin, does not regenerate
`test/testCount.generated.json`/`src/citySummary.generated.ts` (Class B),
does not re-investigate B2.8's own deferral against the now-retired
`ROAD_WIDTH` (Class C's open question), and does not root-cause
`supervisedGenerateScript.test.ts`'s own I5 failure (Class E). Each is
real, separate, correctly-scoped follow-up work, named above at the point
it applies rather than bundled into "more work to do" generically.
