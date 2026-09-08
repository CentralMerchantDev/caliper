// Fetches checksum-pinned BEIR evaluation archives without redistributing them.
// Dataset licenses come from their original publishers, not from BEIR.

import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { inflateRawSync } from "node:zlib";

export const BEIR_DATASETS = Object.freeze({
  scifact: Object.freeze({
    name: "SciFact",
    url: "https://public.ukp.informatik.tu-darmstadt.de/thakur/BEIR/datasets/scifact.zip",
    sha256: "536e14446a0ba56ed1398ab1055f39fe852686ecad24a6306c80c490fa8e0165",
    directory: path.join(process.cwd(), "test", "beir-scifact"),
  }),
  arguana: Object.freeze({
    name: "ArguAna",
    url: "https://public.ukp.informatik.tu-darmstadt.de/thakur/BEIR/datasets/arguana.zip",
    sha256: "cfdf79adce27a401b3cd3ea267903134dbfab2c6afeb95d7fe5724a00bf7557b",
    directory: path.join(process.cwd(), "test", "beir-arguana"),
  }),
});

const REQUIRED_FILES = ["corpus.jsonl", "queries.jsonl", path.join("qrels", "test.tsv")];

export function archiveFile(datasetId) {
  return path.join(process.cwd(), ".wrangler", "downloads", `${datasetId}.zip`);
}

export function sha256File(file) {
  return createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

export function verifyBeirArchive(datasetId, file) {
  const dataset = BEIR_DATASETS[datasetId];
  if (!dataset) throw new Error(`Unknown BEIR dataset: ${datasetId}`);
  const measured = sha256File(file);
  if (measured !== dataset.sha256) {
    throw new Error(`BEIR ${dataset.name} archive checksum mismatch: expected ${dataset.sha256}, measured ${measured}`);
  }
  return measured;
}

function findEndOfCentralDirectory(archive, datasetName) {
  const earliest = Math.max(0, archive.length - 65_557);
  for (let offset = archive.length - 22; offset >= earliest; offset--) {
    if (archive.readUInt32LE(offset) === 0x06054b50) return offset;
  }
  throw new Error(`BEIR ${datasetName} archive has no ZIP central directory`);
}

function extractRequiredFiles(datasetId, archivePath) {
  const dataset = BEIR_DATASETS[datasetId];
  const archive = fs.readFileSync(archivePath);
  const end = findEndOfCentralDirectory(archive, dataset.name);
  const entryCount = archive.readUInt16LE(end + 10);
  let centralOffset = archive.readUInt32LE(end + 16);
  const wanted = new Map(REQUIRED_FILES.map((relative) => [`${datasetId}/${relative.split(path.sep).join("/")}`, relative]));
  const extracted = new Set();

  for (let entry = 0; entry < entryCount; entry++) {
    if (archive.readUInt32LE(centralOffset) !== 0x02014b50) throw new Error("Invalid ZIP central-directory entry");
    const compression = archive.readUInt16LE(centralOffset + 10);
    const compressedSize = archive.readUInt32LE(centralOffset + 20);
    const uncompressedSize = archive.readUInt32LE(centralOffset + 24);
    const nameLength = archive.readUInt16LE(centralOffset + 28);
    const extraLength = archive.readUInt16LE(centralOffset + 30);
    const commentLength = archive.readUInt16LE(centralOffset + 32);
    const localOffset = archive.readUInt32LE(centralOffset + 42);
    const name = archive.subarray(centralOffset + 46, centralOffset + 46 + nameLength).toString("utf8");
    const relativeOutput = wanted.get(name);
    if (relativeOutput) {
      if (archive.readUInt32LE(localOffset) !== 0x04034b50) throw new Error(`Invalid ZIP entry for ${name}`);
      const localNameLength = archive.readUInt16LE(localOffset + 26);
      const localExtraLength = archive.readUInt16LE(localOffset + 28);
      const dataOffset = localOffset + 30 + localNameLength + localExtraLength;
      const compressed = archive.subarray(dataOffset, dataOffset + compressedSize);
      const contents = compression === 0 ? compressed : compression === 8 ? inflateRawSync(compressed) : null;
      if (!contents) throw new Error(`Unsupported ZIP compression ${compression} for ${name}`);
      if (contents.length !== uncompressedSize) throw new Error(`Uncompressed size mismatch for ${name}`);
      const output = path.join(dataset.directory, relativeOutput);
      fs.mkdirSync(path.dirname(output), { recursive: true });
      fs.writeFileSync(output, contents);
      extracted.add(relativeOutput);
    }
    centralOffset += 46 + nameLength + extraLength + commentLength;
  }
  for (const required of REQUIRED_FILES) {
    if (!extracted.has(required)) throw new Error(`BEIR ${dataset.name} archive is missing ${required}`);
  }
}

export async function ensureBeirDataset(datasetId) {
  const dataset = BEIR_DATASETS[datasetId];
  if (!dataset) throw new Error(`Unknown BEIR dataset: ${datasetId}`);
  const localArchive = archiveFile(datasetId);
  fs.mkdirSync(path.dirname(localArchive), { recursive: true });
  if (!fs.existsSync(localArchive)) {
    try {
      const response = await fetch(dataset.url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      fs.writeFileSync(localArchive, Buffer.from(await response.arrayBuffer()));
    } catch (error) {
      return { available: false, reason: `BEIR ${dataset.name} data is missing; run node test/fetchBeirDataset.mjs ${datasetId} with network access (${String(error)})` };
    }
  }
  verifyBeirArchive(datasetId, localArchive);
  extractRequiredFiles(datasetId, localArchive);
  return { available: true, source: dataset.url };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/(.:)/, "$1"))) {
  const requested = process.argv.slice(2);
  const datasetIds = requested.length > 0 ? requested : Object.keys(BEIR_DATASETS);
  for (const datasetId of datasetIds) {
    const result = await ensureBeirDataset(datasetId);
    if (!result.available) {
      console.error(`SKIP ${datasetId} fetch: ${result.reason}`);
      process.exitCode = 2;
    } else {
      const dataset = BEIR_DATASETS[datasetId];
      console.log(`${dataset.name} ready; SHA-256 ${dataset.sha256}; source ${dataset.url}`);
    }
  }
}
