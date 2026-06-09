import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join } from "node:path";

const TARGET_EXTENSIONS = new Set([".html", ".js", ".mjs", ".css", ".webmanifest"]);
const SKIP_DIRS = new Set([".git", "node_modules", "Ek"]);

function walk(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (!entry.startsWith(".") && !SKIP_DIRS.has(entry)) files.push(...walk(full));
      continue;
    }
    if (TARGET_EXTENSIONS.has(extname(entry))) files.push(full);
  }
  return files;
}

function expectedCacheTag() {
  const version = readFileSync("version.js", "utf8");
  const versionMatch = version.match(/APP_VERSION\s*=\s*"(\d+)\.(\d+)\.(\d+)"/);
  const dateMatch = version.match(/APP_UPDATED_AT\s*=\s*"(\d{2})\.(\d{2})\.(\d{4})"/);

  assert.ok(versionMatch, "version.js APP_VERSION icermeli");
  assert.ok(dateMatch, "version.js APP_UPDATED_AT GG.AA.YYYY biciminde olmali");

  return {
    version: versionMatch[0].match(/"([^"]+)"/)[1],
    tag: `${dateMatch[3]}${dateMatch[2]}${dateMatch[1]}-${versionMatch[3]}`
  };
}

test("Sürüm, service worker cache ve cache etiketleri aynı sürümü gösterir", () => {
  const { version, tag } = expectedCacheTag();
  const sw = readFileSync("sw.js", "utf8");
  const wrongTags = [];
  let tagCount = 0;

  assert.match(sw, new RegExp(`const CACHE_VERSION = "obs-cache-v${version.replaceAll(".", "\\.")}"`));

  for (const file of walk(".")) {
    const content = readFileSync(file, "utf8");
    for (const match of content.matchAll(/\?v=(\d{8}-\d+)/g)) {
      tagCount++;
      if (match[1] !== tag) wrongTags.push(`${file}: ${match[1]}`);
    }
  }

  assert.ok(tagCount > 0, "Projede cache etiketi bulunmali");
  assert.deepEqual(wrongTags, []);
});

test("Sürüm artırma aracı yerel Ek klasörünü taramaz", () => {
  const script = readFileSync("bump-version.mjs", "utf8");

  assert.match(script, /giris === "Ek"/);
  assert.match(script, /giris === "node_modules"/);
  assert.match(script, /giris === "\.git"/);
});
