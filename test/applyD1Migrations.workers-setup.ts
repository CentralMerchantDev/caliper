// SDB-1 (PLAN.md §6) -- every `.workers.test.ts` file runs inside a FRESH
// Miniflare-simulated D1 database (no real cloud resource, no API spend);
// the schema has to be created before any test that touches CATALOGUE_DB
// runs. Migrations themselves are the same file production would apply
// (migrations/0001_create_authored_pieces.sql) -- read once in Node
// (vitest.config.ts, `readD1Migrations`) and passed in as a plain-JSON
// binding, since the migrations directory itself is not reachable from
// inside workerd.
import { applyD1Migrations, env } from "cloudflare:test";

await applyD1Migrations(env.CATALOGUE_DB, env.TEST_D1_MIGRATIONS);
