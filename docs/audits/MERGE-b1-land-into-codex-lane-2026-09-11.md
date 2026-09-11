# Merge: `b1-land` into `codex-lane` — 2026-09-11

Authorised directly by Mark, this run — "THIS IS MARK'S AUTHORISATION TO
MERGE." Not a release: `main` is not touched, nothing is pushed, nothing is
deployed. A sync between two working branches.

---

## Pre-merge state

**Both lanes confirmed at clean stops** before anything was touched:

- `codex-lane` (`C:\Code\sandbox-spike-codex`, this worktree): `git status
  --short` shows only the established, deliberate `docs/pending-commits/*.txt`
  untracked-file convention (decisions `caliper-bld #1`/`#2`, both resolved
  in a prior session) — no uncommitted code, no staged changes.
- `b1-land`: checked via `git log --oneline -3 b1-land` from this worktree
  (no checkout, no access to its own separate working tree from here) — the
  last three commits end on a deliberate stopping point, `bd1a0f9`
  "Overnight audit log: HANDOVER section -- everything this run did, every
  gate's real state, what's next, and one thing nobody asked about."

**Hashes, recorded before the merge:**

| Branch | HEAD |
|---|---|
| `codex-lane` (pre-merge) | `6b590ffcf30e36f04b8985010095852b910a3055` |
| `b1-land` | `bd1a0f97bc75a4719f1ee9098c465a9312b0f0a3` |

**Backup branch created and confirmed:** `codex-lane-premerge-2026-09-11`,
pointing at `6b590ff` — the whole merge is revertible with one `git reset
--hard codex-lane-premerge-2026-09-11` if anything goes wrong.

---

## The conflict-resolution rule, stated once, applied per-conflict below

Per Mark's own instruction: `b1-land` is the NEW WORLD (board, generator,
roads, terrain, `city-render.js`'s world-building) and wins any conflict
about the world. `codex-lane` is buildings, props, kitbash, and the
interface, and wins any conflict in its own domain. A conflict that does
not fall clearly on one side is stopped on and asked about, not guessed or
split.
