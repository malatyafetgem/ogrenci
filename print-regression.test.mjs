import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const printableListPages = [
  ["students-list.html", "ogrenci-tablo"],
  ["phone-list.html", "telefon-tablo"],
  ["attendance-report.html", "rapor-tablo"],
  ["behavior-report.html", "davranis-tablo"],
  ["meetings-list.html", "gorusme-tablo"]
];

test("Yazdırılabilir liste ve rapor sayfaları print kontrol sözleşmesini korur", () => {
  const css = readFileSync("app.css", "utf8");
  const sorunlar = [];

  for (const [file, tableId] of printableListPages) {
    const html = readFileSync(file, "utf8");
    const table = html.match(new RegExp(`<table\\b[^>]*id="${tableId}"[^>]*>`, "i"))?.[0] || "";

    if (!/data-obs-print/.test(html)) sorunlar.push(`${file}: Yazdır butonu yok`);
    if (!/class="[^"]*no-print[^"]*"[\s\S]{0,900}data-obs-print/.test(html)) {
      sorunlar.push(`${file}: Yazdır butonu no-print eylem alanında değil`);
    }
    if (!table.includes("table-fit-desktop")) sorunlar.push(`${file}: tablo table-fit-desktop değil`);
    if (!table.includes("print-landscape")) sorunlar.push(`${file}: tablo print-landscape değil`);
    if (!html.includes("Filtreleri seçip Filtrele'ye basın.")) sorunlar.push(`${file}: filtre bekleme metni yok`);
    if (!html.includes("excel-export-btn")) sorunlar.push(`${file}: Excel butonu yok`);
    if (!css.includes(`#${tableId} th:nth-child(1)`)) sorunlar.push(`${file}: print kolon genişliği yok`);
  }

  assert.deepEqual(sorunlar, []);
});

test("Öğrenci detay yazdırması sekmeleri ve kart çıktısını kapsar", () => {
  const html = readFileSync("students-detail.html", "utf8");
  const css = readFileSync("app.css", "utf8");

  assert.match(html, /body class="[^"]*student-detail-page/);
  assert.match(html, /data-obs-print/);
  assert.match(html, /id="kart-yazdir-btn"/);
  assert.match(html, /id="ogrenci-kart"/);
  assert.match(html, /body\.classList\.add\("kart-print"\)/);
  assert.match(html, /window\.print\(\)/);
  assert.match(html, /class="nav nav-tabs mb-3 no-print"/);
  assert.match(html, /detay-kayit-tablo/);

  assert.match(css, /body\.kart-print #ogrenci-kart\s*\{\s*display:\s*block !important/);
  assert.match(css, /\.student-detail-page \.detay-kayit-tablo/);
  assert.match(css, /@media print\s*\{[\s\S]*\.tab-content > \.tab-pane\s*\{[\s\S]*display:\s*block !important/);
});

test("Layout yazdırma hazırlığı geçici değişiklikleri geri alır", () => {
  const js = readFileSync("layout.js", "utf8");

  assert.match(js, /window\.addEventListener\("beforeprint"/);
  assert.match(js, /window\.addEventListener\("afterprint"/);
  assert.match(js, /function\s+yazdirmayaHazirla/);
  assert.match(js, /function\s+yazdirmaHazirliginiTemizle/);
  assert.match(js, /dataTableTumSatirlariGoster\(\)/);
  assert.match(js, /yazdirmaSekmeleriniGoster\(\)/);
  assert.match(js, /listeYazdirmaTablolariEkle\(\)/);
  assert.match(js, /listeYazdirmaTablolariTemizle\(\)/);
  assert.match(js, /dataTableSayfalamayiGeriAl\(\)/);
  assert.match(js, /page\.len\(-1\)\.draw\(false\)/);
  assert.match(js, /page\.len\(durum\.uzunluk\)\.draw\(false\)/);
  assert.match(js, /classList\.remove\("obs-print-landscape"\)/);
});

test("Geniş liste yazdırma sayfaları kontrollü ayrı print tablosu üretir", () => {
  const js = readFileSync("layout.js", "utf8");
  const css = readFileSync("app.css", "utf8");

  assert.match(js, /document\.querySelectorAll\("table\.print-landscape"\)/);
  assert.match(js, /setAttribute\("data-obs-print-list-pages",\s*"true"\)/);
  assert.match(js, /printTable\.dataset\.sourceTable = table\.id \|\| ""/);
  assert.match(js, /function\s+listeYazdirmaKolonAgirligi/);
  assert.match(js, /function\s+listeYazdirmaSarilabilirMi/);
  assert.match(js, /listeYazdirmaDevamsizlikMetni/);

  assert.match(css, /body\.obs-list-print-pages \[data-obs-print-list-pages\]/);
  assert.match(css, /body\.obs-list-print-pages \.print-list-page-table/);
  assert.match(css, /data-source-table="telefon-tablo"/);
  assert.match(css, /data-source-table="veli-tablo"/);
  assert.match(css, /\.print-wrap\s*\{/);
});

test("Print CSS menüleri ve işlem alanlarını çıktıdan çıkarır", () => {
  const css = readFileSync("app.css", "utf8");

  assert.match(css, /@page\s*\{[\s\S]*margin:\s*10mm 8mm 11mm/);
  assert.match(css, /@media print\s*\{[\s\S]*\.app-sidebar/);
  assert.match(css, /@media print\s*\{[\s\S]*\.app-header/);
  assert.match(css, /@media print\s*\{[\s\S]*#bottom-nav-kap/);
  assert.match(css, /@media print\s*\{[\s\S]*\.breadcrumb/);
  assert.match(css, /@media print\s*\{[\s\S]*\.no-print\s*\{[\s\S]*display:\s*none !important/);
  assert.match(css, /print-color-adjust:\s*exact/);
  assert.match(css, /\.badge\.bg-danger\s*\{[\s\S]*text-decoration:\s*underline !important/);
});
