/**
 * layout.js — Ortak üst menü ve bottom navbar'ı sayfaya enjekte eder.
 * Her sayfada <div id="sidebar-kap"></div> ve <div id="bottom-nav-kap"></div> olmalı.
 */
import { APP_VERSION, APP_UPDATED_AT } from "./version.js?v=20260529-29";
import { okulAyarlariGetir, okulDonemiEtiketi } from "./school-settings.js?v=20260529-29";

let layoutYuklendi = false;
let yazdirmaBaglandi = false;
let yazdirmaDtDurumlari = [];
let yazdirmaHazir = false;

const MENU_GRUPLARI = [
  {
    baslik: "Öğrenciler",
    ogeler: [
      { href: "dashboard.html#ogrenci-ara", ikon: "bi-search", etiket: "Öğrenci Ara" },
      { href: "students-list.html", ikon: "bi-people", etiket: "Öğrenci Listesi" },
      { href: "students-add-edit.html", ikon: "bi-person-plus", etiket: "Yeni Öğrenci Ekle", adminOnly: true },
      { href: "class-promotion.html", ikon: "bi-arrow-up-circle", etiket: "Sınıf Atlatma", adminOnly: true }
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
    baslik: "Ayarlar",
    href: "settings.html",
    ikon: "bi-gear",
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
  });
  window.addEventListener("afterprint", yazdirmaHazirliginiTemizle);
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
  yazdirmaSayfaSinifiGuncelle();
  yazdirmaTabloBasliklariEkle();
  listeYazdirmaTablolariEkle();
  yazdirmaHazir = true;
}

function yazdirmaHazirliginiTemizle() {
  yazdirmaGeciciSatirlariTemizle();
  listeYazdirmaTablolariTemizle();
  dataTableSayfalamayiGeriAl();
  yazdirmaTabloBasliklariTemizle();
  document.body.classList.remove("obs-print-landscape");
  document.querySelectorAll(".obs-print-wide-card").forEach(card => card.classList.remove("obs-print-wide-card"));
  yazdirmaHazir = false;
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
    const sinifIndex = basliklar.findIndex(baslik => normalizeYazdirmaBaslik(baslik) === "sinif");
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
  if (temiz === "no" || temiz.endsWith(" no")) return 6;
  if (temiz === "sinif") return 6;
  if (temiz.includes("tarih")) return 9;
  if (temiz.includes("telefon") || temiz.includes(" tel")) return 13;
  if (temiz.includes("e posta") || temiz.includes("eposta")) return 16;
  if (temiz.includes("ad soyad")) return 24;
  if (temiz === "ogrenci" || temiz === "veli") return 20;
  if (temiz.includes("ogrenci")) return 20;
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
  return temiz.includes("aciklama");
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
        <a href="dashboard.html" class="navbar-brand d-flex align-items-center gap-2">
          <span class="brand-logo-mark"><i class="bi bi-journal-bookmark-fill"></i></span>
          <span class="brand-text fw-semibold">Öğrenci Bilgileri</span>
        </a>
        <ul class="navbar-nav d-none d-md-flex ms-3 top-menu">
          ${MENU_GRUPLARI.map(topMenuDropdown).join("")}
        </ul>
        <ul class="navbar-nav ms-auto">
          <li class="nav-item">
            <a class="nav-link" href="#" id="cikis-btn" title="Çıkış Yap">
              <i class="bi bi-box-arrow-right"></i>
            </a>
          </li>
        </ul>
      </div>
    </nav>`;

  document.getElementById("cikis-btn")?.addEventListener("click", async (e) => {
    e.preventDefault();
    const { logout } = await import("./auth.js?v=20260529-29");
    logout();
  });
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
    <div class="offcanvas offcanvas-bottom" tabindex="-1" id="daha-fazla-menu" style="height:auto;max-height:82vh;overflow-y:auto">
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
