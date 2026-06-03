/**
 * layout.js — Ortak üst menü ve bottom navbar'ı sayfaya enjekte eder.
 * Her sayfada <div id="sidebar-kap"></div> ve <div id="bottom-nav-kap"></div> olmalı.
 */
import { APP_VERSION, APP_UPDATED_AT } from "./version.js?v=20260603-52";
import { okulAyarlariGetir, okulDonemiEtiketi } from "./school-settings.js?v=20260603-52";
import { escapeHtml } from "./utils.js?v=20260603-52";

let layoutYuklendi = false;
let yazdirmaBaglandi = false;
let yazdirmaDtDurumlari = [];
let yazdirmaSekmeDurumlari = [];
let yazdirmaHazir = false;

const MENU_GRUPLARI = [
  {
    baslik: "Öğrenciler",
    ogeler: [
      { href: "dashboard.html#ogrenci-ara", ikon: "bi-search", etiket: "Öğrenci Ara" },
      { href: "students-list.html", ikon: "bi-people", etiket: "Öğrenci Listesi" },
      { href: "students-add-edit.html", ikon: "bi-person-plus", etiket: "Yeni Öğrenci Ekle", adminOnly: true }
    ]
  },
  {
    baslik: "Listeler",
    ogeler: [
      { href: "phone-list.html", ikon: "bi-telephone-fill", etiket: "Toplu Telefon Listesi" },
      { href: "parents-list.html", ikon: "bi-people-fill", etiket: "Veli Listesi" }
    ]
  },
  {
    baslik: "Devamsızlık",
    ogeler: [
      { href: "attendance-entry.html", ikon: "bi-calendar-x", etiket: "Devamsızlık Gir", adminOnly: true },
      { href: "attendance-report.html", ikon: "bi-calendar-check", etiket: "Devamsızlık Raporu" }
    ]
  },
  {
    baslik: "Davranış",
    ogeler: [
      { href: "behavior-entry.html", ikon: "bi-star-half", etiket: "Davranış Gir", adminOnly: true },
      { href: "behavior-report.html", ikon: "bi-bar-chart", etiket: "Davranış Raporu" }
    ]
  },
  {
    baslik: "Veli Görüşmeleri",
    ogeler: [
      { href: "meetings-entry.html", ikon: "bi-chat-dots", etiket: "Görüşme Gir", adminOnly: true },
      { href: "meetings-list.html", ikon: "bi-chat-square-text", etiket: "Görüşme Listesi" }
    ]
  },
  {
    baslik: "Sistem",
    ogeler: [
      { href: "excel-export.html", ikon: "bi-file-earmark-excel", etiket: "Excel Aktarım", adminOnly: true },
      { href: "class-promotion.html", ikon: "bi-arrow-up-circle", etiket: "Sınıf Atlatma", adminOnly: true },
      { href: "settings.html", ikon: "bi-gear", etiket: "Ayarlar", adminOnly: true }
    ],
    adminOnly: true
  }
];

// Aktif menü öğesini belirle
function aktifMi(href) {
  const mevcut = window.location.pathname;
  // Hem tam yol hem de sadece dosya adı karşılaştırması
  const dosyaAdi = href.split("/").pop();
  return mevcut.endsWith(href) || mevcut.endsWith(dosyaAdi) ? "active" : "";
}

export function layoutYukle() {
  if (layoutYuklendi) return;
  layoutYuklendi = true;
  yukleTopbar();
  yukleSidebar();
  yukleBottomNav();
  yukleFooter();
  okulDonemiYukle();
  baglaYazdirmaYardimcilari();
}

function yukleFooter() {
  const kap = document.getElementById("footer-kap");
  if (!kap) return;
  kap.outerHTML = `
    <footer class="app-footer">
      <div class="float-end d-none d-sm-inline">
        <span id="footer-okul-donem">2025-2026 · 2. Dönem</span>
        <span class="mx-2">·</span>
        <span>v${APP_VERSION} · ${APP_UPDATED_AT}</span>
      </div>
      <strong>© 2026 AYUSTASI</strong>
    </footer>`;
}

async function okulDonemiYukle() {
  const el = document.getElementById("footer-okul-donem");
  if (!el) return;
  try {
    const ayarlar = await okulAyarlariGetir();
    el.textContent = okulDonemiEtiketi(ayarlar);
  } catch {
    el.textContent = "2025-2026 · 2. Dönem";
  }
}

