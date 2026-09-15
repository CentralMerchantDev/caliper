-- SDB-1 (PLAN.md §6, docs/DECISIONS-FOR-MARK.md): D1 persistence for Side
-- B's registry overlay, surviving a full redeploy -- Mark's ruling. An
-- authored entry is a record with validated, queried fields, not a blob:
-- one column per field public/catalogue-registry.js's addAuthoredEntry
-- already builds, not a JSON dump of the whole entry.
--
-- footprint/terrainMask/massing/adjacency are stored as JSON text -- each
-- is itself a small, already-validated array/object (catalogue-validator.js
-- has already run before a row is ever written), and none of them is
-- queried by its own internal structure anywhere in this project. Storing
-- them as columns-per-array-element would mean a schema migration every
-- time C1.1's footprint set or S2's adjacency categories change; JSON text
-- for a value nothing SQL-side ever filters on is the honest tradeoff.
CREATE TABLE IF NOT EXISTS authored_pieces (
  id TEXT PRIMARY KEY NOT NULL,
  footprint_w INTEGER NOT NULL,
  footprint_d INTEGER NOT NULL,
  category TEXT NOT NULL,
  rotatable INTEGER NOT NULL,
  terrain_mask TEXT NOT NULL,      -- JSON array
  massing TEXT NOT NULL,           -- JSON array
  pivot TEXT NOT NULL,
  storeys INTEGER NOT NULL,
  base_value INTEGER NOT NULL,
  unit_quality REAL NOT NULL,
  adjacency TEXT NOT NULL,         -- JSON object
  author TEXT NOT NULL,
  verified_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  source_ref TEXT NOT NULL,
  uniqueness_multiplier_applied INTEGER NOT NULL,
  inserted_at TEXT NOT NULL DEFAULT (datetime('now'))
);
