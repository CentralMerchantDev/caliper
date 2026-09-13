# LANE BRIEF — PHASE 1, CLEAR AND DEFINE

**Terminal:** one lane only. **Repo:** `C:\Code\sandbox-spike`.
**Branch:** cut `rebuild` from `b1-land` and stay on it.
**Mode:** autonomous, long run. Declared stopping point in §11.

**Read `docs/specs/REBUILD-PLAN.md` before anything else — all of it, including
the CORRECTIONS block at the top, which supersedes anything later that
contradicts it.** This brief cites that plan rather than restating it.

**Phase 1 builds nothing.** At its end the repository knows what to build and
contains nothing that describes the dead world. Do not start Phase 2 work; the
whole point of this phase is that nothing gets built against a draft.

---

## 1. OBJECTIVE

Clear the old world out, turn the written catalogue into data a program can read,
and verify the numbers that are about to become constants.

## 2. THE PLAN

`docs/specs/REBUILD-PLAN.md`. It supersedes `COMPLETION-PLAN.md`, which stays only
as a record of what was built and measured.

## 3. HOW WORK IS DONE

`rule://build-loop`, every step, none skipped.

## 4. THE GATE

Per item in §10. State what RED looks like — `rule://standard-of-proof`.

## 5. FILES

Everything, this phase. One lane, no cross-lane coordination.

## 6. REVIEW

`rule://reviewer-independence`. Blind subagent review before each implementation.
A hostile blind review of the plan itself found nine real problems on
2026-09-13; do not skip this.

## 7. SUBAGENTS

`rule://subagent-contract`. Attempt budget: 3.

## 8. WHEN SOMETHING IS MARK'S

`rule://decision-queue`. Never block.

## 9. WHEN YOU MAY STOP

`rule://stopping-authority` and §11. Do not merge, deploy or open a pull request
on your own initiative. **You are authorised to push `rebuild` to origin.**

---

## 10. CHECKLIST

**0. Cut the branch and commit this brief.**
`git switch -c rebuild` from `b1-land`. Confirm `b1-land` is unchanged and still
matches origin. Then commit this brief.

**1. Clear the site — inventory FIRST, as an explicit list.**

Candidates named in the plan: `public/layout.js`, `public/instance-groups.js`,
`public/road-network.js`, `public/city-plan.js`, and `city-render.js`'s
old-world path. **Do not trust that list — derive your own.**

Produce a per-file inventory: every file, what depends on it, and the command
that established the dependency. **Commit the inventory alone, before moving
anything**, so it can be read before the tree changes.

Then quarantine in dependency order, innermost first, to `_TO-DELETE/<reason>/`
with a ledger line each. **Nothing is deleted.** `rule://quarantine` Tier 2 means
moved and RETAINED — Mark's approval is needed to delete, and nothing needs
deleting, so do not ask for it.

After each move: run the suite, record what newly went red, and say **why that
was expected**. An unexpected break is a real dependency nobody knew about —
stop and record it.

*Gate:* RED is a quarantine that leaves the tree unbuildable, or a red test with
no explanation beside it.

**2. Retire the tests that only describe the dead world.**

Roughly 37 old-world pins plus dependants. **Named individually, never swept.**
Each one: retired, with its reason, or kept because it tests something that
survives. A test asserting the behaviour of quarantined code is not a failure to
fix — its subject is gone.

*Gate:* every retired test carries a reason, and the suite's remaining red count
is fully explained in one place.

**3. Verify the three suspect numbers. This is the item most likely to be
skipped and it is the one that keeps the spec honest.**

Per CORRECTIONS C-3 and C-9, three figures are in the plan awaiting verification.
Each is about to become a constant:

- **Boeing 2019, Table 1.** The plan's ranges are a regional subset presented as
  global limits and would reject a Manhattan-style grid. Open the paper. Read the
  real distributions for orientation-order φ, four-way share, dead-end share,
  node degree, median segment length and circuity. **Report grid-typology and
  organic-typology bands separately.** Until this lands, those metrics are a
  measurement to report, never a test to fail.