function baglaYazdirmaYardimcilari() {
  if (yazdirmaBaglandi) return;
  yazdirmaBaglandi = true;
  yazdirmaBasliginiGuncelle();
  window.obsYazdir = obsYazdir;
  document.addEventListener("click", yazdirmaTiklamaDinle);
  window.addEventListener("beforeprint", () => {
    if (!yazdirmaHazir) yazdirmayaHazirla();

    if (window.innerWidth < 768) {
      const meta = document.querySelector("meta[name='viewport']");
      if (meta) {
        meta._eskiIcerik = meta.content;
        meta.content = "width=1024";
      }
    }
  });
  window.addEventListener("afterprint", () => {
    yazdirmaHazirliginiTemizle();

    const meta = document.querySelector("meta[name='viewport']");
    if (meta && meta._eskiIcerik) {
      meta.content = meta._eskiIcerik;
      delete meta._eskiIcerik;
    }
  });
}

function yazdirmaTiklamaDinle(e) {
  const hedef = e.target.closest?.("[data-obs-print]");
  if (!hedef) return;
  e.preventDefault();
  obsYazdir();
}

function obsYazdir() {
  yazdirmayaHazirla();
  setTimeout(() => {
    try {
      window.print();
    } catch {
      yazdirmaHazirliginiTemizle();
    }
  }, 180);
}

function yazdirmayaHazirla() {
  yazdirmaBasliginiGuncelle();
  if (yazdirmaDtDurumlari.length === 0) dataTableTumSatirlariGoster();
  yazdirmaSekmeleriniGoster();
  yazdirmaSayfaSinifiGuncelle();
  yazdirmaTabloBasliklariEkle();
  listeYazdirmaTablolariEkle();
  yazdirmaHazir = true;
}

function yazdirmaHazirliginiTemizle() {
  yazdirmaGeciciSatirlariTemizle();
  listeYazdirmaTablolariTemizle();
  dataTableSayfalamayiGeriAl();
  yazdirmaSekmeleriniGeriAl();
  yazdirmaTabloBasliklariTemizle();
  document.body.classList.remove("obs-print-landscape");
  document.querySelectorAll(".obs-print-wide-card").forEach(card => card.classList.remove("obs-print-wide-card"));
  yazdirmaHazir = false;
}

function yazdirmaSekmeleriniGoster() {
  if (!document.body.classList.contains("student-detail-page") || yazdirmaSekmeDurumlari.length > 0) return;
  document.querySelectorAll(".student-detail-page .tab-content > .tab-pane").forEach(pane => {
    yazdirmaSekmeDurumlari.push({
      el: pane,
      className: pane.className,
      display: pane.style.display
    });
    pane.classList.add("show", "active");
    pane.style.display = "block";
  });
}

function yazdirmaSekmeleriniGeriAl() {
  yazdirmaSekmeDurumlari.forEach(({ el, className, display }) => {
    if (!el.isConnected) return;
    el.className = className;
    el.style.display = display;
  });
  yazdirmaSekmeDurumlari = [];
}

function yazdirmaBasliginiGuncelle() {
  const baslik = document.querySelector(".app-content-header h3")?.textContent?.trim()
    || document.title
    || "Öğrenci Bilgileri";
  document.body.dataset.printTitle = baslik;
}

function yazdirmaSayfaSinifiGuncelle() {
  document.querySelectorAll(".obs-print-wide-card").forEach(card => card.classList.remove("obs-print-wide-card"));
  const genisTablolar = Array.from(document.querySelectorAll(".print-landscape"))
    .filter(el => el.offsetParent !== null || el.getClientRects().length > 0);
  genisTablolar.forEach(table => table.closest(".card")?.classList.add("obs-print-wide-card"));
  const yatayGerekli = genisTablolar
    .some(el => el.offsetParent !== null || el.getClientRects().length > 0);
  document.body.classList.toggle("obs-print-landscape", yatayGerekli);
}

