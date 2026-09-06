// RUNS UNTRUSTED, MODEL-AUTHORED CODE. THIS PROCESS MUST NEVER HOLD A SECRET.
//
// Found by a blind audit (docs/audits/UMAA-I5-L-J4.md, Finding 1, HIGH): the
// original supervised-generate.mjs ran a real model's response through
// `new Function` in the SAME process that had just read
// `process.env.ANTHROPIC_API_KEY` -- and public/model-forge.js's own
// scanSource() denylist, the only thing standing between that response and
// the process, is defeated by a standard JS unicode-escape identifier (the
// audit built and ran a working proof-of-concept: `process` parses to
// the identifier `process` but never contains the literal substring
// `"process"`, so `.includes("process")` never fires). model-forge.js's own
// comment already says a denylist "invites someone to rely on it" -- this
// script is what NOT relying on it looks like.
//
// THIS IS STILL `new Function`, NOT A REAL SANDBOX. Node's own `vm` module
// documentation says plainly that `vm` is not a security mechanism either,
// so switching to it would have been a better-looking fix that changed
// nothing real. What genuinely changes here is architectural, not
// in-process: this process is spawned by supervised-generate.mjs with an
// EXPLICIT ALLOWLIST environment (PATH/SystemRoot/TEMP only -- see that
// file's own spawn call), so `process.env.ANTHROPIC_API_KEY` is not merely
// hidden from untrusted code here, it DOES NOT EXIST in this process at
// all. This closes the specific chain the audit demonstrated (read the key,
// execute the response, exfiltrate); it is not a claim that arbitrary
// model-authored code is safe to run, which is exactly why this script's
// only job is to report a verdict and exit, never to persist, register, or
// apply anything (supervised-generate.mjs's own header already draws that
// boundary one step further out).
//
// "A SUCCESSFUL SANDBOX ESCAPE IN THIS PROCESS HAS NOTHING TO STEAL" WAS
// WRITTEN HERE ONCE, AND IT WAS FALSE. A blind audit following K3 (2026-09-
// 06) found `new Function` gives model-authored code the full Node API
// surface regardless of what is or isn't in `process.env` -- a scrubbed
// environment stops the *specific* key-theft chain, not filesystem or
// network access, which do not depend on any environment variable at all.
// Demonstrated live: `process.getBuiltinModule("fs").readFileSync(...)`
// read an arbitrary file and returned its contents through this script's
// own verdict channel. Real fix, verified the same way the finding was --
// by trying to defeat it, not by reading it and nodding: this process is
// launched with Node's `--permission` flag, `--allow-fs-read` scoped to
// only the two files this child legitimately needs, and no
// `--allow-fs-write` / `--allow-child-process` / `--allow-worker` at all
// (see verify-untrusted-geometry-caller.mjs's own spawn call). Outbound
// network is NOT covered -- this Node version has no `--allow-net` flag, so
// `fetch`/`http` remain reachable from inside this process. That is a real,
// named, currently-open gap, not a claim this closes it.

let input = "";
process.stdin.setEncoding("utf8");
for await (const chunk of process.stdin) input += chunk;

let source, footprint, threeHref, modelForgeHref;
try {
  ({ source, footprint, threeHref, modelForgeHref } = JSON.parse(input));
} catch (e) {
  process.stdout.write(JSON.stringify({ ok: false, stage: "transport", reason: `could not parse stdin: ${e && e.message}` }));
  process.exit(0);
}

const THREE = await import(threeHref);
const { verifyModelSource } = await import(modelForgeHref);

const evaluate = (src) => new Function(`"use strict"; return (${src});`)();
const verdict = verifyModelSource(source, footprint, evaluate, THREE);

// `geometry` is a live THREE object -- it cannot cross a process boundary as
// JSON, and this script has no business handing it back anyway: reporting a
// verdict is the whole job (see this file's own header).
const { geometry, ...reportable } = verdict;
process.stdout.write(JSON.stringify(reportable));
