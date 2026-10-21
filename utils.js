(function () {
"use strict";
const OBS = window.OBS = window.OBS || {};
/**
 * utils.js — Metin biçimlendirme ve genel yardımcı fonksiyonlar
 */

// Türkçe bağlaçlar (bunlar küçük kalır)
const BAGLAÇLAR = new Set([
  "ve", "veya", "ile", "de", "da", "den", "dan",
  "mi", "mı", "mu", "mü", "ki", "ama", "fakat",
  "lakin", "ancak", "ya", "ne", "hem"
]);

/**
 * Adı biçimlendir: Her kelimenin ilk harfi büyük, diğerleri küçük.
 * Örn: "ahmet mehmet" → "Ahmet Mehmet"
 */
function formatAd(str) {
  if (!str) return "";
  return str.trim().split(/\s+/).map(kelime =>
    kelime.length > 0
      ? kelimeBuyukBasla(kelime)
      : kelime
  ).join(" ");
}

/**
 * Soyadı biçimlendir: Tüm harfler büyük.
 * Örn: "yılmaz" → "YILMAZ"
 */
function formatSoyad(str) {
  if (!str) return "";
  return turkceBuyuk(str.trim());
}

/**
 * Genel metin biçimlendir: Her kelimenin ilk harfi büyük,
 * bağlaçlar küçük kalır.
 * Örn: "konya büyükşehir belediyesi ve bağlı kuruluşlar"
 *    → "Konya Büyükşehir Belediyesi ve Bağlı Kuruluşlar"
 */
function formatMetin(str) {
  if (!str) return "";
  const kelimeler = str.trim().split(/\s+/);
  return kelimeler.map((kelime, idx) => {
    if (idx !== 0 && BAGLAÇLAR.has(kelime.toLowerCase())) {
      return kelime.toLowerCase();
    }
    return kelimeBuyukBasla(kelime);
  }).join(" ");
}

/**
 * Türkçe karakterleri destekleyen büyük harf dönüşümü.
 */
function turkceBuyuk(str) {
  return str
    .replace(/i/g, "İ")
    .replace(/ı/g, "I")
    .replace(/ğ/g, "Ğ")
    .replace(/ü/g, "Ü")
    .replace(/ş/g, "Ş")
    .replace(/ö/g, "Ö")
    .replace(/ç/g, "Ç")
    .toUpperCase();
}

/**
 * Türkçe karakterleri destekleyen küçük harf dönüşümü.
 */
function turkcekucuk(str) {
  return str
    .replace(/İ/g, "i")
    .replace(/I/g, "ı")
    .replace(/Ğ/g, "ğ")
    .replace(/Ü/g, "ü")
    .replace(/Ş/g, "ş")
    .replace(/Ö/g, "ö")
    .replace(/Ç/g, "ç")
    .toLowerCase();
}

/**
 * Bir kelimenin ilk harfini büyük yap (Türkçe destekli).
 */
function kelimeBuyukBasla(kelime) {
  if (!kelime) return "";
  const kucuk = turkcekucuk(kelime);
  const ilkHarf = turkceBuyuk(kucuk[0]);
  return ilkHarf + kucuk.slice(1);
}

/**
 * Kullanıcı/Excel/Firestore kaynaklı metni HTML'e güvenli bas.
 */
function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value);
}

/**
 * Tarihi GG.AA.YYYY formatında göster.
 */
function formatTarih(tarihStr) {
  if (!tarihStr) return "";
  if (tarihStr instanceof Date && !Number.isNaN(tarihStr.getTime())) {
    const d = String(tarihStr.getDate()).padStart(2, "0");
    const m = String(tarihStr.getMonth() + 1).padStart(2, "0");
    return `${d}.${m}.${tarihStr.getFullYear()}`;
  }
  const raw = String(tarihStr).trim();
  const ggAaYyyy = raw.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (ggAaYyyy) {
    const [, d, m, y] = ggAaYyyy;
    return `${d.padStart(2, "0")}.${m.padStart(2, "0")}.${y}`;
  }
  const yyyyMmDd = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (yyyyMmDd) {
    const [, y, m, d] = yyyyMmDd;
    return `${d.padStart(2, "0")}.${m.padStart(2, "0")}.${y}`;
  }
  return raw;
}

