/**
 * layout.js — Ortak üst menü ve bottom navbar'ı sayfaya enjekte eder.
 * Her sayfada <div id="sidebar-kap"></div> ve <div id="bottom-nav-kap"></div> olmalı.
 */
import { APP_VERSION, APP_UPDATED_AT } from "./version.js?v=20260527-10";

let layoutYuklendi = false;

const MENU_GRUPLARI = [
  {
    baslik: "Öğrenciler",
    ogeler: [
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
    baslik: "Mezunlar",
    ogeler: [
      { href: "graduates-list.html", ikon: "bi-mortarboard", etiket: "Mezun Listesi" },
      { href: "graduates-promotion.html", ikon: "bi-arrow-up-circle", etiket: "Yıl Sonu Aktarımı", adminOnly: true }
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
}

function yukleFooter() {
  const kap = document.getElementById("footer-kap");
  if (!kap) return;
  kap.outerHTML = `
    <footer class="app-footer">
      <div class="float-end d-none d-sm-inline">v${APP_VERSION} · ${APP_UPDATED_AT}</div>
      <strong>© 2026 AYUSTASI</strong>
    </footer>`;
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
    const { logout } = await import("./auth.js?v=20260527-10");
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