function yazdirmaTabloBasliklariEkle() {
  yazdirmaTabloBasliklariTemizle();
  const sayfaBaslik = document.body.dataset.printTitle || document.title || "Öğrenci Bilgileri";
  document.querySelectorAll("table").forEach(table => {
    if (table.closest(".no-print") || !table.tHead) return;
    if (table.closest("[data-obs-print-list-pages]")) return;
    if (document.body.classList.contains("obs-list-print-pages") && table.classList.contains("print-landscape")) return;
    const ilkBaslikSatiri = Array.from(table.tHead.rows).find(row => row.cells.length);
    if (!ilkBaslikSatiri) return;
    const kolonSayisi = Math.max(1, Array.from(ilkBaslikSatiri.cells).filter(cell => !cell.classList.contains("no-print")).length);
    const tabloBaslik = tabloBasligiBul(table);
    const tamBaslik = tabloBaslik && tabloBaslik !== sayfaBaslik
      ? `${sayfaBaslik} - ${tabloBaslik}`
      : sayfaBaslik;
    const row = table.tHead.insertRow(0);
    row.setAttribute("data-obs-print-title-row", "true");
    const cell = document.createElement("th");
    cell.colSpan = kolonSayisi;
    cell.textContent = tamBaslik;
    row.appendChild(cell);
  });
}

function yazdirmaTabloBasliklariTemizle() {
  document.querySelectorAll("[data-obs-print-title-row]").forEach(row => row.remove());
}

function yazdirmaGeciciSatirlariTemizle() {
  document.querySelectorAll("[data-obs-print-class-row]").forEach(row => row.remove());
}

function listeYazdirmaTablolariTemizle() {
  document.querySelectorAll("[data-obs-print-list-pages]").forEach(el => el.remove());
  document.querySelectorAll(".obs-print-original-list-card").forEach(el => el.classList.remove("obs-print-original-list-card"));
  document.body.classList.remove("obs-list-print-pages");
}

function listeYazdirmaTablolariEkle() {
  listeYazdirmaTablolariTemizle();
  const tablolar = Array.from(document.querySelectorAll("table.print-landscape"))
    .filter(table => !table.closest(".no-print") && table.tHead && table.tBodies?.[0]);
  if (!tablolar.length) return;

  let sayfaIndex = 0;
  for (const table of tablolar) {
    const basliklar = listeYazdirmaBasliklari(table);
    const satirlar = listeYazdirmaSatirlari(table);
    if (!basliklar.length || !satirlar.length) continue;

    const kapsayici = document.createElement("div");
    kapsayici.setAttribute("data-obs-print-list-pages", "true");

    const sayfaBaslik = document.body.dataset.printTitle || document.title || "Liste";
    const sinifIndex = basliklar.findIndex(baslik => {
      const temiz = normalizeYazdirmaBaslik(baslik);
      return temiz === "sinif" || temiz === "sinifi";
    });
    const gruplar = listeYazdirmaGruplari(satirlar, sinifIndex);
    const genislikler = listeYazdirmaKolonGenislikleri(basliklar);

    Array.from(gruplar.entries()).forEach(([sinif, hucreGruplari]) => {
      const bolum = document.createElement("section");
      bolum.className = "obs-print-list-page";
      if (sayfaIndex === 0) bolum.classList.add("obs-print-first-list-page");

      const printTable = document.createElement("table");
      printTable.className = "table table-sm mb-0 align-middle print-list-page-table";
      printTable.dataset.sourceTable = table.id || "";
      printTable.appendChild(listeYazdirmaColgroup(genislikler));

      const thead = printTable.createTHead();
      const titleRow = thead.insertRow();
      titleRow.setAttribute("data-obs-print-title-row", "true");
      titleRow.className = "obs-list-print-title-row";
      const titleCell = document.createElement("th");
      titleCell.colSpan = basliklar.length;
      titleCell.textContent = sinif ? `${sinif} ${sayfaBaslik}` : sayfaBaslik;
      titleRow.appendChild(titleCell);

      const headerRow = thead.insertRow();
      headerRow.className = "obs-list-print-column-row";
      basliklar.forEach(baslik => {
        const th = document.createElement("th");
        th.textContent = baslik;
        if (listeYazdirmaSarilabilirMi(baslik)) th.classList.add("print-wrap");
        headerRow.appendChild(th);
      });

      const tbody = printTable.createTBody();
      hucreGruplari.forEach(hucreler => {
        const tr = tbody.insertRow();
        hucreler.forEach((cell, cellIndex) => {
          const td = tr.insertCell();
          td.textContent = listeYazdirmaHucreMetni(table, basliklar[cellIndex], cell);
          if (listeYazdirmaSarilabilirMi(basliklar[cellIndex])) td.classList.add("print-wrap");
        });
      });

      bolum.appendChild(printTable);
      kapsayici.appendChild(bolum);
      sayfaIndex++;
    });

    const kart = table.closest(".card") || table.closest(".table-responsive") || table.parentElement;
    kart?.classList.add("obs-print-original-list-card");
    (kart || table).after(kapsayici);
  }

  if (sayfaIndex > 0) document.body.classList.add("obs-list-print-pages");
}

