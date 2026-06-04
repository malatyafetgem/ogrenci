import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";

const htmlFiles = readdirSync(".").filter(file => file.endsWith(".html"));
const codeFiles = readdirSync(".").filter(file => /\.(html|css|js|mjs|json)$/i.test(file));
const filterPages = [
  "students-list.html",
  "attendance-report.html",
  "behavior-report.html",
  "meetings-list.html",
  "parents-list.html",
  "phone-list.html"
];

test("HTML dosyalarında inline style ve inline event handler kullanılmaz", () => {
  assert.ok(htmlFiles.length > 0, "HTML dosyası bulunamadı");

  const sorunlar = [];
  for (const file of htmlFiles) {
    const html = readFileSync(file, "utf8");
    if (/<style\b/i.test(html)) sorunlar.push(`${file}: <style>`);
    if (/\sstyle\s*=/i.test(html)) sorunlar.push(`${file}: style=`);
    if (/\s(onclick|onchange|oninput|onsubmit|onkeydown|onkeyup|onload|onerror|onmouseover|onfocus|onblur)\s*=/i.test(html)) {
      sorunlar.push(`${file}: inline event handler`);
    }
  }

  assert.deepEqual(sorunlar, []);
});

test("HTML dosyalarındaki label etiketleri form kontrolüne bağlanır", () => {
  const sorunlar = [];
  for (const file of htmlFiles) {
    const html = readFileSync(file, "utf8");
    const eksikFor = html.match(/<label\b(?![^>]*\bfor\s*=)[^>]*>/gi) || [];
    eksikFor.forEach(label => sorunlar.push(`${file}: ${label}`));
  }

  assert.deepEqual(sorunlar, []);
});

test("Title kullanan buton ve linklerde aria-label da bulunur", () => {
  const sorunlar = [];
  const kontrolRegex = /<(button|a)\b[^>]*\btitle\s*=\s*["'][^"']+["'][^>]*>/gi;
  for (const file of htmlFiles) {
    const html = readFileSync(file, "utf8");
    for (const match of html.matchAll(kontrolRegex)) {
      const tag = match[0].replace(/\s+/g, " ");
      if (!/\baria-label\s*=/.test(tag)) sorunlar.push(`${file}: ${tag}`);
    }
  }

  assert.deepEqual(sorunlar, []);
});

test("HTML dosyalarında tema rengi ayarı ve dark mode girişi yoktur", () => {
  const sorunlar = [];
  for (const file of htmlFiles) {
    const html = readFileSync(file, "utf8");
    if (/Tema Rengi|tema-renk|obs-tema-rengi|prefers-color-scheme|dark-mode/i.test(html)) {
      sorunlar.push(file);
    }
  }

  assert.deepEqual(sorunlar, []);
});

test("Kod tabanında yasak font ailesi kullanılmaz", () => {
  const sorunlar = [];
  const yasakFont = ["Ari", "al"].join("");
  const yasakFontRegex = new RegExp(`\\b${yasakFont}\\b`, "i");
  for (const file of codeFiles) {
    const content = readFileSync(file, "utf8");
    if (yasakFontRegex.test(content)) sorunlar.push(file);
  }

  assert.deepEqual(sorunlar, []);
});

