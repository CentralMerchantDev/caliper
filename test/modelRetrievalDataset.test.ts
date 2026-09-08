import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { SCIFACT_ARCHIVE_FILE, SCIFACT_ARCHIVE_SHA256, verifySciFactArchive } from "./fetchBeirSciFact.mjs";

const archiveMissingReason = "BEIR SciFact archive is missing; run node test/fetchBeirSciFact.mjs with network access";
const archiveTest = fs.existsSync(SCIFACT_ARCHIVE_FILE)
  ? test
  : (name: string, fn: () => unknown) => test(`${name} — SKIP ${archiveMissingReason}`, { skip: archiveMissingReason }, fn);

archiveTest("SciFact archive checksum rejects corruption and accepts the published bytes", () => {
  const corruptCopy = path.join(process.cwd(), ".wrangler", "checksum-tests", "scifact-corrupt.zip");
  fs.mkdirSync(path.dirname(corruptCopy), { recursive: true });
  const corrupted = Buffer.from(fs.readFileSync(SCIFACT_ARCHIVE_FILE));
  corrupted[Math.floor(corrupted.length / 2)] ^= 1;
  fs.writeFileSync(corruptCopy, corrupted);
  assert.throws(() => verifySciFactArchive(corruptCopy), /checksum mismatch/);
  console.log("RED: one-byte-corrupted SciFact archive rejected: checksum mismatch");
  assert.equal(verifySciFactArchive(SCIFACT_ARCHIVE_FILE), SCIFACT_ARCHIVE_SHA256);
  console.log(`GREEN: published SciFact archive accepted: SHA-256 ${SCIFACT_ARCHIVE_SHA256}`);
});