function listeYazdirmaBasliklari(table) {
  const headerRows = Array.from(table.tHead?.rows || []);
  const headerRow = headerRows.reverse().find(row => row.cells.length);
  if (!headerRow) return [];
  return Array.from(headerRow.cells)
    .filter(cell => !cell.classList.contains("no-print"))
    .map(cell => {
      const clone = cell.cloneNode(true);
      clone.querySelectorAll(".dt-column-order").forEach(el => el.remove());
      return clone.textContent.replace(/\s+/g, " ").trim();
    })
    .filter(Boolean);
}

function listeYazdirmaSatirlari(table) {
  return Array.from(table.tBodies?.[0]?.rows || [])
    .filter(row => !row.hasAttribute("data-obs-print-class-row"))
    .filter(row => !row.querySelector("td[colspan]"))
    .map(row => Array.from(row.cells).filter(cell => !cell.classList.contains("no-print")))
    .filter(hucreler => hucreler.length > 0);
}

function listeYazdirmaGruplari(satirlar, sinifIndex) {
  const gruplar = new Map();
  if (sinifIndex < 0) {
    gruplar.set("", satirlar);
    return gruplar;
  }

  satirlar.forEach(hucreler => {
    const sinif = (hucreler[sinifIndex]?.textContent || "").replace(/\s+/g, " ").trim() || "Sınıf";
    if (!gruplar.has(sinif)) gruplar.set(sinif, []);
    gruplar.get(sinif).push(hucreler);
  });
  return new Map(Array.from(gruplar.entries()).sort(([a], [b]) => compareYazdirmaSinif(a, b)));
}

function listeYazdirmaColgroup(genislikler) {
  const colgroup = document.createElement("colgroup");
  genislikler.forEach(genislik => {
    const col = document.createElement("col");
    col.style.width = `${genislik.toFixed(2)}%`;
    colgroup.appendChild(col);
  });
  return colgroup;
}

function listeYazdirmaKolonGenislikleri(basliklar) {
  const agirliklar = basliklar.map(listeYazdirmaKolonAgirligi);
  const toplam = agirliklar.reduce((sum, deger) => sum + deger, 0) || 1;
  return agirliklar.map(deger => (deger / toplam) * 100);
}

function listeYazdirmaKolonAgirligi(baslik) {
  const temiz = normalizeYazdirmaBaslik(baslik);
  if (temiz === "sira") return 4;
  if (temiz === "no" || temiz.endsWith(" no")) return 6;
  if (temiz === "sinif" || temiz === "sinifi") return 6;
  if (temiz.includes("tarih")) return 9;
  if (temiz.includes("tc kimlik")) return 11;
  if (temiz.includes("telefon") || temiz.includes(" tel")) return 13;
  if (temiz.includes("e posta") || temiz.includes("eposta")) return 16;
  if (temiz.includes("ad soyad")) return 24;
  if (temiz === "ogrenci" || temiz === "veli") return 20;
  if (temiz.includes("ogrenci")) return 20;
  if (temiz.includes("yakinlik")) return 9;
  if (temiz.includes("veli adi") || temiz.includes("baba adi") || temiz.includes("anne adi")) return 17;
  if (temiz.includes("aciklama")) return 30;
  if (temiz.includes("konu")) return 20;
  if (temiz.includes("universite") || temiz.includes("bolum")) return 20;
  if (temiz.includes("yatili")) return 14;
  if (temiz.includes("cinsiyet")) return 7;
  if (temiz.includes("devamsizlik")) return 18;
  if (temiz.includes("ozur") || temiz.includes("toplam")) return 10;
  if (temiz.includes("durum")) return 12;
  if (temiz === "tur") return 8;
  if (temiz.includes("kategori")) return 12;
  return 12;
}

