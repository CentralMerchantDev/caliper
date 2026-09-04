// ONE COPY OF THREE.JS, NOT TWO.
//
// This test exists because of a warning that was easy to dismiss:
//
//     THREE.WARNING: Multiple instances of Three.js being imported.
//
// It appeared during a mutation run and read like noise from a bundler. It was
// not. The page's importmap maps the bare specifier "three" to the vendored
// build, so in a browser every spelling of the import lands on one file. Node
// has no importmap: bare "three" resolves to node_modules/three, the relative
// path resolves to public/vendor/three, and the suite was importing both. Two
// copies of the library were live in one process.
//
// Two copies means two sets of classes. `object instanceof THREE.Mesh` is false
// when the object came from the other copy, so any such check is decided by
// which file happened to construct the object rather than by the property being
// tested. A test can pass because both sides happened to use the same copy, and
// start failing later when an unrelated file changes its import spelling. That
// is the exact failure mode this project argues against: a control whose result
// is not caused by the thing it claims to measure.
//
// The fix is an esbuild alias in test/run.mjs pointing "three" at the vendored
// file, mirroring the importmap. This test is what stops the alias being quietly
// removed, and what would catch a new dependency dragging in its own three.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import * as THREE_BARE from "three";
import * as THREE_VENDORED from "../public/vendor/three/three.module.min.js";

function repoRoot(): string {
  // The runner bundles this file into test/.built/, so __dirname is not the
  // source directory. Walk up to the directory that holds package.json.
  let dir = path.dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 6; i++) {
    try {
      readFileSync(path.join(dir, "package.json"), "utf8");
      return dir;
    } catch {
      dir = path.dirname(dir);
    }
  }
  throw new Error("could not find the repository root from " + import.meta.url);
}

test("both spellings of the three import are the same module", () => {
  // If the alias is removed these are two distinct namespace objects holding two
  // distinct class identities, and this comparison is the cheapest way to say so.
  assert.equal(
    THREE_BARE.Mesh,
    THREE_VENDORED.Mesh,
    'import "three" and import "../public/vendor/three/three.module.min.js" resolved to ' +
      "different copies of the library. Restore the `alias` entry in test/run.mjs.",
  );

  // Identity of one class could in principle be a coincidence of re-export, so
  // check an instance actually satisfies the other copy's instanceof.
  const box = new THREE_VENDORED.Mesh(
    new THREE_VENDORED.BoxGeometry(1, 1, 1),
    new THREE_VENDORED.MeshBasicMaterial(),
  );
  assert.ok(
    box instanceof THREE_BARE.Mesh,
    "a mesh built by the vendored copy failed instanceof against the bare-specifier copy",
  );
  box.geometry.dispose();
  (box.material as { dispose(): void }).dispose();
});

test("the importmap sends bare three to the file the tests alias to", () => {
  // The alias in run.mjs is only correct as long as it agrees with the page. If
  // someone re-vendors three at a new path and updates index.html, this fails
  // rather than letting the tests keep exercising a file the page stopped using.
  const root = repoRoot();
  const html = readFileSync(path.join(root, "public", "index.html"), "utf8");

  const map = html.match(/<script type="importmap">([\s\S]*?)<\/script>/);
  assert.ok(map, "public/index.html has no importmap");

  const parsed = JSON.parse(map![1]) as { imports?: Record<string, string> };
  const target = parsed.imports?.three;
  assert.equal(
    target,
    "./vendor/three/three.module.min.js",
    "the importmap's target for \"three\" changed; test/run.mjs's alias must change with it",
  );

  const runner = readFileSync(path.join(root, "test", "run.mjs"), "utf8");
  assert.match(
    runner,
    /alias:\s*\{[\s\S]*?three:\s*path\.join\([^)]*"vendor",\s*"three",\s*"three\.module\.min\.js"\)/,
    "test/run.mjs no longer aliases \"three\" to the vendored build",
  );
});

test("no source file imports a three build other than the vendored one", () => {
  // A second three could arrive through a new dependency or a copy-pasted CDN
  // URL. Both spellings above are fine; anything else is a second copy.
  const root = repoRoot();
  const offences: string[] = [];

  for (const dir of ["public", "test", "scripts", "src"]) {
    let entries: string[];
    try {
      entries = readdirSync(path.join(root, dir));
    } catch {
      continue; // src/ may not exist in every checkout of this repo
    }
    for (const name of entries) {
      if (!/\.(ts|js|mjs)$/.test(name)) continue;
      const text = readFileSync(path.join(root, dir, name), "utf8");
      for (const m of text.matchAll(/from\s+["']([^"']*three[^"']*)["']/g)) {
        const spec = m[1];
        const ok =
          spec === "three" ||
          spec.startsWith("three/addons/") ||
          /vendor\/three\/three\.module\.min\.js$/.test(spec) ||
          /vendor\/three\/addons\//.test(spec);
        if (!ok) offences.push(`${dir}/${name}: ${spec}`);
      }
    }
  }

  assert.deepEqual(
    offences,
    [],
    "these imports would load a three.js other than the vendored build:\n  " + offences.join("\n  "),
  );
});
