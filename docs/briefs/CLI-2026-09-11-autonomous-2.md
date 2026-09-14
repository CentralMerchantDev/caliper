# LANE BRIEF — CLI lane, second autonomous run, 2026-09-11

**Terminal:** CLI lane (Claude Code)
**Repository:** `C:\Code\sandbox-spike`
**Branch:** `b1-land` — stay on it.
**Mode:** autonomous — Mark is out for roughly three hours. Nothing waits;
decisions queue. **Declared stopping point in §11** — this is not "keep going
as long as you can."

Written from Cowork, uncommitted. **Committing it is checklist item 0.** Read it
critically and say if it is wrong about the code — `rule://escape-clause`.

---

## 1. THE OBJECTIVE

Establish whether B2.8's deferral still holds — 37 of this branch's 46 failures
hang off that one line — and then do B4's board-render instancing, which is the
work R3.5 is actually waiting on.

## 2. THE PLAN

`docs/specs/COMPLETION-PLAN.md` is the checklist. Tick there. Call
`process_next_item` with that path rather than reading it by eye.

Tick only when the gate is green **and** the commit exists. Record evidence with
`process_record_gate`.

## 3. HOW WORK IS DONE

`rule://build-loop`. Every step, in order, none skipped.

## 4. THE GATE

Stated per item in §10. State what RED looks like, not only green —
`rule://standard-of-proof`.

## 5. FILES

The world is this lane's: the board, the generator, roads, terrain,
`city-render.js`, `board-render.js`. Buildings, props, kitbash and interface
belong to BLD — file a cross-lane request in `docs/CROSS-LANE-REQUESTS.md`
rather than reaching into them.

## 6. REVIEW

`rule://reviewer-independence`. Blind subagent reviews each plan before you
implement. Do not tell it what you suspect.

## 7. SUBAGENTS

`rule://subagent-contract`. Attempt budget: 3.

## 8. WHEN SOMETHING IS MARK'S TO DECIDE

`rule://decision-queue`. Never block.

## 9. WHEN YOU MAY STOP

`rule://stopping-authority`, and §11.

**Merge and deploy:** not on your own initiative. Both branches are already
pushed; nothing further is authorised this run.

---

## 10. THIS RUN'S CHECKLIST

**0. Commit this brief — and first confirm your rules are current.**
`C:\Code\process-mcp` changed today. Call `process_get_rule` for `lane-brief`.
If it returns the rule, your server is current. If it returns nothing, say so in
the report and carry on anyway — the run does not depend on it, but a stale
server should be known rather than assumed.

**1. B2.8 — does the deferral still hold? Read, do not build.**

`ca413a0` deferred ~30 old-world tests because they import `layout.js`,
`instance-groups.js`, `road-network.js`, and "B4 replaces them, so re-pinning
now would invent a second requirement for B4." **B4 has since moved**:
`ROAD_WIDTH` is retired, roads carry real classes, the board is regenerated to
21,007 pieces.

Yesterday's R3 classification found **37 of 46 failures tie to this one line**.
So the question is worth twenty minutes before anything else: for each of the
~30, does its own import chain still lack a board-side equivalent, or does one
now exist?

Produce a per-test verdict — still blocked, or re-pinnable now — with the
specific import that decides it. **Do not re-pin anything this run.** A list is
the deliverable; acting on it is a separate, larger piece of work that Mark
should see the list for first.

*Gate:* every one of the ~30 carries a verdict and the import that decides it.
An unexamined test folded into "still blocked" is the failure mode here.

**2. B4 — board-render instancing. The main body of this run.**

`public/board-render.js:57-58` creates a **new `MeshStandardMaterial` and a new
`Mesh` per board piece** — 21,007 of each, confirmed by the render's own
`boardChildren: 21007`. The per-material half is the worse one: distinct
material instances prevent batching entirely, so nothing else helps until it is
fixed. The file's own comment at line 95 already names the remedy —
`world-render-3d.js`'s `partitionForInstancing`, *"what B4's later work would
wire this"*. **Ground-check all of that before acting**; if the code has moved,
say so and stop.

