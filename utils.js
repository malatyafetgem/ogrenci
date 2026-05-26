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
  return turkceByuk(str.trim());
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
export function turkceByuk(str) {
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
  const ilkHarf = turkceByuk(kucuk[0]);
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
 * Tarihi GG.AA.YYYY formatında göster.
 */
export function formatTarih(tarihStr) {
  if (!tarihStr) return "";
  // Zaten GG.AA.YYYY ise doğrudan döndür
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(tarihStr)) return tarihStr;
  // YYYY-MM-DD formatını dönüştür
  if (/^\d{4}-\d{2}-\d{2}$/.test(tarihStr)) {
    const [y, m, d] = tarihStr.split("-");
    return `${d}.${m}.${y}`;
  }
  return tarihStr;
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
  const [g, a, y] = str.split(".");
  return new Date(`${y}-${a}-${g}`);
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
 * TC Kimlik No doğrula: 11 hane, sadece rakam.
 */
export function gecerliTc(tc) {
  return /^\d{11}$/.test(String(tc).trim());
}

/**
 * Devamsızlık eşik durumu döndürür.
 * Dön: "normal" | "uyari" | "kritik"
 */
export function devamsizlikDurum(ozurlu, ozursuz) {
  if (ozursuz >= 10 || ozurlu >= 20) return "kritik";
  if (ozursuz >= 5 || ozurlu >= 10) return "uyari";
  return "normal";
}

/**
 * Bootstrap badge renk sınıfı döndürür (devamsızlık durumuna göre).
 */
export function devamsizlikRenk(durum) {
  switch (durum) {
    case "kritik": return "danger";
    case "uyari":  return "warning";
    default:       return "success";
  }
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
      <div class="toast-body">${mesaj}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
    </div>`;

  let kap = document.getElementById("toast-kap");
  if (!kap) {
    kap = document.createElement("div");
    kap.id = "toast-kap";
    kap.className = "toast-container position-fixed bottom-0 end-0 p-3";
    kap.style.zIndex = "1100";
    document.body.appendChild(kap);
  }
  kap.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}
