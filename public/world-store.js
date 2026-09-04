// =============================================================================
// CALIPER — THE LAYER STORE
//
// A world could be built, seeded, and edited with layers -- and none of it
// survived a reload. localStorage held UI preferences only; the pipeline's own
// KV persists the source PARCEL, not the world the player is looking at.
//
// ONE INTERFACE, MANY BACKENDS.
//
// save/load/list are adapter-agnostic. The adapter is a four-method shape --
// get(key), put(key, value), delete(key), list() -- deliberately matched to
// the shape this repo's own fake KV already uses in
// test/changePipelineErrorRecovery.test.ts, and close enough to Cloudflare's
// real KVNamespace that kvAdapter is a thin pass-through, not a translation
// layer with its own bugs to have.
//
// A CORRUPT RECORD IS REPORTED, NOT SILENTLY DROPPED.
//
// createWorldModel's rejected() path already exists for a malformed LAYER
// inside an otherwise-good record. This is one level below that: what if the
// STORED BLOB itself is not valid JSON, or is valid JSON that is not a world?
// The failure mode this guards against is a player's saved city quietly
// becoming "a new empty world" with no error anywhere -- which is worse than
// refusing to load, because refusing is visible and this would not be.
// =============================================================================

/** A real, working adapter -- not a test double. Used directly when there is
 *  no browser storage available (Node, SSR, a headless script) and as the
 *  reference implementation the round-trip tests below are proven against. */
export function memoryAdapter() {
  const store = new Map();
  return {
    async get(key) { return store.has(key) ? store.get(key) : null; },
    async put(key, value) { store.set(key, value); },
    async delete(key) { store.delete(key); },
    async list() { return [...store.keys()]; },
  };
}

/** Wraps a localStorage-shaped object (or the real global one). Takes the
 *  storage explicitly, rather than reading the global directly, so the
 *  quota-exceeded/private-mode path below can be exercised with a fake that
 *  throws on demand instead of needing an actual browser to misbehave in. */
export function localStorageAdapter(storage = (typeof localStorage !== "undefined" ? localStorage : undefined), prefix = "caliper-world:") {
  if (!storage) throw new Error("no localStorage-like object available");
  return {
    async get(key) {
      // localStorage.getItem RETURNS null for a missing key; it does not
      // throw for that case. It CAN throw (Safari private mode denies all
      // storage access, not just writes) and that has to surface, not be
      // read as "this key doesn't exist".
      return storage.getItem(prefix + key);
    },
    async put(key, value) {
      // THE CASE THIS ADAPTER EXISTS FOR.
      //
      // Safari private mode and a full quota both make setItem THROW. A store
      // that treats "threw" as "saved" (or silently as "nothing happened")
      // loses a player's work and tells them nothing -- the write looks like
      // it succeeded from the caller's side because nothing came back to say
      // otherwise. This lets the throw propagate; createWorldStore.save()
      // below is what turns it into a reported failure.
      storage.setItem(prefix + key, value);
    },
    async delete(key) { storage.removeItem(prefix + key); },
    async list() {
      const out = [];
      const n = storage.length;
      for (let i = 0; i < n; i++) {
        const k = storage.key(i);
        if (k && k.startsWith(prefix)) out.push(k.slice(prefix.length));
      }
      return out;
    },
  };
}

/** Wraps a Cloudflare KVNamespace (or anything shaped like one -- get/put/
 *  delete/list). Server-side persistence, same interface as every other
 *  adapter here, so the pipeline can store a world the same way the browser
 *  stores one. */
export function kvAdapter(kv, prefix = "world:") {
  return {
    async get(key) { return kv.get(prefix + key); },
    async put(key, value) { return kv.put(prefix + key, value); },
    async delete(key) { return kv.delete(prefix + key); },
    async list() {
      const page = await kv.list({ prefix });
      const keys = (page && page.keys) || [];
      return keys.map((k) => k.name.slice(prefix.length));
    },
  };
}

