import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { archiveFile, BEIR_DATASETS, verifyBeirArchive } from "./fetchBeirDataset.mjs";

for (const [datasetId, dataset] of Object.entries(BEIR_DATASETS)) {
  const originalArchive = archiveFile(datasetId);
  const archiveMissingReason = `BEIR ${dataset.name} archive is missing; run node test/fetchBeirDataset.mjs ${datasetId} with network access`;
  const archiveTest = fs.existsSync(originalArchive)
    ? test
    : (name: string, fn: () => unknown) => test(`${name} — SKIP ${archiveMissingReason}`, { skip: archiveMissingReason }, fn);

  archiveTest(`${dataset.name} archive checksum rejects corruption and accepts the published bytes`, () => {
    const corruptCopy = path.join(process.cwd(), ".wrangler", "checksum-tests", `${datasetId}-corrupt.zip`);
    fs.mkdirSync(path.dirname(corruptCopy), { recursive: true });
    const corrupted = Buffer.from(fs.readFileSync(originalArchive));
    corrupted[Math.floor(corrupted.length / 2)] ^= 1;
    fs.writeFileSync(corruptCopy, corrupted);
    assert.throws(() => verifyBeirArchive(datasetId, corruptCopy), /checksum mismatch/);
    console.log(`RED: one-byte-corrupted ${dataset.name} archive rejected: checksum mismatch`);
    assert.equal(verifyBeirArchive(datasetId, originalArchive), dataset.sha256);
    console.log(`GREEN: published ${dataset.name} archive accepted: SHA-256 ${dataset.sha256}`);
  });
}
