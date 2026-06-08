import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("Bakım envanteri büyük dosyaları ve riskli alanları kapsar", () => {
  const md = readFileSync("SISTEM_BAKIM_ENVANTERI.md", "utf8");
  const zorunluDosyalar = [
    "app.css",
    "students-detail.html",
    "settings.html",
    "students-list.html",
    "attendance-entry.html",
    "excel-export.html",
    "layout.js",
    "students.js",
    "class-promotion.js"
  ];

  assert.match(md, /# SISTEM BAKIM ENVANTERI/);
  assert.match(md, /## 2\. Buyuk Dosya Envanteri/);
  assert.match(md, /## 3\. Tekrar Eden Kurallar ve Sabitler/);
  assert.match(md, /## 4\. Guvenli Refactor Siras/);

  zorunluDosyalar.forEach(file => {
    assert.match(md, new RegExp(`\\\`${file.replace(".", "\\.")}\\\``), `${file} envanterde yer almali`);
  });

  assert.match(md, /MAX_ATOMIK_YAZMA = 450/);
  assert.match(md, /Kayit koleksiyonlari/);
  assert.match(md, /Davranis kategorileri/);
  assert.match(md, /Devamsizlik esikleri/);
  assert.match(md, /Cache prefixleri/);
  assert.match(md, /Admin-only gorunurluk/);
});

test("Bakım envanteri refactor öncesi güvenli yaklaşımı açıkça belirtir", () => {
  const md = readFileSync("SISTEM_BAKIM_ENVANTERI.md", "utf8");

  assert.match(md, /Bu envanter uygulama davranisini degistirmez/);
  assert.match(md, /Gercek refactor/);
  assert.match(md, /gorsel kontrol/);
  assert.match(md, /test kapsam/);
  assert.match(md, /Riskli Alanlar/);
  assert.match(md, /Guvenli Baslanabilecek Alanlar/);
});
