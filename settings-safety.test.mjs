import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync("settings.html", "utf8");
const css = readFileSync("app.css", "utf8");

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

test("Veri sağlığı kontrolü sadece okuma yapan bağlantı raporu üretir", () => {
  assert.match(html, /id="veri-sagligi-kontrol-btn"/);
  assert.match(html, /id="veri-sagligi-sonuc"/);
  assert.match(html, /addEventListener\("click",\s*veriSagligiKontrolEt\)/);
  assert.match(html, /async\s+function\s+veriSagligiKontrolEt/);
  assert.match(html, /function\s+veriSagligiBagliKoleksiyonuAnalizEt/);
  assert.match(html, /getDocs\(collection\(db,\s*koleksiyon\)\)/);
  assert.match(html, /typeof ogrenciId !== "string"/);
  assert.match(html, /!ogrenciIdleri\.has\(trimId\)/);
  assert.match(html, /Kontrol yalnızca okuma yapar/);

  const baslangic = html.indexOf("async function veriSagligiKontrolEt");
  const bitis = html.indexOf("async function okulAyarlariYukle");
  assert.ok(baslangic > -1 && bitis > baslangic, "veri sağlığı bölümü bulunmalı");
  const veriSagligiBolumu = html.slice(baslangic, bitis);
  assert.doesNotMatch(veriSagligiBolumu, /writeBatch|setDoc|addDoc|updateDoc|deleteDoc|batch\.|\.delete\(/);
});

test("Ayarlar aksiyonları ve güvenlik modalı mobilde erişilebilir kalır", () => {
  assert.match(html, /card border-success settings-action-card/);
  assert.match(html, /card border-primary settings-action-card/);
  assert.match(html, /card border-info settings-action-card/);
  assert.match(html, /settings-backup-actions/);
  assert.match(html, /modal-fullscreen-sm-down settings-security-dialog/);
  assert.match(html, /modal-fullscreen-md-down/);

  assert.match(css, /\.settings-action-card \.card-body > div:first-child\s*\{[\s\S]*min-width:\s*0/);
  assert.match(css, /@media \(max-width:\s*575\.98px\)[\s\S]*\.settings-action-card \.text-muted\.small\s*\{[\s\S]*display:\s*block/);
  assert.match(css, /@media \(max-width:\s*575\.98px\)[\s\S]*\.settings-action-card \.btn\s*\{[\s\S]*width:\s*100%/);
  assert.match(css, /@media \(max-width:\s*575\.98px\)[\s\S]*\.settings-backup-actions\s*\{[\s\S]*flex-direction:\s*column/);
  assert.match(css, /\.settings-security-dialog \.modal-body\s*\{[\s\S]*overflow-wrap:\s*anywhere/);
  assert.match(css, /\.settings-security-dialog #guvenlik-aciklama\s*\{[\s\S]*overflow-y:\s*auto/);
});

test("Güvenlik modalı yalnız kontrollü açıklamalarda HTML rapor kullanır", () => {
  assert.match(html, /if\s*\(islem\.aciklamaHtml\)\s*\{\s*aciklamaEl\.innerHTML\s*=\s*islem\.aciklama/);
  assert.match(html, /else\s*\{\s*aciklamaEl\.textContent\s*=\s*islem\.aciklama/);
  assert.match(html, /aciklamaEl\.className\s*=\s*`alert alert-\$\{islem\.aciklamaTip \|\| "danger"\} small`/);
  assert.match(html, /escapeHtml\(detay\.etiket\)/);
  assert.match(html, /escapeHtml\(uyari\)/);
});
