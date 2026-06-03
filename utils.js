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
export function formatAd(str) {
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
export function formatSoyad(str) {
  if (!str) return "";
  return turkceBuyuk(str.trim());
}

/**
 * Genel metin biçimlendir: Her kelimenin ilk harfi büyük,
 * bağlaçlar küçük kalır.
 * Örn: "konya büyükşehir belediyesi ve bağlı kuruluşlar"
 *    → "Konya Büyükşehir Belediyesi ve Bağlı Kuruluşlar"
 */
export function formatMetin(str) {
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
 * Soyadı büyük, adı normal biçimlendir.
 * Örn: "ahmet yılmaz" → "Ahmet YILMAZ" (ayrı alanlarsa dışarıda çağrılır)
 */
export function formatTamAd(ad, soyad) {
  return `${formatAd(ad)} ${formatSoyad(soyad)}`;
}

/**
 * Türkçe karakterleri destekleyen büyük harf dönüşümü.
 */
export function turkceBuyuk(str) {
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
export function turkcekucuk(str) {
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
 * Telefon numarası biçimlendir.
 * Örn: "05321234567" → "0532 123 45 67"
 */
export function formatTelefon(str) {
  if (!str) return "";
  const sadece = str.replace(/\D/g, "");
  if (sadece.length === 11 && sadece.startsWith("0")) {
    return `${sadece.slice(0,4)} ${sadece.slice(4,7)} ${sadece.slice(7,9)} ${sadece.slice(9,11)}`;
  }
  if (sadece.length === 10) {
    return `0${sadece.slice(0,3)} ${sadece.slice(3,6)} ${sadece.slice(6,8)} ${sadece.slice(8,10)}`;
  }
  return str;
}

/**
 * Kullanıcı/Excel/Firestore kaynaklı metni HTML'e güvenli bas.
 */
export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function escapeAttr(value) {
  return escapeHtml(value);
}

/**
 * Tarihi GG.AA.YYYY formatında göster.
 */
export function formatTarih(tarihStr) {
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

export function sayiOkuTR(value) {
  const raw = String(value ?? "").trim().replace(",", ".");
  const eslesen = raw.match(/\d+(\.\d+)?/);
  return eslesen ? Number(eslesen[0]) : 0;
}

export function sayiEtiketiTR(value) {
  const sayi = Number(value);
  if (!Number.isFinite(sayi)) return "";
  const yuvarlanmis = Math.round(sayi * 100) / 100;
  return String(yuvarlanmis).replace(".", ",");
}

export function devamsizlikMiktarSayisi(value) {
  const yalin = String(value ?? "")
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (yalin.includes("yarim")) return 0.5;
  if (yalin.includes("tam")) return 1;
  return sayiOkuTR(value);
}

export function devamsizlikGunDegeri(kayit) {
  const gun = devamsizlikMiktarSayisi(kayit?.gun_degeri ?? kayit?.miktar);
  return gun > 0 ? gun : 0;
}

export function devamsizlikMiktarEtiketi(kayit) {
  const gun = typeof kayit === "object" ? devamsizlikGunDegeri(kayit) : devamsizlikMiktarSayisi(kayit);
  return gun > 0 ? sayiEtiketiTR(gun) : "";
}

/**
 * Bugünün tarihini GG.AA.YYYY olarak döndürür.
 */
export function bugun() {
  const d = new Date();
  const gun = String(d.getDate()).padStart(2, "0");
  const ay = String(d.getMonth() + 1).padStart(2, "0");
  const yil = d.getFullYear();
  return `${gun}.${ay}.${yil}`;
}

/**
 * GG.AA.YYYY formatındaki tarihi Date nesnesine çevirir.
 */
export function tarihtenDate(str) {
  if (!str) return null;
  const tarih = formatTarih(str);
  if (!/^\d{2}\.\d{2}\.\d{4}$/.test(tarih)) return null;
  const [g, a, y] = tarih.split(".").map(Number);
  return new Date(y, a - 1, g);
}

export function tarihEkle(str, gun) {
  const tarih = tarihtenDate(formatTarih(str));
  if (!tarih) return "";
  tarih.setDate(tarih.getDate() + gun);
  return formatTarih(tarih);
}

export function devamsizlikGunDagilimi(kayit) {
  const toplamGun = devamsizlikGunDegeri(kayit);
  if (toplamGun <= 0) return [];

  const gunSayisi = toplamGun > 1 ? Math.ceil(toplamGun) : 1;
  const kapsananTarihler = Array.isArray(kayit?.kapsanan_tarihler)
    ? kayit.kapsanan_tarihler.map(formatTarih).filter(Boolean)
    : [];
  const tarihler = kapsananTarihler.length
    ? kapsananTarihler
    : Array.from({ length: gunSayisi }, (_, index) => tarihEkle(kayit?.tarih || "", index));

  return tarihler.map((tarih, index) => {
    const kalan = toplamGun - index;
    const gun = toplamGun <= 1 ? toplamGun : Math.min(1, Math.max(0, kalan));
    return {
      tarih,
      gun
    };
  }).filter(item => item.tarih && item.gun > 0);
}

export function devamsizlikKapsananTarihler(kayit) {
  if (Array.isArray(kayit?.kapsanan_tarihler) && kayit.kapsanan_tarihler.length) {
    return kayit.kapsanan_tarihler.map(formatTarih).filter(Boolean);
  }
  return devamsizlikGunDagilimi(kayit).map(item => item.tarih);
}

export function devamsizlikTarihEtiketi(kayit) {
  const tarihler = devamsizlikKapsananTarihler(kayit);
  if (tarihler.length > 1) return `${tarihler[0]} - ${tarihler[tarihler.length - 1]}`;
  return formatTarih(kayit?.tarih || "") || "";
}

export function devamsizlikGunDegeriAralik(kayit, baslangic, bitis) {
  const bas = baslangic ? tarihtenDate(formatTarih(baslangic)) : null;
  const bit = bitis ? tarihtenDate(formatTarih(bitis)) : null;
  return devamsizlikGunDagilimi(kayit)
    .filter(({ tarih }) => {
      const t = tarihtenDate(tarih);
      if (!t) return false;
      if (bas && t < bas) return false;
      if (bit && t > bit) return false;
      return true;
    })
    .reduce((toplam, item) => toplam + item.gun, 0);
}

export function devamsizlikTarihleOrtusur(kayit, baslangic, bitis) {
  return devamsizlikGunDegeriAralik(kayit, baslangic, bitis) > 0;
}

export function tarihSiralamaAnahtari(str) {
  const tarih = formatTarih(str);
  const m = tarih.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!m) return "0000-00-00";
  const [, g, a, y] = m;
  return `${y}-${a}-${g}`;
}

export function compareTarihDesc(a, b) {
  return tarihSiralamaAnahtari(b).localeCompare(tarihSiralamaAnahtari(a));
}

export function compareTarihAsc(a, b) {
  return tarihSiralamaAnahtari(a).localeCompare(tarihSiralamaAnahtari(b));
}

const TR_SIRALAYICI = new Intl.Collator("tr", { numeric: true, sensitivity: "base" });

export function sinifParcala(sinif) {
  const raw = String(sinif || "").trim();
  const m = raw.match(/(\d{1,2})\s*\.?\s*(?:sınıf|sinif)?\s*[-/.]?\s*([A-Za-zÇĞİÖŞÜçğıöşü]+)?/i);
  if (!m) return { seviye: Number.POSITIVE_INFINITY, sube: "", raw };
  return {
    seviye: Number(m[1]),
    sube: String(m[2] || "").toLocaleUpperCase("tr-TR"),
    raw
  };
}

export function sinifSiralamaAnahtari(sinif) {
  const p = sinifParcala(sinif);
  const seviye = Number.isFinite(p.seviye) ? String(p.seviye).padStart(2, "0") : "99";
  return `${seviye}-${p.sube || "ZZ"}-${p.raw}`;
}

export function compareSinif(a, b) {
  const pa = sinifParcala(a);
  const pb = sinifParcala(b);
  if (pa.seviye !== pb.seviye) return pa.seviye - pb.seviye;
  return TR_SIRALAYICI.compare(pa.sube, pb.sube) || TR_SIRALAYICI.compare(pa.raw, pb.raw);
}

function ogrenciNoHam(value) {
  if (value && typeof value === "object") return value.numara ?? value.no ?? value.id ?? "";
  return value ?? "";
}

export function ogrenciNoSiralamaAnahtari(value) {
  const raw = String(ogrenciNoHam(value)).trim();
  const sayi = raw.replace(/\D/g, "");
  return `${sayi ? sayi.padStart(12, "0") : "999999999999"}-${raw}`;
}

export function compareOgrenciNo(a, b) {
  return TR_SIRALAYICI.compare(ogrenciNoSiralamaAnahtari(a), ogrenciNoSiralamaAnahtari(b));
}

export function compareOgrenci(a, b) {
  return compareSinif(a?.sinif, b?.sinif)
    || compareOgrenciNo(a, b)
    || TR_SIRALAYICI.compare(`${a?.soyad || ""} ${a?.ad || ""}`, `${b?.soyad || ""} ${b?.ad || ""}`);
}

/**
 * Form alanına blur eventi ile otomatik biçimlendirme bağla.
 * tip: "ad" | "soyad" | "metin" | "telefon"
 */
export function baglaFormat(inputEl, tip) {
  if (!inputEl) return;
  inputEl.addEventListener("blur", () => {
    switch (tip) {
      case "ad":      inputEl.value = formatAd(inputEl.value); break;
      case "soyad":   inputEl.value = formatSoyad(inputEl.value); break;
      case "metin":   inputEl.value = formatMetin(inputEl.value); break;
      case "telefon": inputEl.value = formatTelefon(inputEl.value); break;
    }
  });
}

/**
 * Öğrenci numarası doğrula: sadece rakam, boş değil.
 */
export function gecerliOgrenciNo(no) {
  return /^\d+$/.test(String(no).trim()) && String(no).trim().length > 0;
}

/**
 * TC Kimlik No doğrula.
 * Boş değer kabul edilir (boş bırakılabilir).
 * Girilmişse: 11 hane, ilk hane ≠ 0, resmi algoritma kontrolü.
 */
export function gecerliTc(tc) {
  const raw = String(tc ?? "").trim();
  if (raw === "") return true; // Boş bırakılabilir
  if (!/^\d{11}$/.test(raw)) return false;
  if (raw[0] === "0") return false;
  const d = raw.split("").map(Number);
  // 10. hane: (7*(d0+d2+d4+d6+d8) - (d1+d3+d5+d7)) mod 10
  const d10 = ((7 * (d[0] + d[2] + d[4] + d[6] + d[8]) - (d[1] + d[3] + d[5] + d[7])) % 10 + 10) % 10;
  if (d[9] !== d10) return false;
  // 11. hane: (d0+...+d9) mod 10
  const d11 = (d[0] + d[1] + d[2] + d[3] + d[4] + d[5] + d[6] + d[7] + d[8] + d[9]) % 10;
  return d[10] === d11;
}

/**
 * Devamsızlık eşik durumu döndürür.
 * Dön: "normal" | "uyari" | "kritik" | "kaldi"
 */
export function devamsizlikDurum(ozurlu, ozursuz) {
  const toplam = ozurlu + ozursuz;
  if (ozursuz >= 10 || toplam >= 30) return "kaldi";
  if (ozurlu >= 20) return "kritik";
  if (ozursuz >= 5 || ozurlu >= 10) return "uyari";
  return "normal";
}

/**
 * Devamsızlık durumunun kullanıcıya gösterilecek etiketini döndürür.
 */
export function devamsizlikDurumEtiketi(durum) {
  switch (durum) {
    case "kaldi":  return "Kaldı";
    case "kritik": return "Kritik";
    case "uyari":  return "Uyarı";
    default:       return "Normal";
  }
}

/**
 * Bootstrap badge renk sınıfı döndürür (devamsızlık durumuna göre).
 */
export function devamsizlikRenk(durum) {
  switch (durum) {
    case "kaldi":  return "dark";
    case "kritik": return "danger";
    case "uyari":  return "warning";
    default:       return "success";
  }
}

export function devamsizlikDurumRenk(durum) {
  return devamsizlikRenk(durum);
}

/**
 * Maddi durum seçenekleri.
 */
export const MADDİ_DURUM_SECENEKLER = ["Düşük", "Orta", "İyi", "Çok İyi"];

/**
 * Maddi duruma göre Bootstrap badge rengi döndürür.
 */
export function maddiDurumRenk(durum) {
  switch (durum) {
    case "Düşük":   return "danger";
    case "Orta":    return "warning";
    case "İyi":     return "success";
    case "Çok İyi": return "primary";
    default:        return "secondary";
  }
}

/**
 * Basit toast bildirimi göster (AdminLTE uyumlu).
 */
export function toast(mesaj, tip = "success") {
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

export function onayIste({
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
