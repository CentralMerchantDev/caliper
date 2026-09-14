# LANE BRIEF — CLI, clear the site

**Terminal:** CLI · **Repo:** `C:\Code\sandbox-spike` · **Branch:** `b1-land` ·
**Mode:** autonomous, long run.

**Read `docs/specs/REBUILD-PLAN.md` first.** It supersedes `COMPLETION-PLAN.md`
as the governing plan and carries the research this brief cites rather than
restates. Committing this brief is item 0.

---

## THE OBJECTIVE

Phase 1.5 and 1.6 — clear the site. Mark, 2026-09-11: *"I'm not willing to go
down the route of keeping it for any reason whatsoever at this point."*

The old world **cannot become Side A**. A board you place pieces on needs discrete
slots with known footprints; `layout.js`'s plots are not that. It is not a
fallback, it is a dead end, and keeping it is why 36 of 37 tests are red, why the
board has three flat colours, and why roads draw twice.

Nothing is deleted. Everything is quarantined with a ledger line, per
`rule://quarantine`, so the knowledge survives even where the code is not wanted.

## HOW WORK IS DONE

`rule://build-loop`, every step. `rule://reviewer-independence`. `rule://quarantine`
— **Tier 2 means moved and RETAINED until Mark confirms an explicit list**, and a
count is not a list. Merges and deploys: not on your own initiative.

---

## CHECKLIST

**0. Commit this brief.**

**1. Inventory before you move anything.** Produce the explicit, per-file list —
every file, and for each one what depends on it. Candidates named in the plan:
`public/layout.js`, `public/instance-groups.js`, `public/road-network.js`,
`public/city-plan.js`, and `city-render.js`'s old-world path.

**This is the list Mark confirms.** Do not move a directory because it has the
right name. Commit the inventory on its own so it can be read before anything
changes.

*Gate:* every file has a named dependent set, or is stated to have none, with the
command that established it.

**2. Quarantine, in dependency order**, innermost first so the tree keeps
building. `_TO-DELETE/<reason>/` with a ledger line each. After each move: the
suite runs, and you record what newly went red **and why that was expected**.

The point is that the tree still builds and the reds are all accounted for. If
something breaks that you did not predict, stop and record it — that is a real
dependency nobody knew about.

**3. Retire the tests that only describe the dead world.** Roughly 37 old-world
pins plus dependants. **Named individually, never swept.** For each: retired, or
kept because it tests something that survives. A test that asserts behaviour of
quarantined code is not a failure to fix — it is a test whose subject is gone.

*Gate:* a list where every retired test carries its reason, and the suite's red
count is fully explained.

**4. Re-source the perf gates.** §R5. `test/regressionGate.test.ts` asserts
`draw calls <= 900` and `triangles <= 12000000` under a comment reading only
"Hard assertion budgets" — no citation. Research found real numbers:

- **< 500 draw calls** for OpenGL ES, which WebGL maps to — Arm GPU Best Practices
  Rev 3.4 §3.2, a versioned vendor document.
- `triangles <= 12000000` is **a no-op** — 2× above the only forum threshold found
  and 23–58× above what Arm's fragments-per-triangle rule implies at 1080p. It
  can essentially never fire.

Replace both with sourced figures **and the citation in the file**, or retire
them saying why. Do not invent a middle number. If you judge the right move is to
delete the triangle assertion rather than replace it, that is a legitimate answer
— say so with the reasoning.

Also §R6: the culling ratio is now measuring the bounding-volume behaviour of
`InstancedMesh`, not visual efficiency. Say whether it should survive Phase 2 at
all.

**5. Close the decision queue.** Decisions #3 through #9 are mostly about the old
world or measurements of it. Each one: resolved, superseded by the rebuild, or
still live — with a reason. `caliper-bld #3` (trees) is superseded by §R2, which
found Firewatch shipped 23 tree models for an entire game.

---

## STOPPING POINT

**Stop when item 5 is committed.** Write the handover before the budget gets
close. Do not begin any Phase 2 work — the catalogue and terrain brief are being
written while you run, and building against a draft is how the first attempt
went wrong.

## IF BLOCKED

1. `PIECE-CATALOGUE-ROADS.md` §5 is **wrong** and marked so in the plan (§R4):
   junctions are generated from node and segment flags, not authored, and neither
   the transition-tile rule nor enumerated mixed junctions survive. Correcting
   that file is available work if items 1–5 finish.
2. C2's allowlist — most of its 2,771 entries describe exports that are leaving.
   Re-deriving it after the quarantine is cheaper than analysing it before.

## GUARDS

`CALIPER_ALLOW_SPEND` unset, zero API spend. `git commit -F` with explicit paths,
never `git add -A`. PowerShell. Spell-check every word. **Never kill a process;
record PIDs.** BLD is running concurrently on a lighting spike against the
existing geometry — coordinate through `docs/CROSS-LANE-REQUESTS.md`, and expect
its shots to change appearance under you.

## REPORT

The inventory as an explicit list. What was quarantined and what broke. Every
retired test with its reason. What the perf gates now say and their citations.
The state of every queued decision. Anything in the plan's research you think is
wrong.
