/**
 * layout.js — Ortak sidebar ve bottom navbar'ı sayfaya enjekte eder.
 * Her sayfada <div id="sidebar-kap"></div> ve <div id="bottom-nav-kap"></div> olmalı.
 */
import { APP_VERSION, APP_UPDATED_AT } from "./version.js";

let layoutYuklendi = false;

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
        <ul class="navbar-nav d-none d-md-flex">
          <li class="nav-item">
            <a class="nav-link" href="#" id="sidebar-toggle" role="button" title="Menüyü Aç/Kapat">
              <i class="bi bi-list"></i>
            </a>
          </li>
        </ul>
        <a href="dashboard.html" class="navbar-brand ms-2 d-flex align-items-center gap-2">
          <span class="brand-logo-mark"><i class="bi bi-person-vcard-fill"></i></span>
          <span class="brand-text fw-semibold">Öğrenci Bilgileri</span>
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
      baslik: "Sistem",
      ogeler: [
        { href: "settings.html", ikon: "bi-gear", etiket: "Ayarlar", adminOnly: true }
      ]
    }
  ];

  let html = `
    <aside class="app-sidebar bg-body-secondary shadow" data-bs-theme="dark">
      <div class="sidebar-brand">
        <a href="dashboard.html" class="brand-link">
          <span class="brand-logo-mark brand-logo-mark-sm"><i class="bi bi-person-vcard-fill"></i></span>
          <span class="brand-text fw-semibold fs-6">Öğrenci Bilgileri</span>
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
          <a href="${oge.href}" class="nav-link ${aktif}" ${oge.adminOnly ? "data-admin-only" : ""}>
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
        <div class="row g-3 text-center">
          ${offcanvasOge("students-add-edit.html", "bi-person-plus", "Yeni Öğrenci", true)}
          ${offcanvasOge("phone-list.html", "bi-telephone-fill", "Telefon")}
          ${offcanvasOge("parents-list.html", "bi-people-fill", "Veli")}
          ${offcanvasOge("attendance-entry.html", "bi-calendar-x", "Devamsızlık Gir", true)}
          ${offcanvasOge("attendance-report.html", "bi-calendar-check", "Devamsızlık Raporu")}
          ${offcanvasOge("behavior-entry.html", "bi-star-half", "Davranış Gir", true)}
          ${offcanvasOge("behavior-report.html", "bi-bar-chart", "Davranış Raporu")}
          ${offcanvasOge("meetings-entry.html", "bi-chat-dots", "Görüşme Gir", true)}
          ${offcanvasOge("meetings-list.html", "bi-chat-square-text", "Görüşmeler")}
          ${offcanvasOge("graduates-list.html", "bi-mortarboard", "Mezunlar")}
          ${offcanvasOge("graduates-promotion.html", "bi-arrow-up-circle", "Yıl Sonu", true)}
          ${offcanvasOge("settings.html", "bi-gear", "Ayarlar", true)}
        </div>
      </div>
    </div>`;

  kap.innerHTML = html;
}

function offcanvasOge(href, ikon, etiket, adminOnly = false) {
  return `
    <div class="col-3">
      <a href="${href}" class="text-decoration-none text-body" ${adminOnly ? "data-admin-only" : ""}>
        <div class="p-2">
          <i class="bi ${ikon} fs-3"></i>
          <div class="small mt-1">${etiket}</div>
        </div>
      </a>
    </div>`;
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", layoutYukle, { once: true });
} else {
  layoutYukle();
}
