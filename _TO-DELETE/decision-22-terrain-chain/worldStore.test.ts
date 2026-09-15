// THE LAYER STORE -- ONE INTERFACE, AND A CORRUPT RECORD SAYS SO.
//
// A world could be built, seeded and edited -- and none of it survived a
// reload. This is what saves and loads it. The property that actually
// matters is not "it round-trips on the happy path" -- JSON.stringify then
// JSON.parse would pass that trivially -- it is that failure is visible.
// A player's saved world quietly becoming "a new empty world", with nothing
// telling them their city is gone, is worse than refusing to load: refusing
// is loud, and this failure mode is the "absence nobody can see" shape this
// project keeps finding.

import { test } from "node:test";
import assert from "node:assert/strict";

import { createWorldStore, memoryAdapter, localStorageAdapter, kvAdapter } from "../public/world-store.js";
import { createWorld, worldFromJSON } from "../public/world.js";
import { layerFrom } from "../public/world-model.js";

test("a saved world reloads with its layers intact", async () => {
  const store = createWorldStore(memoryAdapter());
  const w = createWorld({ seed: "prospect-quarter" });
  w.layers.add(layerFrom({ id: "l1", author: "mark", edits: [{ address: "p1", op: "retint", payload: { color: 0xff0000 } }] }));

  const saved = await store.save("world-1", w.toJSON());
  assert.equal(saved.ok, true, saved.reason);

  const loaded = await store.load("world-1");
  assert.equal(loaded.ok, true, (loaded as any).reason);
  const rebuilt = worldFromJSON({ seed: (loaded as any).seed, layers: (loaded as any).layers });
  assert.equal(rebuilt.seed, w.seed);
  assert.deepEqual(rebuilt.layers.layers(), w.layers.layers(), "the reloaded world lost its layers");
});

test("loading a world that was never saved is reported, not returned as an empty world", async () => {
  const store = createWorldStore(memoryAdapter());
  const loaded = await store.load("never-saved");
  assert.equal(loaded.ok, false);
  assert.match((loaded as any).reason, /no world/);
});

test("a stored record that is not valid JSON is REPORTED, not silently dropped", async () => {
  const adapter = memoryAdapter();
  await adapter.put("world-2", "{ this is not json");
  const store = createWorldStore(adapter);
  const loaded = await store.load("world-2");
  assert.equal(loaded.ok, false, "a corrupt record loaded as if it were a real, empty world");
  assert.match((loaded as any).reason, /not valid JSON/);
});

test("a stored record that is valid JSON but not a world is REPORTED", async () => {
  const adapter = memoryAdapter();
  await adapter.put("world-3", JSON.stringify({ notASeed: true }));
  const store = createWorldStore(adapter);
  const loaded = await store.load("world-3");
  assert.equal(loaded.ok, false);
  assert.match((loaded as any).reason, /not a world/);
});

test("an adapter that throws on write is reported as a save failure, not swallowed as success", async () => {
  // The localStorage private-mode / quota-exceeded case, reproduced with a
  // fake storage object that throws on demand rather than needing an actual
  // browser to misbehave in.
  const throwingStorage = {
    getItem() { return null; },
    setItem() { throw new Error("QuotaExceededError"); },
    removeItem() {},
    get length() { return 0; },
    key() { return null; },
  };
  const store = createWorldStore(localStorageAdapter(throwingStorage as any));
  const saved = await store.save("world-4", { seed: "x", layers: [] });
  assert.equal(saved.ok, false, "a write that threw was reported as a successful save");
  assert.match((saved as any).reason, /could not save/);
});

test("localStorageAdapter round-trips through a real fake localStorage, prefixed", async () => {
  const backing = new Map<string, string>();
  const fakeLocalStorage = {
    getItem: (k: string) => (backing.has(k) ? backing.get(k)! : null),
    setItem: (k: string, v: string) => { backing.set(k, v); },
    removeItem: (k: string) => { backing.delete(k); },
    get length() { return backing.size; },
    key: (i: number) => [...backing.keys()][i] ?? null,
  };
  const store = createWorldStore(localStorageAdapter(fakeLocalStorage as any, "test-world:"));
  await store.save("abc", { seed: "s", layers: [] });
  assert.ok(backing.has("test-world:abc"), "the adapter did not use its own prefix");
  assert.deepEqual(await store.list(), ["abc"]);
});

test("kvAdapter round-trips through a KVNamespace-shaped fake, and list() strips its prefix", async () => {
  const backing = new Map<string, string>();
  const fakeKV = {
    get: async (k: string) => (backing.has(k) ? backing.get(k)! : null),
    put: async (k: string, v: string) => { backing.set(k, v); },
    delete: async (k: string) => { backing.delete(k); },
    list: async ({ prefix }: { prefix: string }) => ({ keys: [...backing.keys()].filter((k) => k.startsWith(prefix)).map((name) => ({ name })) }),
  };
  const store = createWorldStore(kvAdapter(fakeKV as any));
  await store.save("harbour", { seed: "harbour-of-saint-elms", layers: [] });
  assert.ok(backing.has("world:harbour"), "the adapter did not use its own prefix");
  assert.deepEqual(await store.list(), ["harbour"]);
});

test("list() names every saved world id, and only saved ones", async () => {
  const store = createWorldStore(memoryAdapter());
  await store.save("alpha", { seed: "a", layers: [] });
  await store.save("beta", { seed: "b", layers: [] });
  const ids = await store.list();
  assert.deepEqual([...ids].sort(), ["alpha", "beta"]);
});