test("Filtre sayfalarında filtre butonu ve bekleme metni tutarlıdır", () => {
  const sorunlar = [];
  for (const file of filterPages) {
    const html = readFileSync(file, "utf8");
    const buttonMatch = html.match(/<button\b[^>]*id=["']filtre-uygula["'][\s\S]*?<\/button>/i);
    if (!buttonMatch) {
      sorunlar.push(`${file}: filtre-uygula butonu yok`);
      continue;
    }

    const buttonText = buttonMatch[0].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    if (!buttonText.includes("Filtrele")) sorunlar.push(`${file}: filtre butonu Filtrele değil`);
    if (/Uygula'ya basın|arama düğmesine basın/i.test(html)) sorunlar.push(`${file}: bekleme metni tutarsız`);
  }

  assert.deepEqual(sorunlar, []);
});

test("Filtre sayfaları açılışta veri yükleme fonksiyonunu çağırmaz", () => {
  const yukleyiciler = {
    "students-list.html": "yukleOgrenciler",
    "attendance-report.html": "yukleRapor",
    "behavior-report.html": "yukleRapor",
    "meetings-list.html": "yukle",
    "parents-list.html": "yukle",
    "phone-list.html": "yukle"
  };
  const sorunlar = [];

  for (const [file, loader] of Object.entries(yukleyiciler)) {
    const html = readFileSync(file, "utf8");
    const block = requireAuthBlogu(html);
    const initOnly = block
      .split(/\r?\n/)
      .filter(line => !line.includes("addEventListener"))
      .join("\n");
    const directCall = new RegExp(`\\b${loader}\\s*\\(`);
    if (directCall.test(initOnly)) sorunlar.push(`${file}: açılışta ${loader} çağrılıyor`);
  }

  assert.deepEqual(sorunlar, []);
});

test("Kullanılmayan DataTable loader dosyası tutulmaz", () => {
  assert.equal(existsSync("datatable-loader.js"), false);
  const sorunlar = [];
  for (const file of htmlFiles) {
    const html = readFileSync(file, "utf8");
    if (html.includes("datatable-loader.js")) sorunlar.push(file);
  }

  assert.deepEqual(sorunlar, []);
});

test("Excel import sayfalarında şablon indirme desteği vardır", () => {
  const ogrenciHtml = readFileSync("students-list.html", "utf8");
  assert.match(ogrenciHtml, /id="import-sablon-btn"[\s\S]*Şablon İndir/);
  assert.match(ogrenciHtml, /addEventListener\("click",\s*ogrenciImportSablonuIndir\)/);
  assert.match(ogrenciHtml, /function\s+ogrenciImportSablonuIndir/);
  assert.match(ogrenciHtml, /IMPORT_ALANLARI\.map\(alan => alan\.label\)/);
  assert.match(ogrenciHtml, /XLSX\.writeFile\(wb,\s*"ogrenci_import_sablonu\.xlsx"\)/);

  const devamsizlikHtml = readFileSync("attendance-entry.html", "utf8");
  assert.match(devamsizlikHtml, /id="excel-sablon-btn"[\s\S]*Şablon İndir/);
  assert.match(devamsizlikHtml, /addEventListener\("click",\s*devamsizlikImportSablonuIndir\)/);
  assert.match(devamsizlikHtml, /function\s+devamsizlikImportSablonuIndir/);
  assert.match(devamsizlikHtml, /EXCEL_ALANLARI\.map\(alan => alan\.aliases\?\.\[0\] \|\| alan\.label\)/);
  assert.match(devamsizlikHtml, /Neden Kodları/);
  assert.match(devamsizlikHtml, /XLSX\.writeFile\(wb,\s*"devamsizlik_import_sablonu\.xlsx"\)/);
});

test("Devamsızlık giriş yöntemi kartlarının seçili durumu erişilebilirdir", () => {
  const html = readFileSync("attendance-entry.html", "utf8");
  const css = readFileSync("app.css", "utf8");
  assert.match(html, /id="kart-manuel"[^>]*role="button"[^>]*tabindex="0"[^>]*aria-pressed="true"/);
  assert.match(html, /id="kart-excel"[^>]*role="button"[^>]*tabindex="0"[^>]*aria-pressed="false"/);
  assert.match(html, /function\s+girisYontemiKlavye/);
  assert.match(html, /function\s+girisYontemiSec/);
  assert.match(html, /setAttribute\("aria-pressed",\s*String\(manuelSecili\)\)/);
  assert.match(html, /setAttribute\("aria-pressed",\s*String\(!manuelSecili\)\)/);
  assert.match(css, /\.giris-yontem-kart\.secili\s*\{[\s\S]*background:\s*var\(--obs-surface-alt\)/);
});

test("Sınıf atlatma öğrenci satırı yerine sınıf düzeyi gruplarıyla çalışır", () => {
  const html = readFileSync("class-promotion.html", "utf8");
  assert.match(html, /Sınıf Düzeyi Aktarım Tablosu/);
  assert.match(html, /<th>Sınıf Düzeyi<\/th>/);
  assert.match(html, /<th>Kapsam<\/th>/);
  assert.match(html, /data-grup-key/);
  assert.doesNotMatch(html, /data-ogr-id/);
  assert.doesNotMatch(html, /islemler\[o\.id\]/);
  assert.match(html, /function\s+sinifGruplariniHazirla/);
  assert.match(html, /function\s+grupVarsayilanIslem/);
  assert.match(html, /function\s+ogrenciIslemi/);
  assert.match(html, /function\s+grupOzeti/);
  assert.match(html, /9→10, 10→11, 11→12/);
});

test("Filtre sayfalarında Excel aktarımı filtre uygulanmadan çalışmaz", () => {
  const veriListeleri = {
    "students-list.html": "tumOgrenciler",
    "attendance-report.html": "raporVerisi",
    "behavior-report.html": "raporVerisi",
    "meetings-list.html": "raporVerisi",
    "parents-list.html": "tumSatirlar",
    "phone-list.html": "tumVerisi"
  };
  const sorunlar = [];

  for (const [file, liste] of Object.entries(veriListeleri)) {
    const html = readFileSync(file, "utf8");
    if (!/let\s+filtreUygulandi\s*=\s*false/.test(html)) sorunlar.push(`${file}: filtreUygulandi yok`);
    if (!/if\s*\(\s*!filtreUygulandi\s*\)/.test(html)) sorunlar.push(`${file}: filtre öncesi Excel engeli yok`);
    if (!html.includes("Önce filtreleri seçip Filtrele'ye basın.")) sorunlar.push(`${file}: filtre uyarısı yok`);
    if (!html.includes("Excel'e aktarılacak kayıt yok.")) sorunlar.push(`${file}: boş Excel uyarısı yok`);
    const bosListeKontrolu = new RegExp(`if\\s*\\(\\s*!${liste}\\.length\\s*\\)`);
    if (!bosListeKontrolu.test(html)) sorunlar.push(`${file}: boş liste kontrolü yok`);
    const beklemeBlogu = fonksiyonBlogu(html, "tabloBekle");
    if (/filtreUygulandi\s*=\s*true/.test(beklemeBlogu)) sorunlar.push(`${file}: tabloBekle filtreyi uygulanmış sayıyor`);
  }

  assert.deepEqual(sorunlar, []);
});

test("Yazdırma başlığı dönem bilgisini içerir ve filtre beklerken yazdırma engellenir", () => {
  const js = readFileSync("layout.js", "utf8");
  assert.match(js, /dataset\.printPeriod/);
  assert.match(js, /function\s+yazdirmaBaslikEtiketi/);
  assert.match(js, /yazdirmaBaslikEtiketi\(tamBaslik\)/);
  assert.match(js, /function\s+yazdirmaFiltreBekliyorMu/);
  assert.match(js, /Önce filtreleri seçip Filtrele'ye basın\./);
});

test("Dashboard boş özet kart uyumluluk fonksiyonunu içermez", () => {
  const html = readFileSync("dashboard.html", "utf8");
  assert.doesNotMatch(html, /dashboardOzetGoster/);
  assert.doesNotMatch(html, /cache uyumluluğu/i);
});

test("Dashboard cinsiyet grafiği renkleri CSS değişkenlerinden gelir", () => {
  const html = readFileSync("dashboard.html", "utf8");
  const css = readFileSync("app.css", "utf8");
  const erkekHex = ["#4A90", "D9"].join("");
  const kizHex = ["#D96", "A9A"].join("");

  assert.doesNotMatch(html, new RegExp(`${erkekHex}|${kizHex}`, "i"));
  assert.match(html, /var\(--obs-chart-boy\)/);
  assert.match(html, /var\(--obs-chart-girl\)/);
  assert.match(css, /--obs-chart-boy:\s*#4A90D9/i);
  assert.match(css, /--obs-chart-girl:\s*#D96A9A/i);
  assert.match(css, /\.grafik-nokta-erkek\s*\{\s*background:\s*var\(--obs-chart-boy\)/);
  assert.match(css, /\.grafik-nokta-kiz\s*\{\s*background:\s*var\(--obs-chart-girl\)/);
  assert.match(css, /\.sinif-bar-parca-erkek\s*\{\s*background:\s*var\(--obs-chart-boy\)/);
  assert.match(css, /\.sinif-bar-parca-kiz\s*\{[\s\S]*background:\s*var\(--obs-chart-girl\)/);
});

test("Dashboard dinamik bölgeleri aria-live ile işaretlenir", () => {
  const html = readFileSync("dashboard.html", "utf8");
  const bolgeler = [
    "devamsizlik-durum-ozet",
    "devamsizlik-tablo",
    "dogumgunu-liste",
    "davranis-liste"
  ];

  bolgeler.forEach(id => {
    const regex = new RegExp(`id="${id}"[^>]*aria-live="polite"`);
    assert.match(html, regex, `${id} aria-live içermeli`);
  });
});

test("Davranış girişinde boş kategori listesi kullanıcıya bildirilir", () => {
  const html = readFileSync("behavior-entry.html", "utf8");
  assert.match(html, /id="kategori-yardim"[^>]*aria-live="polite"/);
  assert.match(html, /const\s+kategoriler\s*=\s*KATEGORILER\[tur\]\s*\|\|\s*\[\]/);
  assert.match(html, /katSel\.disabled\s*=\s*!kategoriler\.length/);
  assert.match(html, /Bu davranış türü için kategori tanımlı değil/);
});

test("Davranış raporu baskıda canvas grafiğini gizler ve tabloyu tam genişlik yapar", () => {
  const html = readFileSync("behavior-report.html", "utf8");
  const css = readFileSync("app.css", "utf8");
  assert.match(html, /<div class="col-12 col-md-4 no-print">[\s\S]*<canvas id="kategori-grafik"/);
  assert.match(html, /<div class="col-12 col-md-8 print-full-width">/);
  assert.match(css, /@media print\s*\{[\s\S]*\.print-full-width\s*\{[\s\S]*width:\s*100% !important/);
});

test("Devamsızlık badge rengi için eski alias kullanılmaz", () => {
  const sorunlar = [];
  const eskiAlias = ["devamsizlikDurum", "Renk"].join("");
  for (const file of codeFiles) {
    const content = readFileSync(file, "utf8");
    if (content.includes(eskiAlias)) sorunlar.push(file);
  }

  assert.deepEqual(sorunlar, []);
});

function requireAuthBlogu(html) {
  const lines = html.split(/\r?\n/);
  const start = lines.findIndex(line => /requireAuth\s*\(/.test(line));
  if (start === -1) return "";
  const out = [];
  for (let i = start; i < lines.length; i++) {
    out.push(lines[i]);
    if (i > start && /^\s*\}\);\s*$/.test(lines[i])) break;
  }
  return out.join("\n");
}

function fonksiyonBlogu(kaynak, ad) {
  const start = kaynak.search(new RegExp(`function\\s+${ad}\\s*\\(`));
  if (start === -1) return "";
  const acilis = kaynak.indexOf("{", start);
  if (acilis === -1) return "";
  let derinlik = 0;
  for (let i = acilis; i < kaynak.length; i++) {
    if (kaynak[i] === "{") derinlik++;
    else if (kaynak[i] === "}") {
      derinlik--;
      if (derinlik === 0) return kaynak.slice(acilis, i + 1);
    }
  }
  return kaynak.slice(acilis);
}
