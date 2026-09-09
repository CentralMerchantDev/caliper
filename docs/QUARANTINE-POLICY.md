# QUARANTINE POLICY

Supersedes the flat "nothing is ever deleted" rule, at Mark's direction,
2026-09-09.

## Why it changed

The old rule existed to stop an agent destroying work it did not understand, and
it did that job. But it made no distinction between a file Mark wrote and a
`.git/index.lock` left behind by a crashed process. Both went to
`_TO-DELETE/`, which meant the folder filled with machine detritus nobody would
ever open — and, worse, a genuinely stale lock file blocked every commit in a
repository until a human noticed and intervened.

In Mark's words: the rule was *"to protect the system from deleting files that
it actually needed, or without reason, or the wrong reason."* It was never meant
to make him the manual garbage collector for his own tooling.

## The principle

**"Is this junk?" is never a judgement call.** A file may be purged only if it
matches a pattern on the closed list below *and* passes that class's test. If it
is not on the list, it is not purgeable — however obviously disposable it looks.
Extending the list is Mark's decision, not a lane's.

## Two tiers

**Tier 1 — PURGE-ELIGIBLE.** Matches the closed list, passes its test. Moved,
recorded in the ledger, then deleted. No confirmation needed.

**Tier 2 — EVERYTHING ELSE.** Moved to `_TO-DELETE/<reason>/`, recorded in the
ledger, and **retained** until Mark confirms an explicit list. Unchanged from the
old rule. This still covers all source, all documents, all assets, anything
tracked by git, and anything whose class you are not certain of. **Uncertainty
resolves to Tier 2**, always.

## The closed list — Tier 1, complete

| Class | Patterns | Test that must pass first |
|---|---|---|
| `git-lock` | `.git/index.lock`, `.git/*.lock`, `.git/refs/**/*.lock` | No `git` process running; file's mtime older than 2 minutes; `git status` succeeds after the file is moved aside |
| `git-tmp-object` | `.git/objects/**/tmp_obj_*` | No `git` process running; `git fsck --connectivity-only` clean afterwards |
| `regenerable-build-output` | `test/.built/`, `dist/`, `.wrangler/tmp/` | The single command that regenerates it is named in the ledger entry, and has been run successfully in this repository at least once |
| `installed-dependencies` | `node_modules/` | `package-lock.json` is committed and unmodified |

Nothing else. Not "temp files". Not "old drafts". Not "obviously generated".
Not `.log`, not `.bak`, not `.tmp` — those are Tier 2 until a class is written
for them here with its own test.

## Never Tier 1, whatever the pattern suggests

- Anything tracked by git that is not in a listed generated directory
- Anything under `public/`, `src/`, `docs/`, `test/` outside `test/.built/`
- Anything a person created, or that might carry information not reproducible
  by running a command
- Anything whose class you had to argue yourself into

## The ledger

`_TO-DELETE/LEDGER.jsonl`. Append-only, one JSON object per line, per action.
A purge without a ledger line did not happen legitimately.

```
{"ts":"2026-09-09T14:22:31.4Z","path":".git/index.lock","class":"git-lock",
 "bytes":0,"sha256":"e3b0c442...","action":"purged",
 "test":"no git process; mtime > 2 min; git status succeeded after move",
 "actor":"Mark, PowerShell","reason":"stale lock blocking every commit"}
```

Required fields: `ts`, `path`, `class`, `bytes`, `sha256`, `action`
(`purged` | `retained`), `test`, `actor`, `reason`.

**Why the hash matters.** For Tier 1 the bytes are gone, so the record is the
recovery: it says exactly what was removed, how big it was, and what it hashed
to — enough to prove a file was or was not a given thing, and enough to notice
if the same file keeps coming back. For Tier 2 the bytes are still in
`_TO-DELETE/` and the hash proves the retained copy is the one that was moved.

## Order of operations — move, verify, then purge

Never delete in place. Even Tier 1:

1. **Move** the file into `_TO-DELETE/<class>/`.
2. **Run the class's test.** If it fails, **move the file back** and report.
3. **Append the ledger line.**
4. **Then** delete the moved copy.

Step 2 is the whole point: the test runs against a repository that no longer has
the file, so a passing test is evidence the file was genuinely disposable rather
than an assumption that it was.

## Gates

1. A purge with no matching ledger line fails a test. Watch it red by purging
   without logging, then restore.
2. A ledger line whose `path` matches no pattern on the closed list fails a
   test. Watch it red with a fabricated entry, then restore.
3. `_TO-DELETE/` contents that are neither in the ledger nor Tier 2 fail a test.

## For lanes

Your instruction is unchanged in the case that matters: **you do not delete
Mark's work, and uncertainty resolves to Tier 2.** What has changed is that you
are no longer required to hand him a stale lock file and stop.
