/**
 * bump-version.mjs
 * Projedeki en buyuk surum/cache degerini bulur,
 * tum dosyalari bir sonraki surume tasir.
 *
 * Kullanim:
 * node bump-version.mjs
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join, extname, basename } from "path";

const VERSION_DOSYASI = "./version.js";
const SW_DOSYASI = "./sw.js";

const HEDEF_UZANTILAR = new Set([
  ".html",
  ".js",
  ".mjs",
  ".css",
  ".webmanifest"
]);

const ATLANACAK_DOSYALAR = new Set([
  "bump-version.mjs"
]);

const CACHE_ETIKET_DESENI = /\?v=(\d{8})-(\d+)/g;
const APP_VERSION_DESENI = /APP_VERSION\s*=\s*"(\d+)\.(\d+)\.(\d+)"/;
const APP_UPDATED_AT_DESENI = /APP_UPDATED_AT\s*=\s*"[^"]*"/;
const SW_CACHE_VERSION_DESENI = /const CACHE_VERSION\s*=\s*"obs-cache-v(\d+)\.(\d+)\.(\d+)"/;

function bugunYYYYMMDD() {
  const bugun = new Date();
  const yy = bugun.getFullYear();
  const aa = String(bugun.getMonth() + 1).padStart(2, "0");
  const gg = String(bugun.getDate()).padStart(2, "0");
  return `${yy}${aa}${gg}`;
}

function bugunGosterim() {
  const bugun = new Date();
  const yy = bugun.getFullYear();
  const aa = String(bugun.getMonth() + 1).padStart(2, "0");
  const gg = String(bugun.getDate()).padStart(2, "0");
  return `${gg}.${aa}.${yy}`;
}

function dosyalariTara(dizin) {
  const sonuclar = [];

  for (const giris of readdirSync(dizin)) {
    const tam = join(dizin, giris);

    if (statSync(tam).isDirectory()) {
      if (
        giris === "node_modules" ||
        giris === ".git" ||
        giris.startsWith(".")
      ) {
        continue;
      }

      sonuclar.push(...dosyalariTara(tam));
      continue;
    }

    if (
      HEDEF_UZANTILAR.has(extname(giris)) &&
      !ATLANACAK_DOSYALAR.has(basename(giris))
    ) {
      sonuclar.push(tam);
    }
  }

  return sonuclar;
}

function okuVarsa(dosya) {
  try {
    return readFileSync(dosya, "utf8");
  } catch {
    return "";
  }
}

const dosyalar = dosyalariTara(".");

const versionIcerik = okuVarsa(VERSION_DOSYASI);
const swIcerik = okuVarsa(SW_DOSYASI);

let major = 1;
let minor = 0;
let enBuyukPatch = 0;

const versionEslesmesi = versionIcerik.match(APP_VERSION_DESENI);

if (versionEslesmesi) {
  major = Number(versionEslesmesi[1]);
  minor = Number(versionEslesmesi[2]);
  enBuyukPatch = Math.max(enBuyukPatch, Number(versionEslesmesi[3]));
}

const swEslesmesi = swIcerik.match(SW_CACHE_VERSION_DESENI);

if (swEslesmesi) {
  major = Math.max(major, Number(swEslesmesi[1]));
  minor = Math.max(minor, Number(swEslesmesi[2]));
  enBuyukPatch = Math.max(enBuyukPatch, Number(swEslesmesi[3]));
}

let enBuyukTarih = "00000000";
let enBuyukCacheNo = 0;
let bulunanCacheEtiketiSayisi = 0;

for (const dosya of dosyalar) {
  const icerik = okuVarsa(dosya);

  for (const eslesen of icerik.matchAll(CACHE_ETIKET_DESENI)) {
    const tarih = eslesen[1];
    const no = Number(eslesen[2]);

    bulunanCacheEtiketiSayisi++;

    if (tarih > enBuyukTarih) {
      enBuyukTarih = tarih;
    }

    if (no > enBuyukCacheNo) {
      enBuyukCacheNo = no;
    }

    if (no > enBuyukPatch) {
      enBuyukPatch = no;
    }
  }
}

if (!versionEslesmesi) {
  console.error("[HATA] version.js icinde APP_VERSION bulunamadi.");
  process.exit(1);
}

if (bulunanCacheEtiketiSayisi === 0) {
  console.error("[HATA] Projede ?v=YYYYMMDD-N formatinda cache etiketi bulunamadi.");
  process.exit(1);
}

const bugunEtiketi = bugunYYYYMMDD();
const yeniTarih = bugunEtiketi > enBuyukTarih ? bugunEtiketi : enBuyukTarih;
const yeniPatch = enBuyukPatch + 1;
const yeniCacheNo = Math.max(enBuyukCacheNo, enBuyukPatch) + 1;

const eskiSurum = `${versionEslesmesi[1]}.${versionEslesmesi[2]}.${versionEslesmesi[3]}`;
const yeniSurum = `${major}.${minor}.${yeniPatch}`;
const yeniEtiket = `?v=${yeniTarih}-${yeniCacheNo}`;
const yeniGosterimTarihi = bugunGosterim();

let degisenDosyaSayisi = 0;
let degisenToplamSayisi = 0;

for (const dosya of dosyalar) {
  const icerik = okuVarsa(dosya);

  const eslesmeler = [...icerik.matchAll(CACHE_ETIKET_DESENI)];

  if (eslesmeler.length === 0) {
    continue;
  }

  const yeniIcerik = icerik.replace(CACHE_ETIKET_DESENI, yeniEtiket);

  if (yeniIcerik !== icerik) {
    writeFileSync(dosya, yeniIcerik, "utf8");
    degisenDosyaSayisi++;
    degisenToplamSayisi += eslesmeler.length;
    console.log(`[OK] ${dosya.replace(/\\/g, "/")} - ${eslesmeler.length} cache etiketi guncellendi`);
  }
}

const yeniVersionIcerik = versionIcerik
  .replace(APP_VERSION_DESENI, `APP_VERSION = "${yeniSurum}"`)
  .replace(APP_UPDATED_AT_DESENI, `APP_UPDATED_AT = "${yeniGosterimTarihi}"`);

writeFileSync(VERSION_DOSYASI, yeniVersionIcerik, "utf8");
console.log(`[OK] version.js: ${eskiSurum} -> ${yeniSurum}`);

if (swIcerik) {
  if (SW_CACHE_VERSION_DESENI.test(swIcerik)) {
    const yeniSwIcerik = swIcerik.replace(
      SW_CACHE_VERSION_DESENI,
      `const CACHE_VERSION = "obs-cache-v${yeniSurum}"`
    );

    writeFileSync(SW_DOSYASI, yeniSwIcerik, "utf8");
    console.log(`[OK] sw.js: obs-cache-v${yeniSurum}`);
  } else {
    console.warn("[UYARI] sw.js icinde CACHE_VERSION bulunamadi. Elle kontrol edin.");
  }
}

console.log("");
console.log("========================================");
console.log("Surum guncelleme tamamlandi");
console.log("========================================");
console.log(`Eski surum       : ${eskiSurum}`);
console.log(`Yeni surum       : ${yeniSurum}`);
console.log(`Yeni cache etiketi: ${yeniEtiket}`);
console.log(`Guncellenen dosya : ${degisenDosyaSayisi}`);
console.log(`Toplam degisiklik : ${degisenToplamSayisi}`);
console.log("========================================");
