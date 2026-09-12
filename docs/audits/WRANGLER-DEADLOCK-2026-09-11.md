# The wrangler dev port-8787 deadlock, diagnosed -- 2026-09-11, BLD, attended

Starting point: `docs/audits/BLD-2026-09-11-autonomous-2-HANDOVER.md`'s own
recorded PIDs and findings, read first rather than re-derived. That
handover named two failure modes across two attempts in the prior
(unattended) run -- a harness-killed background task leaving orphaned
processes, and a real `wrangler dev` crash (`wrangler-2026-09-11_23-05-
37_005.log`) after which port 8787 had no active listener.

## The four questions, in the order asked

**1. Is a process still holding 8787, and which one, by command line?**

No, not at the start of this session. `Get-NetTCPConnection -LocalPort
8787` returned nothing at all -- not even a `TIME_WAIT` entry -- and
`Get-CimInstance Win32_Process` found zero processes matching `wrangler
dev`, `workerd`, or `playwright test`. The orphaned PIDs named in the
prior handover (39348, 22668, 29496, 18876, 20612, and the
`panelOverlap`/`nav-wheel-shoot` groups) are all gone -- they were not
permanent, unkillable zombies; they cleared on their own between the
previous session ending and this one starting. Nothing was holding the
port when this diagnosis began.

**2. Did wrangler leave state behind -- `.wrangler/tmp`, a lock, a stale
socket?**

Yes, two distinct things, one Tier 1 and one not:

- `.wrangler/tmp/` held five orphaned per-invocation directories
  (`bundle-*`, `dev-*`), none cleaned up by a graceful exit -- 45,175,510
  bytes, 20 files, timestamped across the prior session's several
  `wrangler dev` launches. Confirmed untracked (`git status --short
  .wrangler` empty, `git log --all -- .wrangler/tmp` empty) -- Tier 1,
  `regenerable-build-output`, per `rule://quarantine`'s own closed list.
  Quarantined and purged this session; see "What changed" below.
- `.wrangler/state/v3/observability/miniflare-wobs-trace-store/*.sqlite-
  wal` is 4,144,752 bytes -- roughly 4 MB of uncommitted write-ahead log,
  last touched 2026-09-11 19:11, the same few minutes as the crash. Every
  OTHER local-dev SQLite store (cache, the `SpendCounterDO`, the KV
  namespace) is tiny and was not being written to. This is real leftover
  state and a real anomaly -- a local dev session logging enough trace
  volume to leave a 4 MB uncheckpointed WAL is not proportional to the
  handful of page loads this session made -- **but it is not on
  `rule://quarantine`'s Tier 1 list** (`.wrangler/tmp/` is named
  explicitly; `.wrangler/state/` is not), so it was not touched. Named
  here as a candidate contributing factor, not proven, and Mark's to act
  on if he wants it cleared.

No lock file and no stale socket were found -- SQLite's own `-shm`/`-wal`
mechanism does not use a separate `.lock` file on this platform, and no
Unix-domain-socket-equivalent exists for a Windows TCP-bound dev server.

**3. Does it reproduce from a clean start, or only after a previous
crash?**

Only after a previous crash. With `.wrangler/tmp/` cleared, `npx wrangler
dev --port 8787` was started fresh and was **Ready in 5 seconds**,
confirmed independently of its own log text: `Get-NetTCPConnection
-LocalPort 8787 -State Listen` shows a real listener, and a direct
`Invoke-WebRequest http://127.0.0.1:8787/` returned **HTTP 200, 264,514
bytes** -- the real page. This is the opposite of stuck. A clean start is
reliable; the prior session's difficulty began only after the crash
documented below.

**4. Is it wrangler itself, the port, or something else that happens to
use 8787?**

Wrangler itself. The crash log's real error, read directly rather than
assumed from its "Network connection lost" summary already on record:

```
Error in ProxyController: Error inside ProxyWorker
 Error
    at castErrorCause (...\node_modules\wrangler\wrangler-dist\cli.js:180550:20)
    at ProxyController2.emitErrorEvent (...\cli.js:326675:20)
    at ProxyController2.onProxyWorkerMessage (...\cli.js:326552:18)
    at PROXY_CONTROLLER (...\cli.js:326279:24)
    ...
    at async #handleLoopbackCustomFetchService (...\miniflare\dist\src\index.js:112316:22)
    at async #handleLoopback (...\miniflare\dist\src\index.js:112699:20) {
  cause: { message: 'Network connection lost.' }
}
```

