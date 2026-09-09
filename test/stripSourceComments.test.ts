// Direct unit coverage for the general control docs/LESSONS.md's "a regex
// over source matches your comments too" entry asks for. The live,
// real-file half of this control's proof (a genuine comment-out mutation of
// public/nav-wheel.js, watched red, in a file other than the one that first
// found this bug) is recorded in this session's commit message and in
// test/navWheel.test.ts's own history -- not repeated here as a fixture,
// because a fixture proves the function; only the real file proves the fix.
import { test } from "node:test";
import assert from "node:assert/strict";
import { stripSourceComments } from "./stripSourceComments.ts";

test("strips a // line comment, keeps the code before it", () => {
  const out = stripSourceComments('const x = 1; // trackLiveRect(hub, cb)\nconst y = 2;');
  assert.doesNotMatch(out, /trackLiveRect/);
  assert.match(out, /const x = 1;/);
  assert.match(out, /const y = 2;/);
});

test("strips a single-line /* */ block comment", () => {
  const out = stripSourceComments('const x = 1; /* trackLiveRect(hub, cb) */ const y = 2;');
  assert.doesNotMatch(out, /trackLiveRect/);
  assert.match(out, /const x = 1;/);
  assert.match(out, /const y = 2;/);
});

test("strips a multi-line /* */ block comment and keeps line count stable", () => {
  const src = [
    'const a = 1;',
    '/* this describes what used to happen here:',
    '   trackLiveRect(navPadEl, (padRect) => {',
    '     inspectCardEl.style.left = padRect.left;',
    '   });',
    '*/',
    'const b = 2;',
  ].join('\n');
  const out = stripSourceComments(src);
  assert.doesNotMatch(out, /trackLiveRect/);
  assert.equal(out.split('\n').length, src.split('\n').length, 'stripping must not change the line count');
  assert.match(out, /const a = 1;/);
  assert.match(out, /const b = 2;/);
});

test("leaves real, uncommented code untouched", () => {
  const src = 'trackLiveRect(hub, (r) => { doThing(r); });';
  assert.equal(stripSourceComments(src), src);
});

test("the exact shape that defeated the unprotected check in test/navPad.test.ts: a comment reproducing the call's own syntax, sitting beside a renamed real call", () => {
  // Reproduces docs/LESSONS.md's 2026-09-09 entry: the real call was renamed
  // (simulating the mutation-test's rename), and a comment describing the
  // mechanism in near-identical call syntax remained a few lines above it --
  // exactly index.html's own history before the comment there was reworded.
  const src = [
    '// the bottom module script now calls trackLiveRect(navPadEl, cb) to',
    '// track the pad instead of guessing its corner.',
    'trackLiveRectRENAMED(navPadEl, (padRect) => {',
    '  inspectCardEl.style.left = padRect.left;',
    '});',
  ].join('\n');

  // The unprotected shape of the original bug: matching raw source directly.
  assert.match(src, /trackLiveRect\(navPadEl,/, 'sanity check: the raw text does contain the pattern, via the comment');

  // The protected shape: after stripping, the comment's copy is gone and only
  // the (renamed, real) call would need to match -- so the same regex now
  // correctly reports no match, where the raw check wrongly reported one.
  const stripped = stripSourceComments(src);
  assert.doesNotMatch(stripped, /trackLiveRect\(navPadEl,/, 'the stripped text should not match through the comment');
});
