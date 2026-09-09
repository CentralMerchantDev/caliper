# Decisions for Mark

Per `docs/OVERNIGHT-RUN.md`'s decision queue: things a lane will not stop to
wait on, but that are genuinely Mark's call. Each entry: the question, the
options, the recommendation and why, what was done in the meantime, and how
expensive the decision is to reverse.

---

## 1. The uncommitted `package.json` `allowScripts` block — open across three runs

**The question.** `package.json` has carried this uncommitted change since
before RUN 1:

```diff
+  "allowScripts": {
+    "esbuild@0.28.1": true,
+    "workerd@1.20260815.1": true,
+    "workerd@1.20260825.1": true
+  }
```

Was this intentional, and should it be committed, completed, or reverted?

**What was found tonight, not just re-flagged.** This field's exact shape
(`"pkgname@version": true`, top-level `allowScripts` key) matches
`@lavamoat/allow-scripts`, a real, known npm supply-chain security tool that
gates which dependencies' `postinstall`/`preinstall` scripts are allowed to
run — esbuild and workerd both ship native-binary-fetching postinstall
scripts, which is exactly the class of script that tool exists to gate.
**But it is currently inert**: `package.json`'s own `scripts` block has no
`postinstall` entry, and neither `@lavamoat/allow-scripts` nor `@lavamoat/*`
appears anywhere in `dependencies` or `devDependencies`. Nothing in this
repository reads or enforces this field (confirmed by grep across
`public/`, `src/`, `scripts/`, `test/` and `package.json` itself). Right now
it does nothing, in either direction — it neither blocks nor approves any
script, because the tool that would consult it was never wired in.

**Options:**
1. **Complete the wiring** — add `@lavamoat/allow-scripts` as a
   devDependency and a `"postinstall": "allow-scripts"` script, so the
   existing allowlist starts doing the job its shape suggests it was meant
   for.
2. **Remove the field** — if it was a one-off, abandoned experiment, delete
   it; it currently has zero effect and is dead configuration.
3. **Leave it exactly as it is** and revisit later.

**Recommendation: option 2 (remove) unless there was a specific reason to
adopt this tool**, because an allowlist that looks like it's gating
something but silently isn't is worse than no allowlist — the next person
to read `package.json` (including a future lane) will reasonably assume
postinstall scripts are being screened, when none are. If real supply-chain
gating was the goal, option 1 is the honest way to get it; a half-adopted
security control is its own kind of risk.

**What was done in the meantime.** Nothing — left exactly as found, in
every commit tonight and in RUN 1/RUN 2, by naming explicit paths rather
than `git add -A`.

**Reversal cost.** Trivial either way — a three-line JSON block with no
downstream code depending on its presence or absence.

---

## 2. The 10 untracked `docs/pending-commits/*.txt` files — pre-dating this lane's work

**The question.** Ten `.txt` files sat untracked in `docs/pending-commits/`
at the start of RUN 1, before any work this lane did:
`audit-fix-namespace-and-reexport.txt`, `i1-extraction.txt`,
`i1-reverse-map.txt`, `i2-gate.txt`, `i3-module-map.txt`,
`k6-buildings.txt`, `k6-culling-gate.txt`, `k6-trim-color.txt`,
`k7-1-trim-atlas-patch.txt`, `reachability-upgrade.txt`. Should these be
archived, deleted, or left as they are?

**What was found, checked across two runs, not assumed.** Every one of
these is the `-F` message source for a commit that already landed — spot
checked in RUN 1 (`k7-1-trim-atlas-patch.txt` is byte-identical to commit
`79f0bd1`'s real message) and confirmed as a pattern in `git log`: this
repository's own history already contains commits like `922723c` ("Add the
two pending-commit message files that never got staged") and `41a10b8`
("Keep the pending-commit message with the rest") — both explicitly
*keeping* these files after use, not deleting them. This is an established,
deliberate repository convention (`CLAUDE.md`: "Written to
`docs/pending-commits/` and committed with `git commit -F`"), not
accidental clutter.

**Per `docs/QUARANTINE-POLICY.md` (pulled from `b1-land` onto this branch
tonight, see item 0/5's own commit)**: these are **Tier 2** —
`docs/pending-commits/` is under `docs/`, outside the four Tier-1 closed-list
classes (`git-lock`, `git-tmp-object`, `regenerable-build-output`,
`installed-dependencies`), and the policy states plainly: "Anything under
`public/`, `src/`, `docs/`, `test/` outside `test/.built/`" is never Tier 1,
"whatever the pattern suggests." They are not purge-eligible by this policy
regardless of how disposable they look.

**Options:**
1. **Leave them exactly as they are, untracked** — matches this repo's own
   established practice for every file in this category found so far.
2. **`git add` and commit them** — turns "untracked convention" into
   "tracked history," a real, if small, repository-shape change.
3. **Move to `_TO-DELETE/pending-commits-archive/`** per the Tier 2 process
   (moved, ledgered, retained) — technically compliant, but the policy's own
   examples are about accidental machine detritus (lock files, tmp objects),
   not deliberately-kept message sources.

**Recommendation: option 1.** These aren't uncertain or unclassified files
needing quarantine — they're a known, named, working convention with
multiple precedent commits explicitly choosing to keep them. Quarantining
them would be applying Tier 2 process to something that was never actually
at risk of being mistaken for junk.

**What was done in the meantime.** Nothing — left untracked, exactly as
found, not touched by any commit across RUN 1, RUN 2, or tonight.

**Reversal cost.** Zero — these are plain text files with no code
dependency; committing or archiving them later is a single, reversible `git
add`/`git mv` whenever Mark decides.
