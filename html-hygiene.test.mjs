import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";

const htmlFiles = readdirSync(".").filter(file => file.endsWith(".html"));
const codeFiles = readdirSync(".").filter(file => /\.(html|css|js|mjs|json)$/i.test(file));
const kaldirilanVeliSayfasi = ["parents", "list.html"].join("-");
const kaldirilanVeliListesiEtiketi = ["Veli", "Listesi"].join(" ");
const eskiTelefonListesiEtiketi = ["Toplu", "Telefon", "Listesi"].join(" ");
const kaldirilanListeMenusu = ["Liste", "ler"].join("");
const kaldirilanFazlaSekmesi = ["Faz", "lası"].join("");
const eskiMobilMenuSinifi = ["mobile", "more"].join("-");
const filterPages = [
  "students-list.html",
  "attendance-report.html",
  "behavior-report.html",
  "meetings-list.html",
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

test("Yerel dosya yönlendirme uyarısı inline stil kullanmaz", () => {
  const js = readFileSync("file-redirect.js", "utf8");
  const css = readFileSync("app.css", "utf8");
  assert.doesNotMatch(js, /style\.cssText|style="/);
  assert.match(js, /file-redirect-warning/);
  assert.match(js, /file-redirect-warning-card/);
  assert.match(js, /file-redirect-warning-note/);
  assert.match(css, /\.file-redirect-warning\s*\{/);
  assert.match(css, /\.file-redirect-warning-card\s*\{/);
  assert.match(css, /\.file-redirect-warning-note\s*\{/);
});

test("Manifest maskable ikonları beklenen dosyalara bağlıdır", () => {
  const manifest = JSON.parse(readFileSync("manifest.webmanifest", "utf8"));
  const maskableIcons = manifest.icons.filter(icon => icon.purpose === "any maskable");

  assert.equal(maskableIcons.length, 2);
  assert.deepEqual(maskableIcons.map(icon => icon.src).sort(), ["icon-192.png", "icon-512.png"]);
  assert.ok(maskableIcons.every(icon => icon.type === "image/png"));
  assert.ok(maskableIcons.some(icon => icon.sizes === "192x192"));
  assert.ok(maskableIcons.some(icon => icon.sizes === "512x512"));

  maskableIcons.forEach(icon => {
    assert.ok(existsSync(icon.src), `${icon.src} dosyasi bulunmali`);
  });
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

test("Kaldırılan veli sayfası ve eski liste adları sistemde yer almaz", () => {
  assert.equal(existsSync(kaldirilanVeliSayfasi), false);
  const kontrolDosyalari = [...htmlFiles, "layout.js", "sw.js"];
  const sorunlar = [];

  for (const file of kontrolDosyalari) {
    const content = readFileSync(file, "utf8");
    if (content.includes(kaldirilanVeliSayfasi)) sorunlar.push(`${file}: kaldırılan sayfa referansı`);
    if (content.includes(kaldirilanVeliListesiEtiketi)) sorunlar.push(`${file}: kaldırılan sayfa etiketi`);
    if (content.includes(eskiTelefonListesiEtiketi)) sorunlar.push(`${file}: eski telefon listesi etiketi`);
  }

  assert.deepEqual(sorunlar, []);
});

test("Öğrenciler menüsü Telefon Listesi ile doğru sıradadır", () => {
  const js = readFileSync("layout.js", "utf8");
  const css = readFileSync("app.css", "utf8");
  assert.doesNotMatch(js, new RegExp(`baslik:\\s*"${kaldirilanListeMenusu}"`));
  assert.doesNotMatch(js, /dashboard\.html#ogrenci-ara/);
  assert.match(js, /baslik:\s*"Öğrenciler"[\s\S]*etiket:\s*"Yeni Öğrenci Ekle"[\s\S]*etiket:\s*"Öğrenci Listesi"[\s\S]*etiket:\s*"Telefon Listesi"/);
  assert.match(css, /\.top-menu\s*\{[\s\S]*justify-content:\s*center/);
  assert.match(css, /\.top-menu \.nav-link\s*\{[\s\S]*white-space:\s*nowrap/);
});

test("Dashboard ayrı öğrenci arama kartını tutmaz", () => {
  const html = readFileSync("dashboard.html", "utf8");
  const css = readFileSync("app.css", "utf8");

  assert.doesNotMatch(html, /id="ogrenci-ara"/);
  assert.doesNotMatch(html, /id="hizli-ogr-ara"/);
  assert.doesNotMatch(html, /hizliArama|aramaSonuclariGoster|ogrenciAramayaOdaklan/);
  assert.doesNotMatch(css, /dashboard-search-shell|dashboard-arama-kutu|dashboard-arama-sonuc/);
});

test("Mobil alt navbar grup panelleriyle çalışır", () => {
  const js = readFileSync("layout.js", "utf8");
  const css = readFileSync("app.css", "utf8");
  assert.doesNotMatch(js, new RegExp(kaldirilanFazlaSekmesi));
  assert.doesNotMatch(css, new RegExp(eskiMobilMenuSinifi));
  assert.match(js, /const\s+MOBIL_ALT_MENU_GRUPLARI/);
  assert.match(js, /baslik:\s*"Görüşmeler"/);
  assert.match(js, /baslik:\s*"Sistem"[\s\S]*etiket:\s*"Ayarlar"[\s\S]*etiket:\s*"Excel Aktarım"[\s\S]*etiket:\s*"Sınıf Atlatma"/);
  assert.match(js, /data-mobile-menu-key/);
  assert.match(js, /id="mobil-alt-menu"/);
  assert.match(js, /function\s+mobilAltMenuBagla/);
  assert.match(js, /history\.pushState/);
  assert.match(js, /popstate/);
  assert.match(js, /Offcanvas\.getOrCreateInstance/);
  assert.match(css, /\.bottom-nav-item\.aktif,\s*\n\.bottom-nav-item\.acik/);
  assert.match(css, /\.offcanvas\.offcanvas-bottom\.mobile-nav-sheet/);
  assert.match(css, /\.mobile-nav-sheet \.offcanvas-body\s*\{[\s\S]*overflow-y:\s*auto/);
});

test("Mobil üst bar aksiyonları dar ekranda taşmadan sığar", () => {
  const css = readFileSync("app.css", "utf8");
  assert.match(css, /@media \(max-width:\s*575\.98px\)[\s\S]*\.app-header\s*\{[\s\S]*max-width:\s*100vw/);
  assert.match(css, /@media \(max-width:\s*575\.98px\)[\s\S]*\.app-header\s*\{[\s\S]*overflow:\s*hidden/);
  assert.match(css, /@media \(max-width:\s*575\.98px\)[\s\S]*\.app-header > \.container-fluid\s*\{[\s\S]*overflow:\s*hidden/);
  assert.match(css, /@media \(max-width:\s*575\.98px\)[\s\S]*\.app-header \.navbar-brand\.brand-link\s*\{[\s\S]*max-width:\s*calc\(100vw - 112px\)/);
  assert.match(css, /@media \(max-width:\s*575\.98px\)[\s\S]*\.app-header \.brand-text\s*\{[\s\S]*text-overflow:\s*ellipsis/);
  assert.match(css, /@media \(max-width:\s*575\.98px\)[\s\S]*\.header-actions\s*\{[\s\S]*flex:\s*0 0 auto/);
});

test("Excel Aktarım giriş yapmış kullanıcılar tarafından açılabilir", () => {
  const layout = readFileSync("layout.js", "utf8");
  const html = readFileSync("excel-export.html", "utf8");

  assert.match(html, /import\s*\{[^}]*requireAuth[^}]*isAdminUser[^}]*\}\s*from\s*"\.\/auth\.js\?v=/);
  assert.match(html, /tcKimlikMaskele/);
  assert.match(html, /if\s*\(key\s*===\s*"s\.tc_kimlik"\)\s*return\s+tcKimlikMaskele/);
  assert.match(html, /import\s*\{\s*collection,\s*getDocs\s*\}\s*from\s*"\.\/firebase-imports\.js\?v=/);
  assert.match(html, /requireAuth\(async\s*\(\)\s*=>/);
  assert.doesNotMatch(html, /requireAdmin/);
  assert.doesNotMatch(html, /\b(addDoc|setDoc|updateDoc|deleteDoc|writeBatch)\b/);
  assert.doesNotMatch(html, /Bu sayfa yalnızca Admin içindir/);
  assert.match(html, /Giriş yapmış kullanıcılar içindir/);
  assert.match(html, /getDocs\(collection\(db,\s*"students"\)\)/);
  assert.match(html, /getDocs\(collection\(db,\s*"veliler"\)\)/);
  assert.match(html, /getDocs\(collection\(db,\s*"devamsizliklar"\)\)/);
  assert.match(html, /getDocs\(collection\(db,\s*"davranislar"\)\)/);
  assert.match(html, /getDocs\(collection\(db,\s*"veligorusmeleri"\)\)/);
  assert.match(html, /XLSX\.writeFile/);

  assert.match(layout, /\{ href: "excel-export\.html", ikon: "bi-file-earmark-excel", etiket: "Excel Aktarım" \}/);
  assert.doesNotMatch(layout, /href: "excel-export\.html"[\s\S]{0,120}adminOnly/);
  assert.doesNotMatch(layout, /baslik:\s*"Sistem"[\s\S]*?\],\s*adminOnly:\s*true/);
  assert.doesNotMatch(layout, /key:\s*"sistem"[\s\S]*?adminOnly:\s*true/);
  assert.match(layout, /href: "settings\.html", ikon: "bi-gear", etiket: "Ayarlar", adminOnly: true/);
  assert.match(layout, /href: "settings\.html#sinif-atlat", ikon: "bi-arrow-up-circle", etiket: "Sınıf Atlatma", adminOnly: true/);
});

test("Üst bar global arama her sayfaya enjekte edilir ve odakta veri yüklemez", () => {
  const layout = readFileSync("layout.js", "utf8");
  const css = readFileSync("app.css", "utf8");

  assert.match(layout, /id="global-arama-kap"/);
  assert.match(layout, /id="global-arama"/);
  assert.match(layout, /id="global-arama-sonuc"/);
  assert.match(layout, /placeholder="Öğrenci ara\.\.\."/);
  assert.match(layout, /q\.length < 2/);
  assert.match(layout, /\.replace\(/);
  assert.doesNotMatch(layout, /input\.addEventListener\("focus"[\s\S]*globalAramaYukle/);
  assert.match(css, /\.topbar-global-search\s*\{/);
  assert.match(css, /@media \(max-width:\s*767\.98px\)[\s\S]*\.topbar-global-search\s*\{[\s\S]*flex:\s*1 0 100%/);
  assert.match(css, /@media \(max-width:\s*575\.98px\)[\s\S]*\.app-header\s*\{[\s\S]*overflow:\s*visible/);
  assert.match(css, /@media \(max-width:\s*575\.98px\)[\s\S]*\.app-header > \.container-fluid\s*\{[\s\S]*overflow:\s*visible/);
});

test("TC Kimlik alanları admin dışı ekranda ve dışa aktarımda maskelenir", () => {
  const liste = readFileSync("students-list.html", "utf8");
  const detay = readFileSync("students-detail.html", "utf8");
  const excel = readFileSync("excel-export.html", "utf8");

  assert.match(liste, /isAdminUser/);
  assert.match(liste, /tcKimlikMaskele\(o\.tc_kimlik,\s*tcTamGoster\)/);
  assert.match(detay, /isAdminUser/);
  assert.match(detay, /tcKimlikMaskele\(o\.tc_kimlik,\s*isAdminUser\(\)\)/);
  assert.match(excel, /tcKimlikMaskele\(ogrenci\.tc_kimlik,\s*isAdminUser\(\)\)/);
});

test("Auth admin claim kontrolü sayfa açılışında zorunlu token yenilemez", () => {
  const js = readFileSync("auth.js", "utf8");

  assert.match(js, /getIdTokenResult\(\)/);
  assert.doesNotMatch(js, /getIdTokenResult\(true\)/);
});

test("Liste ve rapor filtreleri standart Filtrele ve Temizle düzenini kullanır", () => {
  const css = readFileSync("app.css", "utf8");
  const sayfalar = [
    "students-list.html",
    "attendance-report.html",
    "behavior-report.html",
    "meetings-list.html",
    "phone-list.html"
  ];

  for (const file of sayfalar) {
    const html = readFileSync(file, "utf8");
    assert.match(html, /report-filter-row/, `${file} ortak filtre satırı kullanmalı`);
    assert.match(html, /class="[^"]*filter-actions[^"]*"/, `${file} filter-actions kullanmalı`);
    assert.match(html, /id="filtre-uygula"[\s\S]*Filtrele/, `${file} Filtrele butonu içermeli`);
    assert.match(html, /id="filtre-temizle"[\s\S]*Temizle/, `${file} Temizle butonu içermeli`);
  }

  assert.match(css, /\.report-filter-row\s*\{/);
  assert.match(css, /\.filter-actions\s*\{/);
});

test("Davranış raporu grafiği masaüstünde tablo yüksekliğine göre ortalanmaz", () => {
  const html = readFileSync("behavior-report.html", "utf8");
  const css = readFileSync("app.css", "utf8");

  assert.match(html, /behavior-chart-card/);
  assert.match(html, /behavior-chart-body/);
  assert.doesNotMatch(html, /behavior-chart-card[^>]*h-100/);
  assert.match(css, /\.behavior-chart-card\s*\{[\s\S]*align-self:\s*flex-start/);
  assert.match(css, /\.behavior-chart-body\s*\{[\s\S]*justify-content:\s*flex-start/);
});

test("Telefon listesi masaüstünde daha geniş ve sıkı tablo düzeni kullanır", () => {
  const html = readFileSync("phone-list.html", "utf8");
  const css = readFileSync("app.css", "utf8");

  assert.match(html, /phone-list-page/);
  assert.match(html, /phone-list-table/);
  assert.match(css, /\.phone-list-page \.app-content > \.container-fluid/);
  assert.match(css, /\.phone-list-table\s*\{[\s\S]*table-layout:\s*fixed/);
});

test("Ayarlar admin uyarı ikonu hizalı özel sınıf kullanır", () => {
  const html = readFileSync("settings.html", "utf8");
  const css = readFileSync("app.css", "utf8");

  assert.match(html, /settings-admin-alert/);
  assert.match(html, /settings-admin-alert-icon/);
  assert.match(css, /\.settings-admin-alert\s*\{[\s\S]*align-items:\s*center/);
  assert.match(css, /\.settings-admin-alert-icon\s*\{[\s\S]*align-items:\s*center[\s\S]*justify-content:\s*center/);
});

test("Kayıt giriş sayfaları giriş yapmış kullanıcılar tarafından açılabilir", () => {
  const layout = readFileSync("layout.js", "utf8");
  const entryPages = [
    ["attendance-entry.html", "Devamsızlık Gir"],
    ["behavior-entry.html", "Davranış Gir"],
    ["meetings-entry.html", "Görüşme Gir"]
  ];

  for (const [file, label] of entryPages) {
    const html = readFileSync(file, "utf8");
    assert.match(html, /import\s*\{\s*requireAuth\s*\}\s*from\s*"\.\/auth\.js\?v=/, `${file} requireAuth kullanmalı`);
    assert.match(html, /requireAuth\(async\s*\(\)\s*=>/, `${file} requireAuth ile başlamalı`);
    assert.doesNotMatch(html, /requireAdmin/, `${file} admin kapısına bağlı kalmamalı`);
    assert.match(layout, new RegExp(`href: "${file}", ikon: "[^"]+", etiket: "${label}" \\}`));
    assert.doesNotMatch(layout, new RegExp(`href: "${file}"[\\s\\S]{0,120}adminOnly`));
  }

  assert.match(layout, /href: "students-add-edit\.html", ikon: "bi-person-plus", etiket: "Yeni Öğrenci Ekle", adminOnly: true/);
  assert.match(layout, /href: "settings\.html", ikon: "bi-gear", etiket: "Ayarlar", adminOnly: true/);
});

test("Öğrenci detayında ekleme kısayolları giriş yapmış kullanıcıya açıktır", () => {
  const html = readFileSync("students-detail.html", "utf8");
  const addGroup = html.match(/<div class="detail-action-group detail-action-group-add"[\s\S]*?<\/div>/)?.[0] || "";

  assert.match(addGroup, /id="devamsizlik-ekle-btn"/);
  assert.match(addGroup, /id="davranis-ekle-btn"/);
  assert.match(addGroup, /id="gorusme-ekle-btn"/);
  assert.doesNotMatch(addGroup, /data-admin-only/);

  const gorusmeEkleLink = html.match(/<a\b[^>]*id="gorusme-ekle-link"[^>]*>/)?.[0] || "";
  assert.match(gorusmeEkleLink, /id="gorusme-ekle-link"/);
  assert.doesNotMatch(gorusmeEkleLink, /data-admin-only/);

  assert.match(html, /id="duzenle-btn"[^>]*data-admin-only/);
  assert.match(html, /id="ogrenci-sil-btn"[^>]*data-admin-only/);
  assert.match(html, /data-detay-islem="devamsizlik-duzenle"[\s\S]{0,120}data-kayit-id/);
  assert.match(html, /data-detay-islem="davranis-sil"[\s\S]{0,120}data-kayit-id/);
  assert.match(html, /data-detay-islem="gorusme-sil"[\s\S]{0,120}data-kayit-id/);
});

test("Öğrenci listesinde Adı Soyadı tek linkli kolondur", () => {
  const html = readFileSync("students-list.html", "utf8");
  const tablo = html.match(/<table id="ogrenci-tablo"[\s\S]*?<\/table>/)?.[0] || "";
  assert.match(tablo, /<th>Adı Soyadı<\/th>/);
  assert.doesNotMatch(tablo, /<th>Ad<\/th>|<th>Soyad<\/th>/);
  assert.match(tablo, /colspan="8"/);
  assert.doesNotMatch(html, /colspan="9"[^>]*>Filtreleri seçip Filtrele'ye basın\./);
  assert.match(html, /function\s+ogrenciAdSoyad/);
  assert.match(html, /students-detail\.html\?id=\$\{escapeAttr\(o\.id\)\}/);
  assert.match(html, /escapeHtml\(adSoyad \|\| "—"\)/);
  assert.match(html, /order:\s*\[\[2,\s*"asc"\],\s*\[0,\s*"asc"\]\]/);
  assert.match(html, /targets:\s*\[7\]/);
  assert.match(html, /"Adı Soyadı":\s*ogrenciAdSoyad\(o\)/);
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
  const settings = readFileSync("settings.html", "utf8");
  const js = readFileSync("class-promotion.js", "utf8");
  const sw = readFileSync("sw.js", "utf8");
  assert.match(html, /settings\.html#sinif-atlat/);
  assert.match(html, /location\.replace\("settings\.html#sinif-atlat"\)/);
  assert.match(sw, /"\.\/class-promotion\.html"/);
  assert.match(sw, /"\.\/settings\.html"/);
  assert.match(sw, /"\.\/class-promotion\.js"/);
  assert.match(settings, /id="sinif-atlat-root"/);
  assert.match(settings, /import\("\.\/class-promotion\.js\?v=/);
  assert.match(js, /Sınıf Düzeyi Aktarım Tablosu/);
  assert.match(js, /<th>Sınıf Grubu<\/th>/);
  assert.match(js, /<th>Şubeler<\/th>/);
  assert.match(js, /data-grup-key/);
  assert.doesNotMatch(js, /data-ogr-id/);
  assert.doesNotMatch(js, /islemler\[o\.id\]/);
  assert.match(js, /function\s+sinifGruplariniHazirla/);
  assert.match(js, /function\s+grupVarsayilanIslem/);
  assert.match(js, /function\s+ogrenciIslemi/);
  assert.match(js, /function\s+grupOzeti/);
  assert.match(js, /9→10, 10→11, 11→12/);
});

test("Görüşme girişinde açıklama ve masaüstü kayıt butonu düzeni vardır", () => {
  const html = readFileSync("meetings-entry.html", "utf8");
  const css = readFileSync("app.css", "utf8");
  assert.match(html, /gorusme-bilgi-kutusu/);
  assert.match(html, /role="note"/);
  assert.match(html, /Görüşme kaydı için kısa not/);
  assert.match(html, /gorusme-form-actions/);
  assert.match(html, /gorusme-kaydet-btn/);
  assert.match(css, /\.gorusme-bilgi-kutusu/);
  assert.match(css, /\.gorusme-form-actions/);
  assert.match(css, /\.gorusme-kaydet-btn/);
  assert.match(css, /@media \(min-width:\s*768px\)[\s\S]*\.gorusme-kaydet-btn/);
});

test("Davranış girişinde açıklama ve masaüstü kayıt butonu düzeni vardır", () => {
  const html = readFileSync("behavior-entry.html", "utf8");
  const css = readFileSync("app.css", "utf8");
  assert.match(html, /davranis-bilgi-kutusu/);
  assert.match(html, /role="note"/);
  assert.match(html, /Davranış kaydı için kısa not/);
  assert.match(html, /davranis-form-actions/);
  assert.match(html, /davranis-kaydet-btn/);
  assert.match(css, /\.davranis-bilgi-kutusu/);
  assert.match(css, /\.davranis-form-actions/);
  assert.match(css, /\.davranis-kaydet-btn/);
  assert.match(css, /@media \(min-width:\s*768px\)[\s\S]*\.davranis-kaydet-btn/);
});

test("PWA güncelleme bildirimi masaüstünde form eylemlerini örtmez", () => {
  const css = readFileSync("app.css", "utf8");
  const js = readFileSync("pwa.js", "utf8");
  assert.match(js, /classList\.add\("pwa-guncelle-var"\)/);
  assert.match(css, /#pwa-guncelle-bildirimi\s*\{[\s\S]*right:\s*1rem/);
  assert.match(css, /#pwa-guncelle-bildirimi\s*\{[\s\S]*width:\s*min\(360px,\s*calc\(100vw - 2rem\)\)/);
  assert.match(css, /body\.pwa-guncelle-var \.app-wrapper/);
  assert.match(css, /@media \(max-width:\s*767\.98px\)[\s\S]*#pwa-guncelle-bildirimi[\s\S]*bottom:\s*calc\(var\(--obs-bottom-nav-height\)/);
});

test("Filtre sayfalarında Excel aktarımı filtre uygulanmadan çalışmaz", () => {
  const veriListeleri = {
    "students-list.html": "tumOgrenciler",
    "attendance-report.html": "raporVerisi",
    "behavior-report.html": "raporVerisi",
    "meetings-list.html": "raporVerisi",
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

test("Dashboard dağılım kartı geniş sınıf grafiği ve yatılılık halkası kullanır", () => {
  const html = readFileSync("dashboard.html", "utf8");
  const css = readFileSync("app.css", "utf8");
  assert.match(html, /dashboard-distribution-grid/);
  assert.match(html, /id="cinsiyet-donut"[\s\S]*id="sinif-barlar"[\s\S]*id="yatililik-donut"/);
  assert.match(html, /id="yatililik-toplam"/);
  assert.match(html, /function\s+donutGradient/);
  assert.match(html, /var\(--obs-secondary\)/);
  assert.match(html, /var\(--obs-success\)/);
  assert.match(html, /const\s+toplamYatililik\s*=\s*parali\s*\+\s*parasiz/);
  assert.doesNotMatch(html, /\{\s*ad:\s*"Gündüzlü"/);
  assert.match(css, /\.dashboard-distribution-grid\s*\{/);
  assert.match(css, /\.dashboard-donut-panel \.grafik-donut\s*\{[\s\S]*width:\s*150px;[\s\S]*height:\s*150px;[\s\S]*flex:\s*0 0 150px/);
  assert.match(css, /grid-template-columns:\s*minmax\(180px,\s*220px\)\s*minmax\(680px,\s*1fr\)\s*minmax\(170px,\s*210px\)/);
  assert.match(css, /\.sinif-barlar-kap\s*\{[\s\S]*display:\s*grid/);
  assert.match(css, /grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(38px,\s*1fr\)\)/);
  assert.match(css, /@media \(max-width:\s*575\.98px\)[\s\S]*\.sinif-barlar-kap\s*\{[\s\S]*display:\s*flex/);
  assert.match(css, /@media \(max-width:\s*575\.98px\)[\s\S]*\.sinif-barlar-kap\s*\{[\s\S]*overflow-x:\s*auto/);
  assert.match(html, /ad:\s*"Parasız"[\s\S]*ad:\s*"Paralı"/);
  assert.doesNotMatch(html, /ad:\s*"Parasız Yatılı"|ad:\s*"Paralı Yatılı"/);
  assert.match(html, /href="attendance-report\.html\?durum=\$\{encodeURIComponent\(k\.key\)\}"/);
  assert.match(css, /\.dashboard-yatililik-legend\s*\{[\s\S]*flex-direction:\s*row/);
  assert.match(css, /\.devamsizlik-ozet-link\s*\{/);
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

test("Dashboard doğum günü kartını davranış kayıtlarından önce gösterir", () => {
  const html = readFileSync("dashboard.html", "utf8");
  const dogumIndex = html.indexOf("Doğum Günleri");
  const davranisIndex = html.indexOf("Son Davranış Kayıtları");

  assert.ok(dogumIndex !== -1, "Doğum Günleri kartı bulunmalı");
  assert.ok(davranisIndex !== -1, "Son Davranış Kayıtları kartı bulunmalı");
  assert.ok(dogumIndex < davranisIndex, "Doğum Günleri kartı önce gelmeli");
});

test("Dashboard devamsızlık tablosu dar kartta okunabilirlik sözleşmesini korur", () => {
  const html = readFileSync("dashboard.html", "utf8");
  const css = readFileSync("app.css", "utf8");
  const tablo = html.match(/<table class="[^"]*dashboard-attendance-table[^"]*"[\s\S]*?<\/table>/)?.[0] || "";

  assert.match(html, /dashboard-attendance-responsive/);
  assert.match(tablo, /<th>Öğrenci<\/th>[\s\S]*<th>Sınıf<\/th>[\s\S]*<th class="text-center">Özürsüz<\/th>[\s\S]*<th class="text-center">Özürlü<\/th>[\s\S]*<th class="text-center">Durum<\/th>/);
  assert.match(css, /\.dashboard-attendance-table\s*\{[\s\S]*table-layout:\s*fixed/);
  assert.match(css, /\.dashboard-attendance-table\s*\{[\s\S]*min-width:\s*560px/);
  assert.match(css, /\.dashboard-attendance-responsive\s*\{[\s\S]*overflow-x:\s*auto/);
  assert.match(css, /\.dashboard-attendance-table th:nth-child\(1\),[\s\S]*\.dashboard-attendance-table td:nth-child\(1\)\s*\{[\s\S]*width:\s*34%/);
  assert.match(css, /\.dashboard-attendance-table th:nth-child\(5\),[\s\S]*\.dashboard-attendance-table td:nth-child\(5\)\s*\{[\s\S]*width:\s*23%/);
  assert.match(css, /\.dashboard-attendance-table td:first-child a\s*\{[\s\S]*white-space:\s*normal/);
  assert.match(css, /\.dashboard-attendance-table td:first-child a\s*\{[\s\S]*overflow-wrap:\s*anywhere/);
  assert.match(css, /@media \(max-width:\s*575\.98px\)[\s\S]*\.dashboard-attendance-table\s*\{[\s\S]*min-width:\s*520px/);
  assert.match(css, /@media \(max-width:\s*575\.98px\)[\s\S]*\.dashboard-attendance-table \.badge\s*\{[\s\S]*font-size:\s*\.68rem/);
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
