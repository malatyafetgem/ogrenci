/**
 * bump-version.mjs
 * Patch sürümünü artırır, APP_UPDATED_AT'i günceller,
 * sw.js CACHE_VERSION'u günceller ve
 * proje dosyalarındaki ?v= cache etiketlerini yeni etiketle değiştirir.
 *
 * Kullanım: node bump-version.mjs
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join, extname, basename } from "path";

// ─── Ayarlar ────────────────────────────────────────────────────────────────

const VERSION_DOSYASI = "./version.js";
const SW_DOSYASI = "./sw.js";
const HEDEF_UZANTILAR = new Set([".html", ".js", ".mjs"]);
const ATLANACAK_DOSYALAR = new Set(["bump-version.js", "bump-version.mjs", "sw.js"]);
const ETIKET_DESENI = /\?v=(\d{8}-\d+)/g;

// ─── version.js oku ─────────────────────────────────────────────────────────

const versionIcerik = readFileSync(VERSION_DOSYASI, "utf8");

const suruEslesmesi = versionIcerik.match(/APP_VERSION\s*=\s*"([\d.]+)"/);
if (!suruEslesmesi) {
  console.error("HATA: version.js içinde APP_VERSION bulunamadı.");
  process.exit(1);
}

const eskiSurum = suruEslesmesi[1];
const [major, minor, patch] = eskiSurum.split(".").map(Number);
const yeniPatch = patch + 1;
const yeniSurum = `${major}.${minor}.${yeniPatch}`;

// ─── Dosyaları tara ─────────────────────────────────────────────────────────

function dosyalariTara(dizin) {
  const sonuclar = [];
  for (const giris of readdirSync(dizin)) {
    const tam = join(dizin, giris);
    if (statSync(tam).isDirectory()) {
      if (giris === "node_modules" || giris.startsWith(".")) continue;
      sonuclar.push(...dosyalariTara(tam));
    } else if (HEDEF_UZANTILAR.has(extname(giris)) && !ATLANACAK_DOSYALAR.has(basename(giris))) {
      sonuclar.push(tam);
    }
  }
  return sonuclar;
}

const dosyalar = dosyalariTara(".");

// ─── Mevcut cache etiketlerini topla ────────────────────────────────────────

const bulunanEtiketler = new Set();

for (const dosya of dosyalar) {
  const icerik = readFileSync(dosya, "utf8");
  for (const eslesen of icerik.matchAll(ETIKET_DESENI)) {
    bulunanEtiketler.add(eslesen[0]); // örn. "?v=20260529-29"
  }
}

if (bulunanEtiketler.size === 0) {
  console.error("HATA: Hiçbir dosyada ?v=YYYYMMDD-NN formatında cache etiketi bulunamadı.");
  process.exit(1);
}

if (bulunanEtiketler.size > 1) {
  console.error("HATA: Projede birden fazla farklı cache etiketi var. Önce bunları elle eşitleyin:");
  for (const etiket of bulunanEtiketler) {
    console.error(`  ${etiket}`);
  }
  process.exit(1);
}

const eskiEtiket = [...bulunanEtiketler][0]; // örn. "?v=20260529-29"

// ─── Yeni cache etiketi ─────────────────────────────────────────────────────

// Tarih kısmını eskiden al, patch kısmını artır
const eskiTarihOneki = eskiEtiket.match(/\?v=(\d{8})-\d+/)[1]; // "20260529"

const bugun = new Date();
const yy = bugun.getFullYear();
const aa = String(bugun.getMonth() + 1).padStart(2, "0");
const gg = String(bugun.getDate()).padStart(2, "0");
const bugunOneki = `${yy}${aa}${gg}`;

// Yeni etikette bugünün tarihini ve artırılmış patch numarasını kullan
const yeniTarihOneki = bugunOneki;
const yeniEtiket = `?v=${yeniTarihOneki}-${yeniPatch}`;

const gosterimTarihi = `${gg}.${aa}.${yy}`;

if (eskiTarihOneki !== bugunOneki) {
  console.log(`  ℹ Tarih değişti: ${eskiTarihOneki} → ${bugunOneki}`);
}

// ─── version.js güncelle ────────────────────────────────────────────────────

const yeniVersionIcerik = versionIcerik
  .replace(/APP_VERSION\s*=\s*"[\d.]+"/, `APP_VERSION = "${yeniSurum}"`)
  .replace(/APP_UPDATED_AT\s*=\s*"[\d.]+"/, `APP_UPDATED_AT = "${gosterimTarihi}"`);

writeFileSync(VERSION_DOSYASI, yeniVersionIcerik, "utf8");
console.log(`\n✔ version.js güncellendi: ${eskiSurum} → ${yeniSurum}`);

// ─── sw.js CACHE_VERSION güncelle ───────────────────────────────────────────

const swIcerik = readFileSync(SW_DOSYASI, "utf8");
const swVerDeseni = /const CACHE_VERSION\s*=\s*"obs-cache-v[\d.]+"/;
const yeniSwVer = `const CACHE_VERSION = "obs-cache-v${yeniSurum}"`;

if (swVerDeseni.test(swIcerik)) {
  const eskiSwVer = swIcerik.match(swVerDeseni)[0];
  writeFileSync(SW_DOSYASI, swIcerik.replace(swVerDeseni, yeniSwVer), "utf8");
  console.log(`✔ sw.js güncellendi: ${eskiSwVer.match(/"([^"]+)"/)[1]} → obs-cache-v${yeniSurum}`);
} else {
  console.warn("⚠ sw.js içinde CACHE_VERSION deseni bulunamadı — elle kontrol edin.");
}

// ─── Tüm dosyalarda etiketi değiştir ────────────────────────────────────────

let degistirilmeDosyaSayisi = 0;
let degistirilmeToplamSayisi = 0;

for (const dosya of dosyalar) {
  const icerik = readFileSync(dosya, "utf8");
  if (!icerik.includes(eskiEtiket)) continue;

  const sayac = (icerik.match(new RegExp(eskiEtiket.replace("?", "\\?"), "g")) || []).length;
  writeFileSync(dosya, icerik.replaceAll(eskiEtiket, yeniEtiket), "utf8");

  console.log(`  ✔ ${dosya.replace(/\\/g, "/")}  (${sayac} değişiklik)`);
  degistirilmeDosyaSayisi++;
  degistirilmeToplamSayisi += sayac;
}

// ─── Özet ───────────────────────────────────────────────────────────────────

console.log(`
────────────────────────────────────────
  Sürüm   : ${eskiSurum} → ${yeniSurum}
  Tarih   : ${gosterimTarihi}
  Etiket  : ${eskiEtiket} → ${yeniEtiket}
  Dosya   : ${degistirilmeDosyaSayisi} dosyada ${degistirilmeToplamSayisi} referans güncellendi
────────────────────────────────────────
`);
