/**
 * layout.js — Ortak sidebar ve bottom navbar'ı sayfaya enjekte eder.
 * Her sayfada <div id="sidebar-kap"></div> ve <div id="bottom-nav-kap"></div> olmalı.
 */
import { APP_VERSION, APP_UPDATED_AT } from "./version.js";

// Aktif menü öğesini belirle
function aktifMi(href) {
  const mevcut = window.location.pathname;
  // Hem tam yol hem de sadece dosya adı karşılaştırması
  const dosyaAdi = href.split("/").pop();
  return mevcut.endsWith(href) || mevcut.endsWith(dosyaAdi) ? "active" : "";
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
        <ul class="navbar-nav">
          <li class="nav-item">
            <a class="nav-link" href="#" id="sidebar-toggle" role="button" title="Menüyü Aç/Kapat">
              <i class="bi bi-list"></i>
            </a>
          </li>
        </ul>
        <a href="dashboard.html" class="navbar-brand ms-2">
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

  document.getElementById("sidebar-toggle")?.addEventListener("click", (e) => {
    e.preventDefault();
    if (window.matchMedia("(max-width: 767.98px)").matches) {
      document.body.classList.toggle("sidebar-mobile-open");
    } else {
      document.body.classList.toggle("sidebar-collapsed");
    }
  });

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
        { href: "dashboard.html", ikon: "bi-speedometer2", etiket: "Gösterge Paneli" }
      ]
    },
    {
      baslik: "Öğrenciler",
      ogeler: [
        { href: "students-list.html", ikon: "bi-people", etiket: "Öğrenci Listesi" },
        { href: "students-add-edit.html", ikon: "bi-person-plus", etiket: "Yeni Öğrenci Ekle" }
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
        { href: "attendance-entry.html", ikon: "bi-calendar-x", etiket: "Devamsızlık Gir" },
        { href: "attendance-report.html", ikon: "bi-calendar-check", etiket: "Devamsızlık Raporu" }
      ]
    },
    {
      baslik: "Davranış",
      ogeler: [
        { href: "behavior-entry.html", ikon: "bi-star-half", etiket: "Davranış Gir" },
        { href: "behavior-report.html", ikon: "bi-bar-chart", etiket: "Davranış Raporu" }
      ]
    },
    {
      baslik: "Veli Görüşmeleri",
      ogeler: [
        { href: "meetings-entry.html", ikon: "bi-chat-dots", etiket: "Görüşme Gir" },
        { href: "meetings-list.html", ikon: "bi-chat-square-text", etiket: "Görüşme Listesi" }
      ]
    },
    {
      baslik: "Mezunlar",
      ogeler: [
        { href: "graduates-list.html", ikon: "bi-mortarboard", etiket: "Mezun Listesi" },
        { href: "graduates-promotion.html", ikon: "bi-arrow-up-circle", etiket: "Yıl Sonu Aktarımı" }
      ]
    },
    {
      baslik: "Sistem",
      ogeler: [
        { href: "settings.html", ikon: "bi-gear", etiket: "Ayarlar" }
      ]
    }
  ];

  let html = `
    <aside class="app-sidebar bg-body-secondary shadow" data-bs-theme="dark">
      <div class="sidebar-brand">
        <a href="dashboard.html" class="brand-link">
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
  kap.outerHTML = html;

  document.querySelectorAll(".app-sidebar a").forEach(link => {
    link.addEventListener("click", () => {
      document.body.classList.remove("sidebar-mobile-open");
    });
  });
}

function yukleBottomNav() {
  const kap = document.getElementById("bottom-nav-kap");
  if (!kap) return;

  const ogeler = [
    { href: "dashboard.html", ikon: "bi-speedometer2", etiket: "Panel" },
    { href: "students-list.html", ikon: "bi-people", etiket: "Öğrenciler" },
    { href: "attendance-entry.html", ikon: "bi-calendar-x", etiket: "Devamsızlık" },
    { href: "behavior-entry.html", ikon: "bi-star-half", etiket: "Davranış" }
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
          ${offcanvasOge("phone-list.html", "bi-telephone-fill", "Telefon Listesi")}
          ${offcanvasOge("parents-list.html", "bi-people-fill", "Veli Listesi")}
          ${offcanvasOge("meetings-entry.html", "bi-chat-dots", "Veli Görüşmesi")}
          ${offcanvasOge("graduates-list.html", "bi-mortarboard", "Mezunlar")}
          ${offcanvasOge("settings.html", "bi-gear", "Ayarlar")}
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
