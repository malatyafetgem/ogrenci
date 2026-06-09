import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";

const htmlFiles = readdirSync(".").filter(file => file.endsWith(".html"));
const cdnTagRegex = /<(script|link)\b[^>]*https:\/\/(?:cdn\.jsdelivr\.net|cdn\.datatables\.net)[^>]*>/gi;
const urlRegex = /\b(?:src|href)\s*=\s*["']([^"']+)["']/i;

test("CDN varlıkları sürüm pinli, SRI ve crossorigin ile yüklenir", () => {
  const sorunlar = [];

  for (const file of htmlFiles) {
    const html = readFileSync(file, "utf8");
    for (const match of html.matchAll(cdnTagRegex)) {
      const tag = match[0].replace(/\s+/g, " ").trim();
      const url = tag.match(urlRegex)?.[1] || "";

      if (!url) sorunlar.push(`${file}: CDN etiketi src/href içermiyor`);
      if (!/integrity\s*=\s*["']sha(?:256|384|512)-[^"']+["']/i.test(tag)) {
        sorunlar.push(`${file}: ${url} SRI integrity eksik`);
      }
      if (!/crossorigin\s*=\s*["']anonymous["']/i.test(tag)) {
        sorunlar.push(`${file}: ${url} crossorigin anonymous eksik`);
      }
      if (!cdnUrlSurumPinliMi(url)) {
        sorunlar.push(`${file}: ${url} sürüm pinli değil`);
      }
    }
  }

  assert.deepEqual(sorunlar, []);
});

test("AdminLTE bağımlılığı mevcut beta sürüme bilinçli olarak pinlidir", () => {
  const sorunlar = [];

  for (const file of htmlFiles) {
    const html = readFileSync(file, "utf8");
    for (const match of html.matchAll(cdnTagRegex)) {
      const tag = match[0];
      const url = tag.match(urlRegex)?.[1] || "";
      if (url.includes("admin-lte") && !url.includes("admin-lte@4.0.0-beta2/")) {
        sorunlar.push(`${file}: ${url}`);
      }
    }
  }

  assert.deepEqual(sorunlar, []);
});

function cdnUrlSurumPinliMi(url) {
  if (url.includes("cdn.jsdelivr.net")) {
    return /\/npm\/(?:@[^/]+\/)?[^/@]+@[^/?#]+(?:[/?#]|$)/.test(url);
  }

  if (url.includes("cdn.datatables.net")) {
    return /cdn\.datatables\.net\/(?:[^/]+\/)?\d+\.\d+\.\d+\//.test(url);
  }

  return true;
}
