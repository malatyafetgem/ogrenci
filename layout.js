/**
 * layout.js — Ortak sidebar ve bottom navbar'ı sayfaya enjekte eder.
 * Her sayfada <div id="sidebar-kap"></div> ve <div id="bottom-nav-kap"></div> olmalı.
 */

const BASE = "/ogrenci";

// Aktif menü öğesini belirle
function aktifMi(href) {
  const mevcut = window.location.pathname;
  return mevcut.endsWith(href) ? 'active' : '';
}

export function layoutYukle() {
  yukleTopbar();
  yukleSidebar();
  yukleBottomNav();
  yukleFooter();
}

function yukleFooter() {
  const kap = document.getElementById("footer-kap");
  if (!kap) return;
  kap.innerHTML = `
    <footer class="app-footer">
      <div class="float-end d-none d-sm-inline">Öğrenci Bilgi Sistemi</div>
      <strong>© 2026 AYUSTASI</strong>
    </footer>`;
}

function yukleTopbar() {
  const kap = document.getElementById("topbar-kap");
  if (!kap) return;
  kap.innerHTML = `
    <nav class="app-header navbar navbar-expand bg-body">
      <div class="container-fluid">
        <ul class="navbar-nav">
          <li class="nav-item">
            <a class="nav-link" data-lte-toggle="sidebar" href="#" role="button">
              <i class="bi bi-list"></i>
            </a>
          </li>
        </ul>
        <a href="${BASE}/dashboard.html" class="navbar-brand ms-2">
          <span class="brand-text fw-semibold">Öğrenci Bilgi Sistemi</span>
        </a>
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
    const { logout } = await import("./auth.js");
    logout();
  });
}

function yukleSidebar() {
  const kap = document.getElementById("sidebar-kap");
  if (!kap) return;

  const menu = [
    {
      baslik: null,
      ogeler: [
        { href: `${BASE}/dashboard.html`, ikon: "bi-speedometer2", etiket: "Gösterge Paneli" }
      ]
    },
    {
      baslik: "Öğrenciler",
      ogeler: [
        { href: `${BASE}/pages/students/list.html`, ikon: "bi-people", etiket: "Öğrenci Listesi" },
        { href: `${BASE}/pages/students/add-edit.html`, ikon: "bi-person-plus", etiket: "Yeni Öğrenci Ekle" }
      ]
    },
    {
      baslik: "Listeler",
      ogeler: [
        { href: `${BASE}/pages/phone-list.html`, ikon: "bi-telephone-fill", etiket: "Toplu Telefon Listesi" },
        { href: `${BASE}/pages/parents/list.html`, ikon: "bi-people-fill", etiket: "Veli Listesi" }
      ]
    },
    {
      baslik: "Devamsızlık",
      ogeler: [
        { href: `${BASE}/pages/attendance/entry.html`, ikon: "bi-calendar-x", etiket: "Devamsızlık Gir" },
        { href: `${BASE}/pages/attendance/report.html`, ikon: "bi-calendar-check", etiket: "Devamsızlık Raporu" }
      ]
    },
    {
      baslik: "Davranış",
      ogeler: [
        { href: `${BASE}/pages/behavior/entry.html`, ikon: "bi-star-half", etiket: "Davranış Gir" },
        { href: `${BASE}/pages/behavior/report.html`, ikon: "bi-bar-chart", etiket: "Davranış Raporu" }
      ]
    },
    {
      baslik: "Veli Görüşmeleri",
      ogeler: [
        { href: `${BASE}/pages/meetings/entry.html`, ikon: "bi-chat-dots", etiket: "Görüşme Gir" },
        { href: `${BASE}/pages/meetings/list.html`, ikon: "bi-chat-square-text", etiket: "Görüşme Listesi" }
      ]
    },
    {
      baslik: "Mezunlar",
      ogeler: [
        { href: `${BASE}/pages/graduates/list.html`, ikon: "bi-mortarboard", etiket: "Mezun Listesi" },
        { href: `${BASE}/pages/graduates/promotion.html`, ikon: "bi-arrow-up-circle", etiket: "Yıl Sonu Aktarımı" }
      ]
    },
    {
      baslik: "Sistem",
      ogeler: [
        { href: `${BASE}/pages/settings/index.html`, ikon: "bi-gear", etiket: "Ayarlar" }
      ]
    }
  ];

  let html = `
    <aside class="app-sidebar bg-body-secondary shadow" data-bs-theme="dark">
      <div class="sidebar-brand">
        <a href="${BASE}/dashboard.html" class="brand-link">
          <span class="brand-text fw-semibold fs-6">📚 ÖBS</span>
        </a>
      </div>
      <div class="sidebar-wrapper">
        <nav class="mt-2">
          <ul class="nav sidebar-menu flex-column" data-lte-toggle="treeview" role="menu">`;

  for (const grup of menu) {
    if (grup.baslik) {
      html += `<li class="nav-header">${grup.baslik}</li>`;
    }
    for (const oge of grup.ogeler) {
      const aktif = aktifMi(oge.href);
      html += `
        <li class="nav-item">
          <a href="${oge.href}" class="nav-link ${aktif}">
            <i class="nav-icon bi ${oge.ikon}"></i>
            <p>${oge.etiket}</p>
          </a>
        </li>`;
    }
  }

  html += `</ul></nav></div></aside>`;
  kap.innerHTML = html;
}

function yukleBottomNav() {
  const kap = document.getElementById("bottom-nav-kap");
  if (!kap) return;

  const ogeler = [
    { href: `${BASE}/dashboard.html`, ikon: "bi-speedometer2", etiket: "Panel" },
    { href: `${BASE}/pages/students/list.html`, ikon: "bi-people", etiket: "Öğrenciler" },
    { href: `${BASE}/pages/attendance/entry.html`, ikon: "bi-calendar-x", etiket: "Devamsızlık" },
    { href: `${BASE}/pages/behavior/entry.html`, ikon: "bi-star-half", etiket: "Davranış" }
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
    <div class="offcanvas offcanvas-bottom" tabindex="-1" id="daha-fazla-menu" style="height:auto">
      <div class="offcanvas-header">
        <h5 class="offcanvas-title">Menü</h5>
        <button type="button" class="btn-close" data-bs-dismiss="offcanvas"></button>
      </div>
      <div class="offcanvas-body">
        <div class="row g-3 text-center">
          ${offcanvasOge(`${BASE}/pages/phone-list.html`, "bi-telephone-fill", "Telefon Listesi")}
          ${offcanvasOge(`${BASE}/pages/parents/list.html`, "bi-people-fill", "Veli Listesi")}
          ${offcanvasOge(`${BASE}/pages/meetings/entry.html`, "bi-chat-dots", "Veli Görüşmesi")}
          ${offcanvasOge(`${BASE}/pages/graduates/list.html`, "bi-mortarboard", "Mezunlar")}
          ${offcanvasOge(`${BASE}/pages/settings/index.html`, "bi-gear", "Ayarlar")}
        </div>
      </div>
    </div>`;

  kap.innerHTML = html;
}

function offcanvasOge(href, ikon, etiket) {
  return `
    <div class="col-3">
      <a href="${href}" class="text-decoration-none text-body">
        <div class="p-2">
          <i class="bi ${ikon} fs-3"></i>
          <div class="small mt-1">${etiket}</div>
        </div>
      </a>
    </div>`;
}
