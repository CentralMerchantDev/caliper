# The 4 GB memory floor, tested — 2026-09-11, b1-land, CLI, attended

Mark suspended `docs/OVERNIGHT-RUN.md:127`'s standing "memory below 4 GB: do
code-only work" rule for this run, explicitly, to test it. This document is
the measurement, committed separately from the fix that follows it, so it
stands on its own even if the fix's wording is later argued with.

## Ground-check: no real source found for the 4 GB figure

Before running anything, per instruction. `docs/OVERNIGHT-RUN.md:127`'s rule
was introduced in commit `5bbef4960176f0e9ed4c39126581efa352dbf353`
(2026-09-09, "docs: commit the overnight operating manual and the lane brief
template") — the FIRST commit that created the file at all ("Both were
written but never tracked"), so there is no earlier git history to check.
The commit message is about tracking practice, not the threshold's own
reasoning; no measurement, no incident, and no link accompanies the line
itself.

Every other file that mentions the figure was checked directly:
`docs/audits/OVERNIGHT-2026-09-10.md`, `docs/audits/OVERNIGHT-CLI-2026-09-09.md`,
`docs/briefs/OVERNIGHT-CLI-2026-09-09.md`, `docs/briefs/RUN3-CLI-2026-09-09.md`,
`docs/specs/BOARD-REBUILD-PLAN.md`, `docs/specs/COMPLETION-PLAN.md` — each
either cites `docs/OVERNIGHT-RUN.md`'s own line directly or repeats the
belief ("this project's own 4 GB floor") without new, independent
measurement. `docs/LANE-BRIEF-TEMPLATE.md:82` references "the stated floor"
without restating a number of its own — a pointer to the same source, not a
second one.

**The one real candidate, checked and found not to qualify:**
`docs/audits/P4.7-WATER-BANDING.md:97` — *"This session's host has crashed
on memory three times today; the standing rule adopted for the rest of it
is..."* This is a narrative claim with no attached evidence: no error text,
no memory reading at the moment of any crash, no timestamp, no process
name or PID. Its own phrasing ("the standing rule adopted") describes
picking up the already-existing `OVERNIGHT-RUN.md` rule, not originating
it. Not independent sourcing — the same shape of unevidenced assertion as
the rule itself, not a second, verifiable data point for it.

**Conclusion: no real source exists.** The floor has blocked real work
across at least four sessions (K7.1, B6, the wedge-wheel screenshot, B3's
visual verification) without ever having been tested until this run.

## The experiment

All memory readings via `Get-CimInstance Win32_OperatingSystem` (the same
command the prior audits used), reported as
`FreePhysicalMemory`/`TotalVisibleMemorySize` in KB, converted to GB.

### Step 1 — before

```
TotalVisibleMemorySize : 16474900
FreePhysicalMemory     : 3117608
```

**Total 15.71 GB, free 2.97 GB** — already below the 4 GB figure before
anything was run.

### Step 2 — the smallest real render, one camera

`node scripts/shoot.mjs "Downtown close"`.

**A real mistake, corrected, not hidden:** the first attempt used
PowerShell's `Start-Process -ArgumentList "scripts/shoot.mjs", "Downtown close"`,
which split `"Downtown close"` into two separate argv entries instead of
one quoted argument — `scripts/shoot.mjs`'s own `VIEWS = process.argv.slice(2)`
then read `["Downtown", "close"]` as two (invalid) view names, producing
two identical fallback-camera images (`downtown.png`, `close.png`, byte-
identical at 2,301,707 bytes each — confirming neither used the real
"Downtown close" camera). Discarded — moved to
`_TO-DELETE/session-scratch-scripts/misrun-{downtown,close}.png`, not
deleted, not counted as a measurement. Re-run correctly via the Bash tool
(which passes a quoted argument correctly), twice:

| Attempt | Result | shoot.mjs's own reported time | Wall-clock elapsed |
|---|---|---|---|
| 2nd (correct) | `downtown-close.png` written, exit 0, no errors | 31.3 s | ~33 s |
| 3rd (for cleaner memory sampling) | same, exit 0, no errors | 30.1 s | 31.85 s |

**A real image, looked at directly** (`.shots/downtown-close.png`, from the
3rd/final attempt): downtown buildings, coastline, boats, sky — a complete,
correct render, no corruption, no missing geometry, matching known-good
renders of this view from earlier sessions.

**Peak memory** (combined WorkingSet across `node`/`chrome`/`msedge`/
`chromium`/`headless_shell` processes, polled every 1 s for 45 s during the
3rd attempt): **369.6 MB.** The 1st (mis-parsed, two-image) attempt's own
peak, sampled more coarsely, was 712.2 MB — not comparable to the single-
camera figure above, since that run rendered two images sequentially in
one process lifetime; not used as this step's own measurement.

**Free memory did not change measurably during this step** (2.97 GB
before, 6.68 GB before Step 3 — the rise happened AFTER this step, at rest,
not during it; no reading was taken mid-render for Step 2 specifically).

### Step 3 — the full multi-camera regression-gate render

`NODE_OPTIONS="--max-old-space-size=8192" node test/run.mjs test/regressionGate.test.ts test/cullingRatio.test.ts`.
(`--max-old-space-size` raises V8's OWN heap ceiling, a Node-internal limit
unrelated to Windows' system free-memory figure under test here — used
because this session's own earlier work tonight found the default V8
ceiling, not system memory, was what crashed a full-suite run; noted for
transparency, not concealed.)

Free memory immediately before starting: **6.68 GB** (risen naturally at
rest between Step 2 and Step 3 — a real, unforced fluctuation, not caused
by anything this run did).

**Result: completed successfully. 3/3 tests pass, exit 0.**
```
Street level:     285 calls, 47,216 triangles
Downtown skyline: 484 calls, 148,019 triangles
The harbour:      271 calls, 274,961 triangles
Culling Ratio:    31.90% (Limit: < 40.0%)
```
Matches this same session's own earlier, healthy readings from tonight
(same numbers, measured twice already before this run) — not a fluke, not
a degraded pass.

**Elapsed: 179.7 s wall-clock** (178,658.8 ms internally reported by
`node:test`). Mark's own brief cited "220+ seconds on the smaller world"
as historical context for this same pass — this run, on the current
(larger) world, took somewhat less; noted as informative, not the point of
this experiment.

**Peak combined WorkingSet during the render** (polled every 2 s for the
first 140 s of the ~180 s run, `node`/`chrome`/`msedge`/`chromium`/
`headless_shell`): **418.7 MB** (first sample, t+2s) — the render's OWN
memory footprint stayed modest throughout, generally 150–420 MB, never
climbing far above where it started.

**The dramatic finding: system free memory oscillated wildly and
independently of the render, repeatedly dropping to near-zero, and the
render succeeded anyway.** Full 70-sample trace in
`docs/audits/MEMORY-FLOOR-EXPERIMENT-2026-09-11-samples.txt` (committed
alongside this document). Free memory cycled in a repeating sawtooth,
roughly every 30–40 s, between ~8 GB and near-zero:

```
t+2s   free=0.73 GB
t+8s   free=7.25 GB
t+20s  free=3.12 GB
t+28s  free=0.71 GB
t+34s  free=0.38 GB   <- local minimum
t+40s  free=7.95 GB
t+58s  free=0.21 GB
t+62s  free=0.02 GB   <- GLOBAL MINIMUM this run, effectively zero
t+68s  free=8.13 GB
t+94s  free=0.09 GB
t+120s free=0.98 GB
t+122s free=0.17 GB
t+134s free=8.02 GB
t+140s free=7.95 GB
```

**Minimum free memory observed during a successful render: 0.02 GB.** The
render's own combined process memory did not spike to correspond with
these drops (peak stayed 418.7 MB, reached in the FIRST sample, before any
of the low-free-memory troughs) — meaning the free-memory swings are
coming from something else on this host, independent of the render under
test, and the render was unaffected by them either way.

### Step 4 — after

```
TotalVisibleMemorySize : 16474900
FreePhysicalMemory     : 6964724
```

**Total 15.71 GB, free 6.64 GB.**

## What this experiment shows, and does not show

**Shows:** on this host, on 2026-09-11, both a single-camera
`scripts/shoot.mjs` render and the full multi-camera
`test/regressionGate.test.ts` + `test/cullingRatio.test.ts` pass completed
successfully, correctly, with no crash, no hang, and no process requiring
intervention — across free-memory readings ranging from 2.97 GB at the
start down to a measured minimum of 0.02 GB during the expensive render.
Nothing was killed; nothing hung.

**Does not show:** where a render WOULD fail. No failure was observed at
any point, including the near-zero reading — so this experiment cannot
establish a real floor, only that the renders tested here work at least
down to 0.02 GB free, today, on this host, for these two specific render
workloads. A different, larger render (more cameras, more instanced
geometry, quality knobs raised) could behave differently; that is a
separate, unmeasured claim this document does not make.

## PIDs, in case anything needs to be traced back

Nothing hung and nothing was killed, so this is a record, not an action
log: shoot.mjs attempt 1 (mis-parsed) PID 34332; attempts 2 and 3 were run
via the Bash tool's own background-task mechanism, not tracked by a raw
Windows PID directly. The regression-gate render (Step 3) was likewise run
via the Bash tool. All processes exited normally on their own.