/** IndexedDB first, localStorage as the fallback the plan names. Selection
 *  only -- both branches are independently real adapters, tested on their own
 *  terms above/below. This function's own logic (which branch fires) cannot
 *  be exercised in Node, where neither global exists; noted as a visual/
 *  browser-only check, the same way this project already treats the renderer. */
export function browserAdapter() {
  if (typeof indexedDB !== "undefined") return indexedDBAdapter();
  if (typeof localStorage !== "undefined") return localStorageAdapter();
  throw new Error("no browser storage available");
}

/** A real IndexedDB-backed adapter for the browser. UNVERIFIED IN THIS
 *  SANDBOX: there is no IndexedDB in Node, and this project does not fake the
 *  thing under test. Kept deliberately small -- one object store, promisified
 *  requests, no transactions spanning multiple operations -- because the
 *  smaller this is, the less there is to be wrong in a path nothing here can
 *  run. */
export function indexedDBAdapter(dbName = "caliper-worlds", storeName = "worlds") {
  function withStore(mode, fn) {
    return new Promise((resolve, reject) => {
      const openReq = indexedDB.open(dbName, 1);
      openReq.onupgradeneeded = () => {
        if (!openReq.result.objectStoreNames.contains(storeName)) {
          openReq.result.createObjectStore(storeName);
        }
      };
      openReq.onerror = () => reject(openReq.error);
      openReq.onsuccess = () => {
        const db = openReq.result;
        const tx = db.transaction(storeName, mode);
        const store = tx.objectStore(storeName);
        const req = fn(store);
        req.onerror = () => reject(req.error);
        req.onsuccess = () => resolve(req.result);
      };
    });
  }
  return {
    get(key) { return withStore("readonly", (s) => s.get(key)); },
    put(key, value) { return withStore("readwrite", (s) => s.put(value, key)); },
    delete(key) { return withStore("readwrite", (s) => s.delete(key)); },
    async list() {
      const keys = await withStore("readonly", (s) => s.getAllKeys());
      return [...keys];
    },
  };
}

/**
 * save(worldId, stack) / load(worldId) / list() over any adapter above.
 *
 * `stack` is a world's toJSON() shape -- { seed, layers } -- not a live world
 * instance. Storing the plan or the land would be storing a copy of something
 * that regenerates for free from the seed; see world.js's own note on this.
 */
export function createWorldStore(adapter) {
  return {
    async save(worldId, stack) {
      let raw;
      try {
        raw = JSON.stringify(stack);
      } catch (e) {
        return { ok: false, reason: `world "${worldId}" is not storable: ${e && e.message}` };
      }
      try {
        await adapter.put(worldId, raw);
      } catch (e) {
        // THE CASE THIS EXISTS FOR: the adapter threw (quota, private mode,
        // a KV outage) and that must come back as a reported failure, not
        // read by the caller as "it saved".
        return { ok: false, reason: `could not save world "${worldId}": ${e && e.message}` };
      }
      return { ok: true };
    },

    async load(worldId) {
      let raw;
      try {
        raw = await adapter.get(worldId);
      } catch (e) {
        return { ok: false, reason: `could not read world "${worldId}": ${e && e.message}` };
      }
      if (raw == null) return { ok: false, reason: `no world "${worldId}"` };
      let data;
      try {
        data = typeof raw === "string" ? JSON.parse(raw) : raw;
      } catch {
        // A CORRUPT RECORD IS REPORTED, NOT SILENTLY DROPPED.
        return { ok: false, reason: `stored record for "${worldId}" is not valid JSON -- refusing to load it as an empty world` };
      }
      if (!data || typeof data !== "object" || (typeof data.seed !== "string" && typeof data.seed !== "number")) {
        return { ok: false, reason: `stored record for "${worldId}" is not a world -- missing a seed` };
      }
      return { ok: true, seed: data.seed, layers: Array.isArray(data.layers) ? data.layers : [] };
    },

    async list() {
      return adapter.list();
    },
  };
}