function gecerliTarih(tarihStr) {
  const tarih = formatTarih(tarihStr);
  const m = tarih.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!m) return false;
  const [, gunStr, ayStr, yilStr] = m;
  const g = Number(gunStr);
  const a = Number(ayStr);
  const y = Number(yilStr);
  const date = new Date(y, a - 1, g);
  return date.getFullYear() === y
    && date.getMonth() === a - 1
    && date.getDate() === g;
}

/**
 * Bugünün tarihini GG.AA.YYYY olarak döndürür.
 */
function bugun() {
  const d = new Date();
  const gun = String(d.getDate()).padStart(2, "0");
  const ay = String(d.getMonth() + 1).padStart(2, "0");
  const yil = d.getFullYear();
  return `${gun}.${ay}.${yil}`;
}

/**
 * GG.AA.YYYY formatındaki tarihi Date nesnesine çevirir.
 */
/**
 * Tarih metnini/değerini GG.AA.YYYY biçimine çevirir; geçersizse null döner.
 * Kabul edilenler: 5.9.2011, 05-09-2011, 05/09/2011, "05 09 2011", 2011-09-05, 2011.09.05,
 * 05.09.11 (2 haneli yıl), 05092011 / 20110905 (8 hane), saat eki (05.09.2011 00:00),
 * Date nesnesi ve Excel seri numarası (örn. 40426).
 */