function listeYazdirmaSarilabilirMi(baslik) {
  const temiz = normalizeYazdirmaBaslik(baslik);
  return temiz.includes("aciklama")
    || temiz.includes("ad soyad")
    || temiz.includes("adi soyadi")
    || temiz.includes("ogrenci adi")
    || temiz.includes("veli adi");
}

function listeYazdirmaHucreMetni(table, baslik, cell) {
  const metin = (cell?.textContent || "").replace(/\s+/g, " ").trim() || "—";
  if (table.id === "ogrenci-tablo" && normalizeYazdirmaBaslik(baslik).includes("devamsizlik")) {
    return listeYazdirmaDevamsizlikMetni(metin);
  }
  return metin;
}

function listeYazdirmaDevamsizlikMetni(value) {
  const temiz = (value || "").replace(/\s+/g, " ").trim();
  if (!temiz || temiz === "—" || temiz === "-") return "—";
  const eslesme = temiz.replace(/\s+/g, "").match(/^(\d+(?:[.,]\d+)?)\/(\d+(?:[.,]\d+)?)$/);
  if (!eslesme) return temiz;
  const ozursuz = eslesme[1].replace(".", ",");
  const ozurlu = eslesme[2].replace(".", ",");
  return `${ozursuz} Ö.süz / ${ozurlu} Ö.lü`;
}