In this order, each through the full loop with its own mutation watched RED:

  **2a. Share materials** — one per `pieceType`, not one per piece. Smallest
  change and it unblocks everything after it.

  **2b. One `InstancedMesh` per (pieceType, footprint, levels) group**, replacing
  the per-piece meshes. A board piece is already `{pieceType, cell, foot,
  rotation, levels}` — shared geometry plus a per-instance transform, which is
  exactly what `InstancedMesh` wants. You should not need
  `partitionForInstancing`'s derivation, only its lessons. Say which you used.

  **2c. The props** — lines 117, 168, 224, 272 (trees, lamps, street furniture,
  boats) have the same defect and the same fix.

**PICKING MUST SURVIVE, and it is the thing most likely to break silently.**
The board pick path was wired recently: `_boardData` is retained and
`pieceAtPoint()` resolves a real piece at a click. `InstancedMesh` changes that
— a raycast returns an `instanceId`, not a child mesh. **Write a test that a
click resolves the CORRECT piece, not merely some piece, and watch it red
before you fix it.**

*Gate:* `test/regressionGate.test.ts` with the board drawn un-gated. Today's
measurement: 4,584 / 6,129 / 870 draw calls, 51.25% culling.

**Read that file's thresholds as a SIGNAL, not a target.** `<= 900`,
`<= 12000000`, `< 0.40` are three unsourced round numbers — the file calls them
"Hard assertion budgets" with no citation, the same material as the 4 GB memory
floor retired earlier today. So: **double digits means the fix worked and the
thresholds never mattered. Just under 900 is suspicious** and means instancing
is only partly working — investigate rather than celebrate. Do not tune toward
900. Do not loosen any threshold.

Report before-and-after for all three cameras and the culling ratio, with the
commands.

**IF BOTH GATES THEN PASS: say so loudly and STOP.** Do not tick R3.5 and do not
change what the board draws by default. That is Mark's call and it changes the
whole release picture.

---

## 11. THE DECLARED STOPPING POINT

**Stop when item 2 is committed** — or when 2a, 2b and 2c are each either
committed or honestly reported as not done, whichever comes first. Do not start
anything in §12 if item 2 is incomplete.

**Write the handover BEFORE the budget gets close.** A run cut off by the limit
loses it, and the handover is the part that survives. Finishing early with a
written record beats finishing late with none.

---

## 12. IF AN ITEM IS ALREADY DONE OR BLOCKED

Take the next written item, in order, and say which you skipped and why:

1. **C2** — the dead-export allowlist broken down by real mechanism: product,
   demo-only, test-only, unreachable, and data-reachable (a string key selects
   from a registry and the import graph cannot see it). No number from it may be
   published until it is split this way. 2,771 entries, carrying a provenance
   note that neither seeding run was reviewed. Expect a sixth bucket the BLD
   lane found: exports that look unreachable but are over-exported internal
   helpers.
2. **C1's remaining unrun mutations** — the SURVIVED one, and
   `b2-6-no-live-route`.
3. **C3** — all seven standing gates green simultaneously. This has never
   happened; establishing **why** is the work, not forcing it.

---

## 13. HOST CONTENTION — READ THIS, IT HAS COST REAL TIME

The BLD lane is running concurrently and its first items are **visual**: real
renders and a browser. Yours are code until item 2's gate measurement, which is
naturally late in the run. That stagger is deliberate.

**Before starting any render, full suite or mutation run, check whether another
`node test`, `shoot.mjs` or headless Chromium process is live.** If one is, do
other work and come back. Two concurrent suites produced a false regression-gate
red on 2026-09-10, and a clean quiet-box reading today is what showed those
gates are trustworthy when nothing else runs.

**Never kill a process. Record PIDs.**

## 14. THE HANDOVER

Write and commit as you go, after every item, so a crash costs one step.
