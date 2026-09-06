# Run attribution — derived, not measured

**These are the models THE CODE SPECIFIED on the date a run completed, not proof
of what the API actually served.** No per-stage model id was ever recorded in
the changelog ledgers themselves; PART 7b/E3 fixed that going forward
(`ChangeRecord.completedAt`/`reason`, see `src/changePipeline.ts:184` and
`src/index.ts:626`), but backfilling a measurement that was never taken is not
on offer. Every routing value below is *derived* by reading a run's
`completedAt` and asking what `GROUND_MODEL`, `IMPLEMENT_MODEL`, `FIX_MODEL`,
and `REVIEW_MODEL` (the reviewer constant, in `src/openai.ts`) were set to in
the git history at that moment. A deploy can lag a commit — this repo has no
CI/CD workflow (`.github/workflows` doesn't exist) and Cloudflare's own
deployment log (`wrangler deployments list`, checked read-only below) only
retains its 10 most recent entries, which for this account start at
2026-09-03T08:25:56Z. There is no evidence source in reach that timestamps an
actual deploy on 2026-08-29, the date every attributable run below completed.
Anyone citing these runs carries that caveat with them.

## What was actually found

**22 changelog records exist, not 19.** Two pools, found by two different
reads:

- **19** in the local `.wrangler` dev KV state
  (`.wrangler/state/v3/kv/miniflare-KVNamespaceObject/...sqlite`, namespace id
  `f787686ed1944cbf88804507ba5635a7`, keys `changelog/*`). None of these 19
  carry a `completedAt` field at all — they predate the `ChangeRecord` shape
  that `recordTerminalRun` (`src/changePipeline.ts:272`) writes today. This
  matches the code's own comment at `src/index.ts:626`: *"Records written
  before this feature (missing completedAt/reason)."* Per the brief: no
  `completedAt` means **unattributable**, not a gap to fill.
- **3** in the live production KV (same namespace id, read remotely via
  `wrangler kv key list --remote` / `wrangler kv key get --remote`, both
  read-only, zero spend). All three of these do carry `completedAt`.

The task said 19; the honest count of *changelog/* records reachable read-only
is 22, of which only the 3 production ones carry the field the derivation
depends on. Reporting 19 would have quietly dropped the only 3 records this
document can actually say anything about.

## Method

1. Read each record's `completedAt` (ms epoch, production records only).
2. Walked `git log -p -- src/changePipeline.ts` and `git log -p --
   src/openai.ts` chronologically, extracting the literal value of
   `GROUND_MODEL`, `IMPLEMENT_MODEL`, `FIX_MODEL` (changePipeline.ts) and
   `REVIEW_MODEL` (openai.ts) at every commit that touched either file.
3. For a given `completedAt`, the "in force" routing is whatever the most
   recent commit *before* that timestamp set it to.

**Routing history has exactly one transition, ever**, across both files:

| Commit | Date (America/New_York) | GROUND_MODEL | IMPLEMENT_MODEL | FIX_MODEL | REVIEW_MODEL |
|---|---|---|---|---|---|
| `3821592` (initial commit) | 2026-08-27 16:36:18 | *(not yet defined — no distinct ground/fix routing existed)* | `claude-sonnet-5` | *(not yet defined)* | `gpt-5.5` |
| `2370b1d` | 2026-08-28 03:17:18 | *(unchanged, still undefined)* | `claude-sonnet-5` | *(unchanged, still undefined)* | `gpt-5.5` |
| **`0d3cec3`** — "Controls: new routing table, re-derived ceiling, weekly cap, route-level guards" | **2026-08-28 11:54:38** | `claude-haiku-4-5` (new) | `claude-haiku-4-5` (changed from `claude-sonnet-5`) | `claude-sonnet-5` (new) | `gpt-5.3-codex` (changed from `gpt-5.5`) |
| every commit from `0d3cec3` through current HEAD (`f2839c2`, 2026-09-06 10:31:22) | — | `claude-haiku-4-5` | `claude-haiku-4-5` | `claude-sonnet-5` | `gpt-5.3-codex` |

Verified line-by-line at every one of the 34 commits touching
`src/changePipeline.ts` and all 11 touching `src/openai.ts` — the four values
did not move again after `0d3cec3`. Current values, for reference: lines 54-56
of `src/changePipeline.ts` and line 16 of `src/openai.ts`.

## Production runs (3) — derived and AMBIGUOUS

All three completed on 2026-08-29, comfortably inside the single stable
routing window opened by `0d3cec3` (2026-08-28 11:54:38) and undisturbed by
the next commit to touch either file (`82fdb81`, 2026-08-29 16:23:37, which
lands *after* every one of these three `completedAt` times and changed
nothing in the routing constants anyway). So the routing-changed-mid-window
trigger for AMBIGUOUS does **not** apply here — there is no nearby transition
to be uncertain about.

They are marked AMBIGUOUS anyway, for the second, independent reason the brief
names: **the deploy date cannot be established.** `wrangler deployments list`
was queried read-only and its earliest retained entry is
2026-09-03T08:25:56Z — five days after these runs completed, and the tool has
no pagination flag to reach further back. No CI/CD config exists in this repo
to infer auto-deploy-on-push. There is therefore no artifact in reach that
proves the code live in the Worker at 2026-08-29 13:32–15:39 actually matched
commit `0d3cec3`'s routing table, as opposed to something older or something
that failed to deploy. Per instruction: not picking the likelier one — the
value below is the git-derived candidate, carried with an AMBIGUOUS flag, not
asserted as confirmed.

| runId | completedAt (UTC) | outcome | totalCostUsd | GROUND | IMPLEMENT | FIX | REVIEW (reviewer) | Routing read from | Status |
|---|---|---|---|---|---|---|---|---|---|
| `38708e57-d689-4a17-8e92-c2d1ad45c6ba` | 2026-08-29T17:32:17.867Z | abandoned-after-error | $0.04095 | claude-haiku-4-5 | claude-haiku-4-5 | claude-sonnet-5 | gpt-5.3-codex | `0d3cec3` (changePipeline.ts:47-49) / `0d3cec3` (openai.ts:15) | AMBIGUOUS — deploy date unconfirmed |
| `cb4a7188-59fd-4c4c-a8a3-c39853926b87` | 2026-08-29T18:51:26.979Z | abandoned-after-error | $0.08195 | claude-haiku-4-5 | claude-haiku-4-5 | claude-sonnet-5 | gpt-5.3-codex | `0d3cec3` (changePipeline.ts:47-49) / `0d3cec3` (openai.ts:15) | AMBIGUOUS — deploy date unconfirmed |
| `1cc1483c-c2e2-4a77-a359-f609c1cf1d54` | 2026-08-29T19:39:35.551Z | abandoned-after-error | $0.170935 | claude-haiku-4-5 | claude-haiku-4-5 | claude-sonnet-5 | gpt-5.3-codex | `0d3cec3` (changePipeline.ts:47-49) / `0d3cec3` (openai.ts:15) | AMBIGUOUS — deploy date unconfirmed |

All three carry `"reason": "It failed partway through and was not retried."`
in the stored record.

## Local `.wrangler` dev KV runs (19) — unattributable

No `completedAt` field exists on any of these 19 records (confirmed by
enumerating every top-level key on every record — see below). Per the brief,
that makes them unattributable outright; no git cross-reference was attempted
because there is no timestamp to cross-reference against.

| runId | changeRequest (truncated) | outcome | totalCostUsd | completedAt |
|---|---|---|---|---|
| `b99d3894-df75-4558-8ba9-27ea28ba4d2f` | Add a pet that needs feeding. If the pet goes unfed for too long... | refused-verification | $0.172495 | *(field absent)* |
| `6ad1cdd2-5059-4213-88a5-8480bd77c155` | Add illness triggered by low hygiene | refused-verification | $0.151633 | *(field absent)* |
| `2f144b26-8939-43ca-a2c0-80d4541a120f` | Add a pet that needs feeding | refused-verification | $0.146017 | *(field absent)* |
| `87f7901c-8b62-4601-869b-6d7cc6f5afa6` | Add a pet that needs feeding | shipped | $0.17825 | *(field absent)* |
| `3f09d6ae-b474-4cd0-99bc-797818e8b5fa` | Add a second sim who can socialise | shipped | $0.117487 | *(field absent)* |
| `e36f69fc-d581-4b1a-b7c2-571e8b2a71a7` | Add a second sim who can socialise | shipped | $0.10916 | *(field absent)* |
| `2e9dc6ec-ffb7-4bc9-a417-04c5400656a0` | Add a pet that needs feeding | refused-verification | $0.105478 | *(field absent)* |
| `27af47b9-516e-41cc-8e39-7deef2949fa1` | Add a pet that needs feeding | refused-verification | $0.108716 | *(field absent)* |
| `95d610a4-44d0-46c8-b67c-26df2f34ed04` | Add a pet that needs feeding | refused-verification | $0.126909 | *(field absent)* |
| `0f899ce3-49d0-4a7a-9ef2-fa6a707de091` | Add a pet that needs feeding | refused-verification | $0.133659 | *(field absent)* |
| `c62de596-73c8-43d1-896a-7800f3e53888` | Add a second sim who can socialise | refused-verification | $0.068838 | *(field absent)* |
| `d3e863b7-00b7-4451-b893-1815479633ee` | Add a night shift that pays more but drains energy faster | refused-verification | $0.061871 | *(field absent)* |
| `2a0b087d-3a80-45c9-92b6-1886a83cde6d` | Add illness triggered by low hygiene | refused-verification | $0.112796 | *(field absent)* |
| `7225b995-1d32-4371-9e53-5792eaa7a75c` | Add a savings goal that buys a better bed | refused-verification | $0.067078 | *(field absent)* |
| `878fc635-2a20-480b-be75-2f8779b838ab` | Add a pet that needs feeding | refused-verification | $0.121734 | *(field absent)* |
| `cedea8ab-795e-463c-9bef-0bdf9f6a3b53` | Add a pet that needs feeding | refused-verification | $0.175314 | *(field absent)* |
| `fee97c19-ea3c-467d-997a-e9a8f975fa97` | Add a second sim who can socialise | refused-verification | $0.257771 | *(field absent)* |
| `3a160c53-4680-4070-8494-0210365f4106` | Add a night shift that pays more but drains energy faster | refused-verification | $0.115083 | *(field absent)* |
| `bf0eae56-160e-4e8b-802e-bcd97de81766` | Add illness triggered by low hygiene | refused-verification | $0.111996 | *(field absent)* |

## Tally

- **Attributed (confirmed):** 0
- **Attributed but AMBIGUOUS (derived from a stable single-transition
  routing history, deploy timing unconfirmed):** 3 — all three production
  records
- **Unattributable (no `completedAt`):** 19 — all local dev KV records

22 records total, not 19. No file other than this one was written or
modified. No test suite was run. No deploy was made. No live API call was
made — every read above was either a local sqlite read or a `wrangler kv`
read-only call against KV, which is free and does not touch
`ANTHROPIC_API_KEY`/`SPEND_KV`.