function normalizeYazdirmaBaslik(value) {
  return String(value || "")
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function compareYazdirmaSinif(a, b) {
  const pa = yazdirmaSinifParcala(a);
  const pb = yazdirmaSinifParcala(b);
  return pa.seviye - pb.seviye || pa.sube.localeCompare(pb.sube, "tr") || String(a).localeCompare(String(b), "tr");
}

function yazdirmaSinifParcala(value) {
  const match = String(value || "").trim().match(/^(\d+)\s*([A-Za-zÇĞİÖŞÜçğıöşü]*)/);
  if (!match) return { seviye: 999, sube: String(value || "") };
  return { seviye: Number(match[1]), sube: match[2] || "" };
}

function tabloBasligiBul(table) {
  if (table.classList.contains("print-landscape")) return "";
  const card = table.closest(".card");
  const cardBaslik = card?.querySelector(".card-header h6, .card-header h5, .card-header h4")?.textContent?.trim();
  if (cardBaslik) return cardBaslik.replace(/\s+/g, " ");
  const printBaslik = table.closest(".card-body")?.querySelector(".print-baslik h5")?.textContent?.trim();
  if (printBaslik) return printBaslik.replace(/\s+/g, " ");
  return "";
}

function dataTableKaynak() {
  if (window.DataTable?.tables && window.DataTable?.Api) {
    return { tables: window.DataTable.tables.bind(window.DataTable), Api: window.DataTable.Api };
  }
  const jqueryDataTable = window.jQuery?.fn?.dataTable;
  if (jqueryDataTable?.tables && jqueryDataTable?.Api) {
    return { tables: jqueryDataTable.tables.bind(jqueryDataTable), Api: jqueryDataTable.Api };
  }
  return null;
}

function dataTableTumSatirlariGoster() {
  const kaynak = dataTableKaynak();
  if (!kaynak) return;
  try {
    const tumTablolar = kaynak.tables({ api: true });
    yazdirmaDtDurumlari = [];
    if (tumTablolar?.iterator) {
      tumTablolar.iterator("table", function(settings) {
        const api = dataTableApiOlustur(kaynak, settings, this);
        dataTableSayfayiGenislet(api);
      });
    } else {
      dataTableSayfayiGenislet(tumTablolar);
    }
  } catch {
    yazdirmaDtDurumlari = [];
  }
}

function dataTableApiOlustur(kaynak, settings, baglam) {
  if (baglam?.page?.len) return baglam;
  if (baglam?.api) {
    try {
      const api = baglam.api();
      if (api?.page?.len) return api;
    } catch {}
  }
  if (kaynak.Api) {
    try {
      return new kaynak.Api(settings);
    } catch {}
  }
  return null;
}

function dataTableSayfayiGenislet(api) {
  if (!api?.page?.len || !api?.page?.info) return;
  try {
    const bilgi = api.page.info();
    const uzunluk = api.page.len();
    if (!bilgi || uzunluk === undefined || uzunluk === -1) return;
    yazdirmaDtDurumlari.push({ api, sayfa: bilgi.page, uzunluk });
    api.page.len(-1).draw(false);
  } catch {}
}

function dataTableSayfalamayiGeriAl() {
  for (const durum of yazdirmaDtDurumlari) {
    try {
      durum.api.page.len(durum.uzunluk).draw(false);
      durum.api.page(durum.sayfa).draw(false);
    } catch {
      // Yazdırma sonrası tablo zaten yenilendiyse geri alma sessizce atlanır.
    }
  }
  yazdirmaDtDurumlari = [];
}

function yukleTopbar() {
  const kap = document.getElementById("topbar-kap");
  if (!kap) return;
  kap.outerHTML = `
    <nav class="app-header navbar navbar-expand bg-body">
      <div class="container-fluid">
        <a href="dashboard.html" class="navbar-brand brand-logo-only d-flex align-items-center" aria-label="Ana sayfa" title="Ana sayfa">
          <span class="brand-logo-mark"><img src="icon-192.png?v=20260603-52" alt="Öğrenci Bilgileri"></span>
        </a>
        <div class="header-center d-none d-md-flex align-items-center gap-3">
          <ul class="navbar-nav top-menu">
            ${MENU_GRUPLARI.map(topMenuDropdown).join("")}
          </ul>
          <div class="global-arama-kutu d-none d-md-block" id="global-arama-kap">
            <i class="bi bi-search arama-ikon"></i>
            <input type="search" class="form-control form-control-sm" id="global-arama" placeholder="Öğrenci ara..." autocomplete="off" data-testid="global-search-input">
            <div class="global-arama-sonuc d-none" id="global-arama-sonuc"></div>
          </div>
        </div>
        <div class="header-actions d-flex align-items-center gap-2">
          <span class="nav-ikon-btn cevrimici" id="baglanti-durum" title="Bağlantı durumu kontrol ediliyor..." role="status" aria-live="polite" aria-label="Bağlantı durumu kontrol ediliyor" data-testid="connection-status">
            <i class="bi bi-wifi"></i>
          </span>
          <a class="nav-ikon-btn d-none" href="#" id="pwa-yukle-btn" title="Uygulamayı cihaza yükle" aria-label="Uygulamayı cihaza yükle" data-testid="pwa-install-btn">
            <i class="bi bi-download"></i>
          </a>
          <a class="nav-ikon-btn" href="#" id="cikis-btn" title="Çıkış Yap" aria-label="Çıkış yap" data-testid="logout-btn">
            <i class="bi bi-box-arrow-right"></i>
          </a>
        </div>
      </div>
    </nav>`;

  document.getElementById("cikis-btn")?.addEventListener("click", async (e) => {
    e.preventDefault();
    const { logout } = await import("./auth.js?v=20260603-52");
    logout();
  });

  topbarAraclariBagla();
  baglantiDurumuBaslat();
}

// ── Üst bar araçları: PWA yükle + global arama ──────────────────────────────
let _gaOgrenciler = null;

function topbarAraclariBagla() {
  const pwaBtn = document.getElementById("pwa-yukle-btn");
  if (window._pwaInstallPrompt && pwaBtn) pwaBtn.classList.remove("d-none");
  pwaBtn?.addEventListener("click", async (e) => {
    e.preventDefault();
    const istem = window._pwaInstallPrompt;
    if (!istem) return;
    istem.prompt();
    try { await istem.userChoice; } catch {}
    window._pwaInstallPrompt = null;
    pwaBtn.classList.add("d-none");
  });
  window.addEventListener("appinstalled", () => pwaBtn?.classList.add("d-none"));
  globalAramaBagla();
}

async function globalAramaYukle() {
  if (_gaOgrenciler) return _gaOgrenciler;
  const { tumOgrencileriGetir } = await import("./students.js?v=20260603-52");
  _gaOgrenciler = await tumOgrencileriGetir();
  return _gaOgrenciler;
}

function globalAramaBagla() {
  const input = document.getElementById("global-arama");
  const kutu = document.getElementById("global-arama-kap");
  const sonucEl = document.getElementById("global-arama-sonuc");
  if (!input || !sonucEl || !kutu) return;

  let aktifIndex = -1;
  const norm = s => String(s || "").toLocaleLowerCase("tr-TR");
  const kapat = () => { sonucEl.classList.add("d-none"); aktifIndex = -1; };

  input.addEventListener("focus", () => { globalAramaYukle().catch(() => {}); });

  input.addEventListener("input", async () => {
    const q = norm(input.value.trim());
    if (q.length < 2) { kapat(); return; }
    let liste;
    try { liste = await globalAramaYukle(); } catch { return; }
    const sonuclar = liste.filter(o =>
      norm(`${o.ad || ""} ${o.soyad || ""}`).includes(q) ||
      norm(o.id).includes(q) ||
      norm(o.sinif).includes(q)
    ).slice(0, 12);

    sonucEl.innerHTML = sonuclar.length
      ? sonuclar.map((o, i) => `
        <a class="ga-item" href="students-detail.html?id=${encodeURIComponent(o.id)}" data-i="${i}">
          <i class="bi bi-person-circle text-muted"></i>
          <span class="flex-grow-1">
            <span class="ga-ad">${escapeHtml(`${o.ad || ""} ${o.soyad || ""}`.trim() || "—")}</span>
            <span class="ga-meta d-block">No: ${escapeHtml(o.id)} · ${escapeHtml(o.sinif || "—")} · ${escapeHtml(o.cinsiyet || "")}</span>
          </span>
        </a>`).join("")
      : `<div class="ga-bos">Sonuç bulunamadı</div>`;
    sonucEl.classList.remove("d-none");
    aktifIndex = -1;
  });

  input.addEventListener("keydown", (e) => {
    const items = [...sonucEl.querySelectorAll(".ga-item")];
    if (e.key === "ArrowDown") { e.preventDefault(); aktifIndex = Math.min(aktifIndex + 1, items.length - 1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); aktifIndex = Math.max(aktifIndex - 1, 0); }
    else if (e.key === "Enter") { if (items[aktifIndex]) { e.preventDefault(); location.href = items[aktifIndex].href; } return; }
    else if (e.key === "Escape") { kapat(); return; }
    else return;
    items.forEach((it, i) => it.classList.toggle("aktif", i === aktifIndex));
    items[aktifIndex]?.scrollIntoView({ block: "nearest" });
  });

  document.addEventListener("click", (e) => { if (!kutu.contains(e.target)) kapat(); });
}

// ── Firestore bağlantı durumu göstergesi ────────────────────────────────────
async function baglantiDurumuBaslat() {
  const el = document.getElementById("baglanti-durum");
  if (!el) return;
  const ikon = el.querySelector("i");
  const guncelle = (cevrimici) => {
    el.classList.toggle("cevrimici", cevrimici);
    el.classList.toggle("cevrimdisi", !cevrimici);
    if (ikon) ikon.className = cevrimici ? "bi bi-wifi" : "bi bi-wifi-off";
    el.title = cevrimici ? "Çevrimiçi — Firestore bağlı" : "Çevrimdışı — önbellekten çalışıyor";
    el.setAttribute("aria-label", el.title);
  };
  guncelle(navigator.onLine);
  window.addEventListener("online", () => guncelle(true));
  window.addEventListener("offline", () => guncelle(false));

  try {
    const { db } = await import("./firebase-config.js?v=20260603-52");
    const { collection, query, limit, onSnapshot } =
      await import("./firebase-imports.js?v=20260603-52");
    const q = query(collection(db, "_settings"), limit(1));
    onSnapshot(q, { includeMetadataChanges: true },
      (snap) => guncelle(!snap.metadata.fromCache && navigator.onLine),
      () => {}
    );
  } catch {}
}

function yukleSidebar() {
  const kap = document.getElementById("sidebar-kap");
  if (!kap) return;
  kap.innerHTML = "";
}

function topMenuDropdown(grup) {
  if (grup.href) {
    return `
    <li class="nav-item">
      <a class="nav-link ${aktifMi(grup.href)}" href="${grup.href}" ${grup.adminOnly ? "data-admin-only" : ""}>
        ${grup.baslik}
      </a>
    </li>`;
  }

  const aktif = grup.ogeler.some(oge => aktifMi(oge.href));
  return `
    <li class="nav-item dropdown">
      <a class="nav-link dropdown-toggle ${aktif ? "active" : ""}" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">
        ${grup.baslik}
      </a>
      <ul class="dropdown-menu">
        ${grup.ogeler.map(oge => `
          <li>
            <a class="dropdown-item ${aktifMi(oge.href)}" href="${oge.href}" ${oge.adminOnly ? "data-admin-only" : ""}>
              <i class="bi ${oge.ikon} me-2"></i>${oge.etiket}
            </a>
          </li>`).join("")}
      </ul>
    </li>`;
}

function yukleBottomNav() {
  const kap = document.getElementById("bottom-nav-kap");
  if (!kap) return;

  const ogeler = [
    { href: "dashboard.html", ikon: "bi-speedometer2", etiket: "Panel" },
    { href: "students-list.html", ikon: "bi-people", etiket: "Öğrenciler" },
    { href: "attendance-report.html", ikon: "bi-calendar-check", etiket: "Devamsızlık" },
    { href: "behavior-report.html", ikon: "bi-bar-chart", etiket: "Davranış" }
  ];

  let html = `
    <nav class="bottom-navbar d-flex d-md-none">`;

  for (const oge of ogeler) {
    const aktif = aktifMi(oge.href) ? "aktif" : "";
    html += `
      <a href="${oge.href}" class="bottom-nav-item ${aktif}">
        <i class="bi ${oge.ikon}"></i>
        <span>${oge.etiket}</span>
      </a>`;
  }

  // Daha Fazlası
  html += `
      <a href="#" class="bottom-nav-item" data-bs-toggle="offcanvas" data-bs-target="#daha-fazla-menu">
        <i class="bi bi-grid-3x3-gap"></i>
        <span>Fazlası</span>
      </a>
    </nav>

    <!-- Offcanvas: Daha Fazlası -->
    <div class="offcanvas offcanvas-bottom rounded-top-4" tabindex="-1" id="daha-fazla-menu" style="height:auto;max-height:88vh;overflow-y:auto;padding-bottom:env(safe-area-inset-bottom,0px)">
      <div class="offcanvas-header">
        <h5 class="offcanvas-title">Menü</h5>
        <button type="button" class="btn-close" data-bs-dismiss="offcanvas"></button>
      </div>
      <div class="offcanvas-body">
        <div class="mobile-more-menu">
          ${MENU_GRUPLARI.map(offcanvasGrup).join("")}
        </div>
      </div>
    </div>`;

  kap.innerHTML = html;

  // Klavye açıkken bottom navbar'ı gizle
  (function klavyeGizlemeBaslat() {
    if (!window.visualViewport) return;
    const navbar = document.querySelector(".bottom-navbar");
    if (!navbar) return;

    let onceki = visualViewport.height;

    visualViewport.addEventListener("resize", () => {
      const fark = onceki - visualViewport.height;
      navbar.style.transform = fark > 120
        ? "translateY(calc(100% + env(safe-area-inset-bottom, 0px)))"
        : "";
      navbar.style.transition = "transform .2s ease";
      onceki = visualViewport.height;
    });
  })();
}

function offcanvasGrup(grup) {
  if (grup.href) {
    return `
    <section class="mobile-more-group">
      <h6>${grup.baslik}</h6>
      <div class="mobile-more-grid">
        ${offcanvasOge(grup.href, grup.ikon, grup.baslik, grup.adminOnly)}
      </div>
    </section>`;
  }

  return `
    <section class="mobile-more-group">
      <h6>${grup.baslik}</h6>
      <div class="mobile-more-grid">
        ${grup.ogeler.map(oge => offcanvasOge(oge.href, oge.ikon, oge.etiket, oge.adminOnly)).join("")}
      </div>
    </section>`;
}

function offcanvasOge(href, ikon, etiket, adminOnly = false) {
  return `
    <a href="${href}" class="mobile-more-item" ${adminOnly ? "data-admin-only" : ""}>
      <i class="bi ${ikon}"></i>
      <span>${etiket}</span>
    </a>`;
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", layoutYukle, { once: true });
} else {
  layoutYukle();
}
