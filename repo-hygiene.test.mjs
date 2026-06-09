import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";

test("Yerel Ek klasörü GitHub dışı tutulur ve kökte rapor dosyası kalmaz", () => {
  const ignore = readFileSync(".gitignore", "utf8").replace(/^\uFEFF/, "");
  const rootFiles = readdirSync(".");

  assert.match(ignore, /(^|\r?\n)\/Ek\/(\r?\n|$)/);
  assert.ok(existsSync("Ek"), "Ek klasoru bulunmali");
  assert.equal(rootFiles.filter(file => /^SISTEM.*\.md$/i.test(file)).length, 0);
  assert.equal(existsSync("maintenance-inventory.test.mjs"), false);
});

test("Yerel başlatma ve sürüm komut dosyaları kökte kalır", () => {
  assert.ok(existsSync("ogrenci-bilgileri-baslat.cmd"));
  assert.ok(existsSync("surumu-guncelle.cmd"));
});
