# Where CALIPER stands — 1 Sep 2026

Five commits overnight: four audit rounds and a test-coverage fix. `git log -5`
has the detail; this is what you need before you deploy.

## Deploy

Run from `C:\Code\sandbox-spike` — I can't deploy from the sandbox:

```
npm test          # 379 node tests + 7 worker tests, and it type-checks first now
npx wrangler deploy
```

`npm test` now runs `tsc --noEmit` first. Two things I could NOT run here:

- **`vitest`** — `node_modules` has Windows-native rolldown bindings, so the
  7 worker tests wouldn't start under Linux. I rewrote two of them (they were
  asserting a response shape that had changed, and testing a dev-only code path
  instead of the production one). **They have never been executed.** Run
  `npx vitest run` before you deploy.
- **`npm install`** timed out during cleanup after adding `acorn`. It's in
  `package.json` and the Worker bundles (`wrangler deploy --dry-run` passes),
  but re-run `npm install` on your machine to be sure the lockfile is right.

## Two things about your repo

- **It's mid-`git revert`.** That was already true when I started; I didn't
  touch it. `git status` will keep saying so until you run `git revert --quit`
  (which changes no files) or `--abort`.
- **Stale lock files** in `.git` that the sandbox can't delete —
  `index.lock`, `HEAD.lock`, `refs/heads/main.lock`. Everything is committed,
  but git will complain until you remove them. They're empty/stale.

## The thing worth knowing

The check that stops model-written code executing when the world loads was
**defeated three times by three consecutive audits.** Not the same bug — each
fix worked, and the next audit found the same idea spelled differently:

| round | payload that got through |
|---|---|
| 1 | `const _x = fetch(...)` — a declaration keyword was enough |
| 2 | `function f(){} evil()` — only the line prefix was examined |
| 3 | `const _a = () => {}; evil()` — the fix covered `function`, not `const` |
| 4 | `const a = () => {}, b = evil()` — and a regex after `)`, and semicolon-free source |

Round 3's version also **rejected `public/buildings.js`** — your own style, an
object literal whose values are arrows. A check that refuses the project's own
idiom is one that gets deleted.

Each round I fixed the instance and kept the approach. The approach was the bug:
deciding what JavaScript does by reading its characters is a parser, and one
written by accident is wrong in ways nobody has enumerated. It parses now
(acorn, 560 KB, no deps). 45 attack shapes caught, 23 ordinary sources allowed,
zero false positives, and six tests that go through the front door rather than
calling the function directly — because green unit tests on a function nobody
proved was wired up is exactly the shape that let this run for four rounds.

**Worth saying in an interview.** Not "I built a sandbox" — "I built one, an
audit broke it, I fixed the instance instead of the class, and it broke twice
more before I stopped patching and used a parser."

## Also fixed, briefly

- **A human's "Approve" was recorded as a rejection.** The pipeline required an
  acknowledgement key and *nothing in the repo ever wrote it* — one grep hit,
  the read. The UI showed the button.
- **The verification harness could be told what to say.** The candidate is
  spliced in above the comparator, so `Object.is = () => true` made 9/9 and 5/5
  pass. Comparators are captured above the splice and declared `const` (so
  reassigning them throws). `Math.abs` and `JSON.stringify` were reachable too.
- **`/live-status` reported the per-IP count from a store the enforcer never
  writes**, so it said "0 of 3 used" until the 429 landed.
- **`recorded-run.json`** — 117 KB, served, referenced by nothing. It's the
  zero-spend path now: a real run replayed with its real costs, offered exactly
  when the caps bite. Labelled a recording throughout.
- **Page truth**: 450 cycles → 387 (450 appears in no document); the retracted
  quality-equivalence claim is now *on* the page next to the finding; the
  missing frontier-model row added to the parity table; three claims the code
  doesn't support removed.
- **City build 12s → 4.8s.** Same roads, same connectivity.

## Not done, deliberately

- **`criteriaDryRun.ts` is still not wired in.** It catches criteria that are
  already true of the unmodified world — so a run can report "criteria 5/5" for
  five checks that couldn't fail. Wiring it needs executable baseline functions,
  i.e. a sandbox load per run and a real change to `groundAndPlan`, not a
  one-line call. Said plainly in the file rather than left to be discovered.
- **2 settlements still stranded** (Redcliff, coastal-8) — recorded as a budget
  in `test/cityConnectivity.test.ts`. Layout decision, not a bug.
- **`generateWorld` still runs 4.8s on the main thread** before first paint.
  The real fix is precomputing the plan at build time.

## One correction to an audit

Round 2's audit reported Sonnet 5's introductory pricing as expired and every
cost figure 50% low. I checked Anthropic's pricing page: the increase was
cancelled and $2/$10 *is* the standard price. Acting on that finding would have
made every published number wrong. The stale comment was the risk, not the
number — there's a test pinning the prices now, with the date they were checked.
