// A WORLD IS A SEED PLUS A STACK OF LAYERS.
//
// These tests are written against the FUTURE this model exists for, not just
// tonight's edit. Each one is a thing the vision needs and the old
// module-singleton world could not do:
//
//     a player's own world     a clone of someone else's
//     a world inside a world   an edit that survives a reload
//     an edit with an author   undo
//     two people editing       removing exactly your own work
//
// If any of these is not true, the model is wrong now and expensive to fix
// later, which is the whole reason it is going in before anything writes to
// the world.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  createWorldModel,
  worldFromJSON,
  validateLayer,
  validateEdit,
  layerFrom,
  LAYER_OPS,
} from "../public/world-model.js";

const edit = (over: any = {}) => ({ address: "block-146-1100-p0", op: "retint", payload: { color: 0xff00ff }, ...over });
const layer = (over: any = {}) =>
  layerFrom({ id: "l1", author: "mark", edits: [edit()], ...over });

// ---------------------------------------------------------------------------
// A layer is data, and refused if it is not
// ---------------------------------------------------------------------------

test("a layer must be plain data that survives being stored and sent", () => {
  // This is the constraint the whole feature list rests on. A layer holding a
  // function or a mesh could not be saved, shared, cloned or attributed, and
  // the first time we wanted to send someone a world we would be rewriting it.
  const l = layer();
  assert.equal(validateLayer(l), null, `a well-formed layer was refused: ${validateLayer(l)}`);

  // The real check: a layer holding something LIVE must be refused by
  // validateLayer, not merely happen to serialise in this test. A closure, a
  // mesh or a class instance would break storing, sharing, cloning and
  // attribution all at once -- and would do it silently.
  const live: any = layer();
  live.edits[0].payload = { color: 1, onApply: () => {} };
  const refused = validateLayer(live);
  assert.ok(refused, "a layer carrying a function was accepted as plain data");

  const circular: any = layer();
  circular.self = circular;
  assert.ok(validateLayer(circular), "a layer that cannot be serialised was accepted");
});

test("a layer without an author is refused, because authorship is not bookkeeping", () => {
  // A world made of other people's layers has to know whose is whose -- to
  // credit it, to price it, and to let someone remove exactly their own.
  assert.match(validateLayer(layer({ author: "" }))!, /author/);
});

test("a layer with no edits is refused, because it changes nothing", () => {
  assert.match(validateLayer(layer({ edits: [] }))!, /changes nothing/);
});

test("an edit needs an address and a known op", () => {
  assert.match(validateEdit({ ...edit(), address: "" })!, /address/);
  assert.match(validateEdit({ ...edit(), op: "explode" })!, /unknown op/);
  for (const op of LAYER_OPS) {
    // Each op must state what it needs; a payload-less op would apply as a
    // silent no-op, which is the "absence nobody can see" failure again.
    const bad = validateEdit({ address: "a", op, payload: undefined });
    if (op !== "remove") assert.ok(bad, `op "${op}" was accepted with no payload`);
  }
});

test("a malformed layer handed to the constructor is REPORTED, not silently dropped", () => {
  // A stored layer that quietly fails to load is somebody's work vanishing
  // from their world with no message. That has to be visible.
  const w = createWorldModel({ seed: "s", layers: [layer(), layer({ id: "bad", author: "" })] });
  assert.equal(w.layers().length, 1);
  const rejected = w.rejected();
  assert.equal(rejected.length, 1);
  assert.equal(rejected[0].id, "bad");
  assert.match(rejected[0].reason, /author/);
});

// ---------------------------------------------------------------------------
// The things the vision needs
// ---------------------------------------------------------------------------

test("an edit survives a reload -- the whole world round-trips as JSON", () => {
  const w = createWorldModel({ seed: "harbour-of-saint-elms" });
  w.add(layer());
  const stored = JSON.stringify(w.toJSON());

  const back = worldFromJSON(stored);
  assert.equal(back.seed, "harbour-of-saint-elms");
  assert.equal(back.layers().length, 1);
  assert.equal(back.resolve("block-146-1100-p0").retint.color, 0xff00ff);
});

test("undo is dropping a layer, and it takes exactly that layer's work", () => {
  const w = createWorldModel({ seed: "s" });
  w.add(layer({ id: "mine", edits: [edit()] }));
  w.add(layer({ id: "theirs", author: "someone", edits: [edit({ address: "other-plot" })] }));

  assert.equal(w.remove("mine").ok, true);
  assert.equal(w.layers().length, 1);
  assert.equal(w.resolve("block-146-1100-p0").retint, undefined, "removing a layer left its edit behind");
  assert.ok(w.resolve("other-plot").retint, "removing one layer took another's work with it");
});