This is wrangler's own internal `ProxyWorker` (the layer it runs in front
of the real Worker to enable live reload) losing its connection to the
`workerd` runtime process -- an internal wrangler/miniflare reliability
fault (wrangler `4.126.0`), not a bug in this repository's code, not a
real port conflict (nothing else was ever found squatting on 8787 at any
point in this diagnosis), and not the memory floor (this run and the run
that produced the crash both had several GB free). It repeated 4 times in
the crash log (8 matches of the same message, two lines per occurrence)
before that instance's proxy layer never recovered -- consistent with the
instability `playwright.config.ts`'s own comments already document
("wrangler dev's local miniflare instance visibly slows down and can drop
its inspector proxy connection ... under repeated full-page loads of this
app's real asset payload"). No new root cause inside wrangler's own
bundled source was pursued past this point -- that is third-party code,
and the reproducible fact (clean start works, post-crash state does not
without intervention) is the actionable one.

## What changed

`.wrangler/tmp/` quarantined and purged per `rule://quarantine`'s Tier 1
order of operations (move, test, ledger, purge):

1. Confirmed untracked (`git status --short`, `git log --all`).
2. Moved to `_TO-DELETE/regenerable-build-output/wrangler-tmp-2026-09-11`.
3. Ran the class's test again post-move -- still passes (git never
   tracked it, so the move changes nothing about that fact).
4. Appended `_TO-DELETE/LEDGER.jsonl` (first entry in this repo): ts,
   path, class, bytes (45,175,510), files (20), `sha256: null` (a
   directory, not a single file -- `rule://quarantine`'s own text says a
   directory entry records size and file count, not an invented tree
   hash), action, test, actor, reason, and the regenerating command
   (`npx wrangler dev`, which recreates these directories on every
   invocation).
5. Deleted the quarantined copy. Confirmed the original path is gone too.

Nothing else was deleted. `.wrangler/state/` (including the anomalous
observability WAL) was left untouched -- not Tier 1, not this lane's to
purge.

## Dev server: running now, URL, LAN reachability

A fresh `wrangler dev --port 8787` is running as of this report (PID
28908, `workerd.exe`, parent `wrangler` CLI process). **Not stopped** --
per the explicit "NOTHING IS KILLED" instruction, this lane does not tear
down a process it started either, once it is healthy and answering
requests, without being asked to.

- **URL:** `http://127.0.0.1:8787` -- confirmed serving (HTTP 200, real
  page content).
- **LAN reachability: NO, as currently invoked.** `Get-NetTCPConnection`
  shows `LocalAddress: 127.0.0.1` -- loopback only -- confirmed a second
  way directly from `workerd.exe`'s own command line:
  `--socket-addr=entry=127.0.0.1:8787`. A phone on the same network could
  not reach this. Neither `package.json`'s `"dev": "wrangler dev"` script
  nor `playwright.config.ts`'s `command: "npx wrangler dev --port 8787"`
  passes an `--ip` flag anywhere in this repository -- wrangler's own
  loopback-only default is what is in effect everywhere it is invoked
  here. The machine's real LAN address is `10.88.111.5` (Wi-Fi adapter).
  To make the dev server reachable from a phone, the invocation would
  need `--ip 0.0.0.0` (bind all interfaces) or `--ip 10.88.111.5`
  (bind the specific LAN address) -- neither is configured anywhere in
  this repo today. This was not changed in this session (out of scope for
  a diagnosis; noted as the concrete, named gap behind "condition 4 has
  never once been done").

## What was not resolved

- The observability trace-store WAL anomaly (~4 MB, uncheckpointed,
  timestamped at the crash) is named, not cleared -- Tier 2, Mark's to
  decide. Whether it is a genuine contributing cause of the ProxyWorker
  disconnect, or an unrelated side effect of the same crash, was not
  established -- the evidence available (file timestamps, sizes) is
  correlational, not a traced causal chain inside wrangler's own runtime.
- The root mechanism inside wrangler `4.126.0`'s `ProxyController`/
  `#handleLoopbackCustomFetchService` that drops the runtime connection in
  the first place was not traced into wrangler's own bundled source --
  third-party code, and the actionable, reproducible finding (clean start
  reliable; recovery from a crashed state was not attempted with a live
  repro this session, since none was reproducible to test against) stands
  on its own without it.
- Phone-reachability itself (`--ip 0.0.0.0` or the LAN address) was
  identified as the concrete gap but not implemented or tested this
  session -- no `--ip` flag change was made to any script or config, and
  no phone or second machine was available in this environment to verify
  reachability empirically even if it had been.

## What would make it recur

Per the evidence gathered: run `wrangler dev`, drive it hard enough
(repeated full-page loads carrying this app's real asset payload, per
`playwright.config.ts`'s own note) for long enough, and its `ProxyWorker`
connection to `workerd` can drop with a bare "Network connection lost." A
single wrangler process in that state can sit alive-but-non-serving
indefinitely (inspector heartbeat continues; HTTP does not) until it is
stopped, and a NEW invocation started while the old one still holds the
port would appear stuck for a different, simpler reason (address already
in use) that looks identical from the outside. Clearing `.wrangler/tmp/`
between attempts removes one source of confusion (stale bundles) but is
not itself what fixed the port; a clean process start is what did. No
gate or mutation applies here -- this is an environmental/third-party
finding, not a change to this repository's own code.
