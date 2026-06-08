import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync("settings.html", "utf8");

test("Ayarlar toplu silme işlemi koleksiyon bazlı sonuç raporu üretir", () => {
  assert.match(html, /function\s+silmeRaporuYaz/);
  assert.match(html, /dogrulamaHatalari/);
  assert.match(html, /silme sonrası kontrol ediliyor/);
  assert.match(html, /işlem öncesi/);
  assert.match(html, /kalan/);
});

test("Yedek içe aktarma başlamadan önce uyumluluk önizlemesi yapılır", () => {
  assert.match(html, /const\s+YEDEK_KOLEKSIYON_ALANLARI/);
  assert.match(html, /function\s+yedekDogrula/);
  assert.match(html, /async\s+function\s+yedekOnizlemeHazirla/);
  assert.match(html, /function\s+yedekKayitlariniAnalizEt/);
  assert.match(html, /function\s+yedekOnayHtml/);
  assert.match(html, /Firestore kurallarında olmayan alan/);
});

test("Yedek içe aktarma riskli durumları işlem başlamadan engeller", () => {
  assert.match(html, /Yedek şema sürümü[\s\S]*desteklediği sürümden/);
  assert.match(html, /güvenli tek işlem sınırı/);
  assert.match(html, /zorunlu alan eksik/);
  assert.match(html, /geçerli ID veya veri yok/);
  assert.match(html, /belge ID ile öğrenci numarası uyumsuz/);
  assert.match(html, /sistemde veya yedekte olmayan öğrenci bağlantısı/);
  assert.match(html, /calistir:\s*\(\)\s*=>\s*yedekIceAktar\(veri,\s*onizleme\)/);
});

test("Güvenlik modalı yalnız kontrollü açıklamalarda HTML rapor kullanır", () => {
  assert.match(html, /if\s*\(islem\.aciklamaHtml\)\s*\{\s*aciklamaEl\.innerHTML\s*=\s*islem\.aciklama/);
  assert.match(html, /else\s*\{\s*aciklamaEl\.textContent\s*=\s*islem\.aciklama/);
  assert.match(html, /aciklamaEl\.className\s*=\s*`alert alert-\$\{islem\.aciklamaTip \|\| "danger"\} small`/);
  assert.match(html, /escapeHtml\(detay\.etiket\)/);
  assert.match(html, /escapeHtml\(uyari\)/);
});