test("a clone is the same base and a copy of the work, not a copy of the geometry", () => {
  // What makes "clone this world and let me build on it" a feature rather than
  // an infrastructure project: a shared world is a seed and some JSON.
  const w = createWorldModel({ seed: "original" });
  w.add(layer());
  const c = w.clone("my-copy");

  assert.equal(c.seed, "my-copy");
  assert.equal(c.layers().length, 1);

  // And they are genuinely independent afterwards -- including the CONTENTS
  // of the layers, not just how many there are. Sharing the layer objects
  // would mean editing your copy silently edits the world you copied from,
  // which is the worst possible version of this feature.
  c.add(layer({ id: "l2", edits: [edit({ address: "another" })] }));
  assert.equal(w.layers().length, 1, "editing the clone changed the original");
  assert.equal(c.layers().length, 2);

  const mine = c.layers()[0];
  mine.edits[0].payload.color = 0x123456;
  mine.author = "someone-else";
  assert.equal(w.resolve("block-146-1100-p0").retint.color, 0xff00ff, "the clone shares layer objects with the original");
  assert.equal(w.layers()[0].author, "mark", "mutating a cloned layer changed the original's author");
});

test("two authors can edit the same world without touching each other's work", () => {
  const w = createWorldModel({ seed: "shared" });
  w.add(layerFrom({ id: "a1", author: "mark", edits: [edit({ address: "plot-a" })] }));
  w.add(layerFrom({ id: "b1", author: "someone", edits: [edit({ address: "plot-b" })] }));

  assert.deepEqual(w.byAuthor("mark"), ["a1"]);
  assert.deepEqual(w.byAuthor("someone"), ["b1"]);
  assert.ok(w.resolve("plot-a").retint);
  assert.ok(w.resolve("plot-b").retint);
});

test("removing everything by one author leaves everyone else's work standing", () => {
  const w = createWorldModel({ seed: "shared" });
  w.add(layerFrom({ id: "a1", author: "mark", edits: [edit({ address: "plot-a" })] }));
  w.add(layerFrom({ id: "a2", author: "mark", edits: [edit({ address: "plot-c" })] }));
  w.add(layerFrom({ id: "b1", author: "someone", edits: [edit({ address: "plot-b" })] }));

  for (const id of w.byAuthor("mark")) w.remove(id);
  assert.equal(w.layers().length, 1);
  assert.ok(w.resolve("plot-b").retint, "removing one author's work removed another's");
});

// ---------------------------------------------------------------------------
// Resolution: how two edits to one thing combine
// ---------------------------------------------------------------------------

test("later layers win PER OP, so independent changes coexist on one object", () => {
  // A move then a retint is both. If the newest layer replaced the whole
  // object's state, collaboration would be impossible and undo destructive.
  const w = createWorldModel({ seed: "s" });
  w.add(layerFrom({ id: "l1", author: "a", edits: [{ address: "p", op: "move", payload: { x: 10, z: 20 } }] }));
  w.add(layerFrom({ id: "l2", author: "b", edits: [{ address: "p", op: "retint", payload: { color: 0x00ff00 } }] }));

  const r = w.resolve("p");
  assert.deepEqual(r.move, { x: 10, z: 20 }, "the move was lost when a retint arrived");
  assert.deepEqual(r.retint, { color: 0x00ff00 });
});

test("the same op twice takes the later one", () => {
  const w = createWorldModel({ seed: "s" });
  w.add(layerFrom({ id: "l1", author: "a", edits: [{ address: "p", op: "retint", payload: { color: 1 } }] }));
  w.add(layerFrom({ id: "l2", author: "a", edits: [{ address: "p", op: "retint", payload: { color: 2 } }] }));
  assert.equal(w.resolve("p").retint.color, 2);
});

test("a removal wins outright, whatever else was done to it", () => {
  const w = createWorldModel({ seed: "s" });
  w.add(layerFrom({ id: "l1", author: "a", edits: [{ address: "p", op: "retint", payload: { color: 1 } }] }));
  w.add(layerFrom({ id: "l2", author: "a", edits: [{ address: "p", op: "remove" }] }));
  assert.equal(w.resolve("p").removed, true);
});

test("an untouched address resolves to nothing, so the base shows through", () => {
  const w = createWorldModel({ seed: "s" });
  w.add(layer());
  const r = w.resolve("some-other-plot");
  assert.equal(r.removed, false);
  assert.equal(r.retint, undefined);
});

test("touched() names every address the renderer has to re-resolve", () => {
  // Without this the renderer would have to re-resolve all 20,000 plots on
  // every edit, which is the difference between an edit that appears instantly
  // and one that rebuilds the city.
  const w = createWorldModel({ seed: "s" });
  w.add(layerFrom({ id: "l1", author: "a", edits: [edit({ address: "p1" }), edit({ address: "p2" })] }));
  w.add(layerFrom({ id: "l2", author: "a", edits: [edit({ address: "p2" })] }));
  assert.deepEqual(w.touched().sort(), ["p1", "p2"]);
});

test("the same layer cannot be added twice", () => {
  const w = createWorldModel({ seed: "s" });
  assert.equal(w.add(layer()).ok, true);
  assert.equal(w.add(layer()).ok, false, "the same layer id was accepted twice");
});

test("the seed is a name, so a world can be shared by reference", () => {
  // A string rather than a number so it can be a place name, a player id or a
  // share code -- anything that regenerates the same base.
  const w = createWorldModel({ seed: "harbour-of-saint-elms" });
  assert.equal(w.toJSON().seed, "harbour-of-saint-elms");
  assert.equal(createWorldModel().seed, "caliper", "there is no default world name");
});