function tarihNormalizeEt(deger) {
  if (deger === null || deger === undefined) return null;
  let g, a, y;

  const excelSeri = n => {
    const gun = Math.floor(n);
    if (!(gun >= 10000 && gun <= 60000)) return null; // yaklaşık 1927–2064 arası
    const d = new Date(Date.UTC(1899, 11, 30) + gun * 86400000);
    return [d.getUTCDate(), d.getUTCMonth() + 1, d.getUTCFullYear()];
  };

  if (deger instanceof Date) {
    if (Number.isNaN(deger.getTime())) return null;
    [g, a, y] = [deger.getDate(), deger.getMonth() + 1, deger.getFullYear()];
  } else if (typeof deger === "number") {
    const seri = Number.isFinite(deger) ? excelSeri(deger) : null;
    if (!seri) return null;
    [g, a, y] = seri;
  } else {
    let s = String(deger).trim().replace(/^['"‘’“”]+|['"‘’“”]+$/g, "");
    s = s.replace(/[\u2010-\u2015\u2212]/g, "-");                                       // farklı tire karakterleri
    s = s.replace(/[T\s]+\d{1,2}:\d{2}(:\d{2}(\.\d+)?)?\s*(Z|[+-]\d{2}:?\d{2})?$/i, ""); // saat eki
    s = s.replace(/^[\s.\-/,]+|[\s.\-/,]+$/g, "");                                       // uçlardaki ayraçlar
    if (!s) return null;

    if (/^\d{5}(\.\d+)?$/.test(s)) {
      const seri = excelSeri(Number(s));
      if (!seri) return null;
      [g, a, y] = seri;
    } else if (/^\d{8}$/.test(s)) {
      // GGAAYYYY ya da YYYYAAGG
      const gunAyYil = [Number(s.slice(0, 2)), Number(s.slice(2, 4)), Number(s.slice(4))];
      const yilAyGun = [Number(s.slice(6)), Number(s.slice(4, 6)), Number(s.slice(0, 4))];
      const gecerli = ([gg, aa, yy]) => yy >= 1900 && yy <= 2100 && aa >= 1 && aa <= 12 && gg >= 1 && gg <= 31;
      [g, a, y] = gecerli(gunAyYil) ? gunAyYil : gecerli(yilAyGun) ? yilAyGun : [0, 0, 0];
    } else {
      const p = s.split(/[\s.\-/,]+/);
      if (p.length !== 3 || !p.every(x => /^\d{1,4}$/.test(x))) return null;
      if (p[0].length === 4 && p[2].length <= 2) {
        [y, a, g] = [p[0], p[1], p[2]].map(Number);        // YYYY-AA-GG
      } else if (p[2].length === 4 && p[0].length <= 2) {
        [g, a, y] = [p[0], p[1], p[2]].map(Number);        // GG-AA-YYYY
      } else if (p[2].length === 2 && p[0].length <= 2) {
        [g, a] = [Number(p[0]), Number(p[1])];             // GG-AA-YY (2 haneli yıl)
        const yy = Number(p[2]);
        y = yy <= new Date().getFullYear() % 100 ? 2000 + yy : 1900 + yy;
      } else {
        return null;
      }
    }
  }

  if (!(y >= 1900 && y <= 2100)) return null;
  const kontrol = new Date(y, a - 1, g);
  if (kontrol.getFullYear() !== y || kontrol.getMonth() !== a - 1 || kontrol.getDate() !== g) return null;
  return `${String(g).padStart(2, "0")}.${String(a).padStart(2, "0")}.${y}`;
}

/** flatpickr "parseDate" seçeneği için: yazılan metni (. / - ayraçları, 2 haneli yıl, ISO...) Date'e çevirir; çözemezse undefined. */
function flatpickrTarihAyristir(metin) {
  const duzgun = tarihNormalizeEt(metin);
  if (!duzgun) return undefined;
  const [g, a, y] = duzgun.split(".").map(Number);
  return new Date(y, a - 1, g);
}

/** Gösterim için: tanınan biçimi GG.AA.YYYY'ye çevirir, tanınmazsa metni olduğu gibi döndürür. */
function dogumTarihiGoster(deger) {
  return tarihNormalizeEt(deger) || String(deger ?? "").trim();
}

/** Doğum tarihi için: tarihNormalizeEt + gelecekte olamaz, 1950'den önce olamaz. */
function dogumTarihiNormalizeEt(deger) {
  const tarih = tarihNormalizeEt(deger);
  if (!tarih) return null;
  if (gelecekTarihMi(tarih)) return null;
  if (Number(tarih.slice(-4)) < 1950) return null;
  return tarih;
}

/** Verilen GG.AA.YYYY tarihi bugünden sonra mı? Geçersiz tarih için false döner. */
function gelecekTarihMi(str) {
  const tarih = tarihtenDate(str);
  if (!tarih) return false;
  const bugunTarih = new Date();
  bugunTarih.setHours(0, 0, 0, 0);
  return tarih.getTime() > bugunTarih.getTime();
}

function tarihtenDate(str) {
  if (!str) return null;
  const tarih = formatTarih(str);
  if (!gecerliTarih(tarih)) return null;
  const [g, a, y] = tarih.split(".").map(Number);
  return new Date(y, a - 1, g);
}

function tarihSiralamaAnahtari(str) {
  const tarih = formatTarih(str);
  const m = tarih.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!m) return "0000-00-00";
  const [, g, a, y] = m;
  return `${y}-${a}-${g}`;
}

function compareTarihDesc(a, b) {
  return tarihSiralamaAnahtari(b).localeCompare(tarihSiralamaAnahtari(a));
}

const TR_SIRALAYICI = new Intl.Collator("tr", { numeric: true, sensitivity: "base" });

function sinifParcala(sinif) {
  const raw = String(sinif || "").trim();
  const m = raw.match(/(\d{1,2})\s*\.?\s*(?:sınıf|sinif)?\s*[-/.]?\s*([A-Za-zÇĞİÖŞÜçğıöşü]+)?/i);
  if (!m) return { seviye: Number.POSITIVE_INFINITY, sube: "", raw };
  return {
    seviye: Number(m[1]),
    sube: String(m[2] || "").toLocaleUpperCase("tr-TR"),
    raw
  };
}

function sinifSiralamaAnahtari(sinif) {
  const p = sinifParcala(sinif);
  const seviye = Number.isFinite(p.seviye) ? String(p.seviye).padStart(2, "0") : "99";
  return `${seviye}-${p.sube || "ZZ"}-${p.raw}`;
}

function compareSinif(a, b) {
  const pa = sinifParcala(a);
  const pb = sinifParcala(b);
  if (pa.seviye !== pb.seviye) return pa.seviye - pb.seviye;
  return TR_SIRALAYICI.compare(pa.sube, pb.sube) || TR_SIRALAYICI.compare(pa.raw, pb.raw);
}

function ogrenciNoHam(value) {
  if (value && typeof value === "object") return value.numara ?? value.no ?? value.id ?? "";
  return value ?? "";
}

function ogrenciNoSiralamaAnahtari(value) {
  const raw = String(ogrenciNoHam(value)).trim();
  const sayi = raw.replace(/\D/g, "");
  return `${sayi ? sayi.padStart(12, "0") : "999999999999"}-${raw}`;
}

function compareOgrenciNo(a, b) {
  return TR_SIRALAYICI.compare(ogrenciNoSiralamaAnahtari(a), ogrenciNoSiralamaAnahtari(b));
}

function compareOgrenci(a, b) {
  return compareSinif(a?.sinif, b?.sinif)
    || compareOgrenciNo(a, b)
    || TR_SIRALAYICI.compare(`${a?.soyad || ""} ${a?.ad || ""}`, `${b?.soyad || ""} ${b?.ad || ""}`);
}

/**
 * Form alanına blur eventi ile otomatik biçimlendirme bağla.
 * tip: "ad" | "soyad" | "metin"
 */
function baglaFormat(inputEl, tip) {
  if (!inputEl) return;
  inputEl.addEventListener("blur", () => {
    switch (tip) {
      case "ad":      inputEl.value = formatAd(inputEl.value); break;
      case "soyad":   inputEl.value = formatSoyad(inputEl.value); break;
      case "metin":   inputEl.value = formatMetin(inputEl.value); break;
    }
  });
}

/**
 * Öğrenci numarası doğrula: sadece rakam, boş değil.
 */
function gecerliOgrenciNo(no) {
  return /^\d+$/.test(String(no).trim()) && String(no).trim().length > 0;
}

/**
 * Basit toast bildirimi göster (AdminLTE uyumlu).
 */
function toast(mesaj, tip = "success") {
  const renkler = { success: "bg-success", danger: "bg-danger", warning: "bg-warning", info: "bg-info" };
  const renk = renkler[tip] || "bg-secondary";

  const el = document.createElement("div");
  el.className = `toast align-items-center text-white ${renk} border-0 show`;
  el.setAttribute("role", "alert");
  el.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">${escapeHtml(mesaj)}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
    </div>`;

  let kap = document.getElementById("toast-kap");
  if (!kap) {
    kap = document.createElement("div");
    kap.id = "toast-kap";
    kap.className = "toast-container position-fixed end-0 p-3 obs-toast-kap";
    kap.style.zIndex = "1100";
    document.body.appendChild(kap);
  }
  kap.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

function onayIste({
  baslik = "İşlemi onayla",
  mesaj = "",
  detay = "",
  onayButonu = "Onayla",
  iptalButonu = "Vazgeç",
  tip = "danger",
  onayMetni = ""
} = {}) {
  return new Promise(resolve => {
    document.querySelectorAll(".obs-confirm-backdrop").forEach(el => el.remove());

    const renk = {
      danger: "btn-danger",
      warning: "btn-warning",
      primary: "btn-primary",
      success: "btn-success"
    }[tip] || "btn-primary";
    const ikon = {
      danger: "bi-exclamation-triangle",
      warning: "bi-exclamation-circle",
      primary: "bi-question-circle",
      success: "bi-check-circle"
    }[tip] || "bi-question-circle";

    const backdrop = document.createElement("div");
    backdrop.className = "obs-confirm-backdrop";
    backdrop.innerHTML = `
      <div class="obs-confirm" role="dialog" aria-modal="true" aria-labelledby="obs-confirm-title">
        <div class="obs-confirm-head">
          <span class="obs-confirm-icon text-${tip === "danger" ? "danger" : tip}">
            <i class="bi ${ikon}"></i>
          </span>
          <div>
            <h5 id="obs-confirm-title" class="mb-1">${escapeHtml(baslik)}</h5>
            ${mesaj ? `<div class="text-muted">${escapeHtml(mesaj)}</div>` : ""}
          </div>
        </div>
        ${detay ? `<div class="obs-confirm-detail">${escapeHtml(detay)}</div>` : ""}
        ${onayMetni ? `
          <label class="form-label small text-muted mt-3 mb-1">Onay için <strong>${escapeHtml(onayMetni)}</strong> yazın</label>
          <input type="text" class="form-control" data-confirm-input autocomplete="off">
        ` : ""}
        <div class="obs-confirm-actions">
          <button type="button" class="btn btn-outline-secondary" data-confirm-cancel>${escapeHtml(iptalButonu)}</button>
          <button type="button" class="btn ${renk}" data-confirm-ok ${onayMetni ? "disabled" : ""}>${escapeHtml(onayButonu)}</button>
        </div>
      </div>`;

    const odaklanabilirSecici = [
      "a[href]",
      "button:not([disabled])",
      "textarea:not([disabled])",
      "input:not([disabled])",
      "select:not([disabled])",
      "[tabindex]:not([tabindex='-1'])"
    ].join(",");
    const kapat = sonuc => {
      backdrop.remove();
      document.removeEventListener("keydown", tusDinle);
      resolve(sonuc);
    };
    const tusDinle = e => {
      if (e.key === "Escape") {
        kapat(false);
        return;
      }
      if (e.key !== "Tab") return;

      const dialog = backdrop.querySelector(".obs-confirm");
      const odaklanabilirler = Array.from(dialog.querySelectorAll(odaklanabilirSecici))
        .filter(el => el.offsetParent !== null);
      if (odaklanabilirler.length === 0) {
        e.preventDefault();
        return;
      }

      const ilk = odaklanabilirler[0];
      const son = odaklanabilirler[odaklanabilirler.length - 1];
      if (e.shiftKey && document.activeElement === ilk) {
        e.preventDefault();
        son.focus();
      } else if (!e.shiftKey && document.activeElement === son) {
        e.preventDefault();
        ilk.focus();
      }
    };

    document.body.appendChild(backdrop);
    document.addEventListener("keydown", tusDinle);
    const input = backdrop.querySelector("[data-confirm-input]");
    const okBtn = backdrop.querySelector("[data-confirm-ok]");
    backdrop.querySelector("[data-confirm-cancel]").addEventListener("click", () => kapat(false));
    okBtn.addEventListener("click", () => kapat(true));
    backdrop.addEventListener("click", e => {
      if (e.target === backdrop) kapat(false);
    });
    if (input) {
      input.addEventListener("input", () => {
        okBtn.disabled = input.value.trim().toLocaleUpperCase("tr-TR") !== onayMetni.toLocaleUpperCase("tr-TR");
      });
      setTimeout(() => input.focus(), 50);
    } else {
      setTimeout(() => okBtn.focus(), 50);
    }
  });
}

/**
 * DataTable eklentisini güvenli oluşturur.
 * CDN veya datatable-fallback.js yüklenemediyse sayfa çökmez; tablo sıralama/sayfalama olmadan düz gösterilir.
 */
function dataTableOlustur(secici, secenekler) {
  const DT = window.DataTable;
  if (typeof DT !== "function") {
    console.warn("DataTable bulunamadı; tablo düz liste olarak gösteriliyor.");
    return null;
  }
  try {
    return new DT(secici, secenekler);
  } catch (err) {
    console.error("DataTable başlatılamadı:", err);
    return null;
  }
}


Object.assign(OBS, { dataTableOlustur, gelecekTarihMi, tarihNormalizeEt, dogumTarihiNormalizeEt, dogumTarihiGoster, flatpickrTarihAyristir, formatAd, formatSoyad, formatMetin, turkceBuyuk, turkcekucuk, escapeHtml, escapeAttr, formatTarih, gecerliTarih, bugun, tarihtenDate, tarihSiralamaAnahtari, compareTarihDesc, sinifParcala, sinifSiralamaAnahtari, compareSinif, ogrenciNoSiralamaAnahtari, compareOgrenciNo, compareOgrenci, baglaFormat, gecerliOgrenciNo, toast, onayIste });
})();
