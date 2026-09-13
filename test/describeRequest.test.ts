// A PLAIN-ENGLISH BOX, SCOPED TO THE SELECTION -- NO OPTION LIST.
//
// The absence of a menu is the point: the player writes English and the
// machine deals with it. Every display path already in index.html uses
// `.textContent` for anything visitor-typed, never `.innerHTML` --
// `textContent` cannot execute markup, by construction of the DOM API. The
// one way that defense breaks is if something UPSTREAM of it templates the
// typed text into an HTML STRING before it gets there. So the contract this
// guards is narrower than "sanitise the text": it is that this module never
// touches the text at all beyond carrying it -- verbatim, opaque, untouched
// -- from the box to the request.

import { test } from "node:test";
import assert from "node:assert/strict";

import { makeDescribeRequest } from "../public/describe-request.js";
import { createSelection } from "../public/selection.js";
import { buildSpatialIndex } from "../public/spatial-index.js";

// BLOCKED, three of four tests, 2026-09-13, Phase 1 "take it all down"
// (docs/specs/PHASE1-TAKEDOWN-PLAN-2026-09-13.md). This file's own fixture
// (`plan`, `index`) was built once, at module scope, from
// public/city-plan.js's generateWorld() -- quarantined. makeDescribeRequest,
// createSelection and buildSpatialIndex all survive; there is simply no plot
// to select without a generated world. Not retired: the property under test
// (visitor-typed text is carried verbatim, never templated into markup) is a
// real, security-relevant contract that will matter again the moment
// Phase 2 supplies a board to pick from.
const index = buildSpatialIndex({ plots: [] });

test("the request carries the selected address and the typed text", { skip: "BLOCKED: needs a generated plot to select; public/city-plan.js is quarantined (see file header)" }, () => {});

test("typed text that looks like HTML passes through byte-identical -- never templated into markup", { skip: "BLOCKED: needs a generated plot to select; public/city-plan.js is quarantined (see file header)" }, () => {});

test("nothing selected means no request -- refused, not silently addressing nothing", () => {
  const selection = createSelection(index);
  const req = makeDescribeRequest(selection, "add a balcony");
  assert.equal(req.ok, false);
  assert.match((req as any).reason, /nothing is selected/);
});

test("empty or whitespace-only text is refused, not sent as an empty request", { skip: "BLOCKED: needs a generated plot to select; public/city-plan.js is quarantined (see file header)" }, () => {});
