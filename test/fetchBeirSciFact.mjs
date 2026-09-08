// SciFact attribution and license:
// AllenAI SciFact: https://allenai.org/data/scifact
// BEIR distribution: https://public.ukp.informatik.tu-darmstadt.de/thakur/BEIR/datasets/scifact.zip
// BEIR paper: https://arxiv.org/abs/2104.08663
// SciFact is licensed CC BY-NC 2.0: https://creativecommons.org/licenses/by-nc/2.0/
// The archive is fetched for evaluation and is not redistributed by this repository.

import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { inflateRawSync } from "node:zlib";

export const SCIFACT_ARCHIVE_URL = "https://public.ukp.informatik.tu-darmstadt.de/thakur/BEIR/datasets/scifact.zip";
export const SCIFACT_ARCHIVE_SHA256 = "536e14446a0ba56ed1398ab1055f39fe852686ecad24a6306c80c490fa8e0165";
export const SCIFACT_ARCHIVE_FILE = path.join(process.cwd(), ".wrangler", "downloads", "scifact.zip");
export const SCIFACT_DATA_DIRECTORY = path.join(process.cwd(), "test", "beir-scifact");

const REQUIRED_FILES = ["corpus.jsonl", "queries.jsonl", path.join("qrels", "test.tsv")];

export function sha256File(file) {
  return createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

export function verifySciFactArchive(file) {
  const measured = sha256File(file);
  if (measured !== SCIFACT_ARCHIVE_SHA256) {
    throw new Error(`BEIR SciFact archive checksum mismatch: expected ${SCIFACT_ARCHIVE_SHA256}, measured ${measured}`);
  }
  return measured;
}

function findEndOfCentralDirectory(archive) {
  const earliest = Math.max(0, archive.length - 65_557);
  for (let offset = archive.length - 22; offset >= earliest; offset--) {
    if (archive.readUInt32LE(offset) === 0x06054b50) return offset;
  }
  throw new Error("BEIR SciFact archive has no ZIP central directory");
}

function extractRequiredFiles(archiveFile) {
  const archive = fs.readFileSync(archiveFile);
  const end = findEndOfCentralDirectory(archive);
  const entryCount = archive.readUInt16LE(end + 10);
  let centralOffset = archive.readUInt32LE(end + 16);
  const wanted = new Map([
    ["scifact/corpus.jsonl", "corpus.jsonl"],
    ["scifact/queries.jsonl", "queries.jsonl"],
    ["scifact/qrels/test.tsv", path.join("qrels", "test.tsv")],
  ]);
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
      const output = path.join(SCIFACT_DATA_DIRECTORY, relativeOutput);
      fs.mkdirSync(path.dirname(output), { recursive: true });
      fs.writeFileSync(output, contents);
      extracted.add(relativeOutput);
    }
    centralOffset += 46 + nameLength + extraLength + commentLength;
  }

  for (const required of REQUIRED_FILES) {
    if (!extracted.has(required)) throw new Error(`BEIR SciFact archive is missing ${required}`);
  }
}

export async function ensureSciFactDataset() {
  fs.mkdirSync(path.dirname(SCIFACT_ARCHIVE_FILE), { recursive: true });
  if (!fs.existsSync(SCIFACT_ARCHIVE_FILE)) {
    try {
      const response = await fetch(SCIFACT_ARCHIVE_URL);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      fs.writeFileSync(SCIFACT_ARCHIVE_FILE, Buffer.from(await response.arrayBuffer()));
    } catch (error) {
      return { available: false, reason: `BEIR SciFact data is missing; run node test/fetchBeirSciFact.mjs with network access (${String(error)})` };
    }
  }
  verifySciFactArchive(SCIFACT_ARCHIVE_FILE);
  extractRequiredFiles(SCIFACT_ARCHIVE_FILE);
  return { available: true, source: SCIFACT_ARCHIVE_URL };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/(.:)/, "$1"))) {
  const result = await ensureSciFactDataset();
  if (!result.available) {
    console.error(`SKIP SciFact fetch: ${result.reason}`);
    process.exitCode = 2;
  } else {
    console.log(`SciFact ready; SHA-256 ${SCIFACT_ARCHIVE_SHA256}; source ${SCIFACT_ARCHIVE_URL}`);
  }
}
