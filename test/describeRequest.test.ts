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
import { generateWorld } from "../public/city-plan.js";
import { LandField, makeHeightAt } from "../public/terrain.js";

const heightAt = makeHeightAt(new LandField(16));
const plan = generateWorld(heightAt);
const index = buildSpatialIndex(plan);

function selectedOn(plot: any) {
  const selection = createSelection(index);
  selection.pick((plot.xMin + plot.xMax) / 2, (plot.zMin + plot.zMax) / 2);
  return selection;
}

test("the request carries the selected address and the typed text", () => {
  const plot = plan.plots.find((p: any) => p.className !== "PARK") as any;
  const selection = selectedOn(plot);
  const req = makeDescribeRequest(selection, "make this taller");
  assert.equal(req.ok, true);
  assert.equal((req as any).address, plot.id);
  assert.equal((req as any).text, "make this taller");
});

test("typed text that looks like HTML passes through byte-identical -- never templated into markup", () => {
  const plot = plan.plots.find((p: any) => p.className !== "PARK") as any;
  const selection = selectedOn(plot);
  const dangerous = '<img src=x onerror="alert(document.cookie)">';
  const req = makeDescribeRequest(selection, dangerous);
  assert.equal(req.ok, true);
  assert.equal((req as any).text, dangerous, "the typed text was altered -- something on this path touched it instead of only carrying it");
});

test("nothing selected means no request -- refused, not silently addressing nothing", () => {
  const selection = createSelection(index);
  const req = makeDescribeRequest(selection, "add a balcony");
  assert.equal(req.ok, false);
  assert.match((req as any).reason, /nothing is selected/);
});

test("empty or whitespace-only text is refused, not sent as an empty request", () => {
  const plot = plan.plots.find((p: any) => p.className !== "PARK") as any;
  const selection = selectedOn(plot);
  for (const text of ["", "   ", "\n\t"]) {
    const req = makeDescribeRequest(selection, text);
    assert.equal(req.ok, false, `"${JSON.stringify(text)}" should have been refused`);
  }
});
