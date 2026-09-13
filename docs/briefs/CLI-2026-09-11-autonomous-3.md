# LANE BRIEF — CLI lane, third run, 2026-09-11

**Terminal:** CLI lane (Claude Code)
**Repository:** `C:\Code\sandbox-spike`
**Branch:** `b1-land` — stay on it.
**Mode:** autonomous — **declared stopping point in §11.**

Written from Cowork, uncommitted. **Committing it is checklist item 0.** Read it
critically and say if it is wrong about the code — `rule://escape-clause`. It has
been wrong twice in a row: the B2.8 recheck's stated reason and the instancing
risk model were both corrected by this lane. Assume this one has an error too.

---

## 1. THE OBJECTIVE

Instancing cut draw calls twelvefold and made the culling ratio worse. Establish
whether that is a real rendering problem, a measurement that instancing made
meaningless, or both — and fix the real one without tuning to the unreal one.

## 2. THE PLAN

`docs/specs/COMPLETION-PLAN.md`, R3.5 and PART 3. Tick there. Call
`process_next_item` rather than reading by eye.

## 3. HOW WORK IS DONE

`rule://build-loop`. Every step, none skipped.

## 4. THE GATE

Per item in §10. State what RED looks like — `rule://standard-of-proof`.

## 5. FILES

The world is this lane's. Buildings, props, kitbash and interface belong to BLD,
which is working concurrently on its own branch — file a cross-lane request
rather than reaching across.

## 6. REVIEW

`rule://reviewer-independence`. Blind subagent reviews each plan before you
implement. Three for three found real issues last run; do not skip them.

## 7. SUBAGENTS

`rule://subagent-contract`. Attempt budget: 3.

## 8. WHEN SOMETHING IS MARK'S TO DECIDE

`rule://decision-queue`. Never block.

## 9. WHEN YOU MAY STOP

`rule://stopping-authority`, and §11. **Merge and deploy: not on your own
initiative.** `b1-land` is already pushed; no further push is authorised.

---

## 10. THIS RUN'S CHECKLIST

**0. Commit this brief.**

**1. Ask what the culling gate is actually measuring, before fixing anything.**

`test/regressionGate.test.ts:108` asserts
`street.triangles / skyline.triangles < 0.40`. That ratio was written for a
world of per-piece meshes, where a street-level camera genuinely submits a
fraction of what a skyline camera does. **You have just replaced 21,007 meshes
with 16 instanced objects, and both cameras now submit the same 16.**

So the honest first question is not "how do we get the ratio down." It is:
**does this ratio still measure the property it was written to protect?**

Name that property in writing first. The best reading is something like "a
street-level camera must not make the GPU draw the whole world" — which is a
real thing worth guarding on a phone. Then say whether the ratio still detects
it, detects only the bounding-volume artefact, or detects nothing.

This is the same shape as `docs/DECISIONS-FOR-MARK.md` #3, where B2.5's 30-second
CPU gate became a category error once generation moved offline, and this project
chose to name it rather than tune to it.

**Do not invent a replacement threshold.** If a new metric is needed — an
absolute triangle or draw-call count at street level rather than a ratio against
a different camera — propose the METRIC and leave the NUMBER open, or label any
number you give as explicitly unsourced. Rule Zero applies here exactly as it
applied to the 4 GB memory floor retired this morning and to the "Hard assertion
budgets" comment sitting above line 100 of that same file.

**A note on where a real number could come from, soon.** The BLD lane is making
the dev server reachable off loopback for the first time — no `--ip` has ever
been configured in this repo, which is why condition 4's "it works on a phone"
has never been done. Once that lands, a measurement on a real device could
SOURCE these thresholds properly. That may be worth waiting for rather than
inventing one now. Say what you think.

*Gate:* a written answer with the property named, not a number changed.

**2. Spatial chunking — for the real reason, not for the ratio.**

Your own hypothesis is right and is standard three.js behaviour: an
`InstancedMesh` carries one bounding volume covering every instance, so a
piece-type group scattered across the whole archipelago is always in frustum and
never culls. That is genuine wasted GPU work regardless of what any gate says,
and it matters most on the device nobody has tested yet.

Chunk the instances spatially — by boundary (there are 12) or by a coarse tile
grid — so each `InstancedMesh` has a tight bounding volume that can actually be
culled.

**Watch the trade.** More groups means more draw calls: 16 becomes perhaps
100–200. You have real headroom — 283/502/289 against a 900 ceiling — but it is
not unlimited, and the ceiling is itself unsourced. Report draw calls AND the
culling measurement AND, if you can get it, triangles actually submitted per
camera. Three numbers, not one.

**Picking must survive again.** You established last run that the pick path
never depended on mesh identity or `instanceId`, which is why instancing did not
break it. Chunking changes group membership rather than identity, so it should
be safe — **verify that rather than reasoning it**, through the real production
pick path as you did before.

*Gate:* RED is a piece that resolves to the wrong chunk, or a chunk whose
bounding volume still spans the world. Watch it red before fixing.

**3. If both gates then pass, say so loudly and STOP.** Do not tick R3.5, do not
change what the board draws by default. That is Mark's, and it needs two
screenshots — board-only against today's default — not a green tick. The board
is still three flat colours; typologies are not wired to it.

---

## 11. THE DECLARED STOPPING POINT

**Stop when item 2 is committed, or when item 1 concludes the metric is wrong
and item 2 should not be done as written** — that is a legitimate stop, not a
failure.

**Write the handover BEFORE the budget gets close.**

---

## 12. IF AN ITEM IS ALREADY DONE OR BLOCKED

1. **C2** — the dead-export allowlist split by real mechanism: product,
   demo-only, test-only, unreachable, data-reachable. 2,771 entries, provenance
   note says neither seeding run was reviewed. Expect a sixth bucket BLD found:
   over-exported internal helpers that look dead.
2. **C1's remaining unrun mutations** — the SURVIVED one and
   `b2-6-no-live-route`.
3. **C3** — all seven standing gates green at once. Establishing why it has
   never happened is the work.

---

## 13. HOST CONTENTION

BLD is running concurrently and will be starting a dev server, possibly bound to
the LAN. Before any render, full suite or mutation run, check for a live
`node test`, `shoot.mjs`, `wrangler` or headless Chromium process. If one is
live, do other work and come back. **Never kill a process; record PIDs.**

## 14. THE HANDOVER

Write and commit as you go, after every item.