- **Marshall et al. 2016, Table 1.** Does it say Manhattan is 80 × 274 m or
  256 × 60 m? If 256, G1's 274→272 rounding evaporates — 256 is 64 exact modules.
- **Portland Title 33.** The cited URL 404s and the code is written in feet.
  Find the current minimum lot width and depth for single-dwelling zones,
  post-Residential-Infill, and give the real figures in feet with the metric
  conversion labelled as a conversion.

**If a source cannot be reached, say so and leave the number marked unverified.
Do not substitute a plausible figure** — three have already been retired from
this project this week.

*Gate:* each of the three is either verified with a quotation and a working URL,
or explicitly marked unverified. No third state.

**4. Split the vision document out.** CORRECTIONS C-11. Multi-city unlocking,
city-health gates, the token economy, player code uploads and the
charitable-giving model are Mark's recorded intent and must not be lost — but
they are not build scope and a lane will read them as a work list. Move them to
`docs/specs/VISION.md`, leave a one-line pointer, and change nothing about their
content.

**5. The catalogue as DATA, plus its validator.**

Turn `REBUILD-PLAN.md` §C1 into `data/catalogue.json` — the file the code reads.
One entry per piece: `id`, `footprint [w,h]` in modules, `category`, `rotatable`,
`terrainMask`, and the fields C1.4 names for buildings.

**Adding a piece must be a row, not a code change.** Radiant's third named
mistake was that their own engine left designers unable to add content.

**Then write the validator, and write it before anything consumes the file:**
- every footprint is a whole number of modules
- every footprint in C1.1's set of eight, or a rotation of one
- every road width even, and one of 2 / 4 / 6 / 8
- every junction's arms same-class or adjacent-class
- every pivot at the anchor cell's corner (C-5), never the footprint centre
- no duplicate ids

A11: *"Unknown node types are caught immediately — the LLM cannot invent a node
name."* **This validator is what makes Side B possible later**, so build it as
though a model will be generating entries against it, because one will.

*Gate:* RED is a deliberately malformed entry — an odd road width, a footprint
off the set, a duplicate id — that the validator accepts. Prove each red before
fixing it.

**6. Assemble candidate visual references. Do not choose.**

Plan item 1.4. The research names the territory: Dorfromantik, Townscaper, Alba,
TF2's illustrative rendering. Gather candidate reference shots into
`docs/specs/VISUAL-REFERENCES.md` with what each one demonstrates.

**Mark picks.** Queue it as a decision with your recommendation; do not select on
his behalf. Taste is his.

---

## 11. STOPPING POINT

**Stop when item 5 is committed** — item 6 only if budget remains. Write the
handover before the budget gets close; a run cut off by the limit loses it, and
the handover is the part that survives.

**Do not start Phase 2.** Not the flat board, not placement, nothing. Phase 2
starts from a finished Phase 1 or it repeats what this whole document exists to
stop.

## 12. IF AN ITEM IS BLOCKED

1. `PIECE-CATALOGUE-ROADS.md` is superseded by §C1 and its §5 is wrong. Quarantine
   it with a pointer rather than editing it.
2. The seven standing gates — re-derive which still describe anything real after
   the quarantine. Most will not.
3. C2's dead-export allowlist, 2,771 entries, most describing exports that are
   leaving. Re-deriving it after the quarantine is cheaper than analysing it
   before.

## 13. GUARDS

`CALIPER_ALLOW_SPEND` unset, zero API spend. Nothing deleted. `git commit -F`
with explicit paths, never `git add -A`. PowerShell. Spell-check every word.
Never kill a process; record PIDs.

## 14. HANDOVER

Write and commit as you go, after every item, so a crash costs one step.

**Report:** the inventory as an explicit list · what was quarantined and what
broke · every retired test with its reason · the three verifications with their
quotations · the validator's red-first evidence · and anything in
`REBUILD-PLAN.md` you believe is wrong.
