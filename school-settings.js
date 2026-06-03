import { db } from "./firebase-config.js?v=20260603-73";
import { doc, getDoc, setDoc } from "./firebase-imports.js?v=20260603-73";
import { bugun } from "./utils.js?v=20260603-73";

const SETTINGS_COLLECTION = "_settings";
const SCHOOL_DOC_ID = "school";
const AYARLAR_KANAL_ADI = "obs-school-settings";
const AYARLAR_STORAGE_KEY = "obs-school-settings-updated";

export const DEFAULT_SCHOOL_SETTINGS = {
  egitim_ogretim_yili: "2025-2026",
  donem: "2. Dönem"
};

let okulAyarlariCache = null;
let ayarDinlemeHazir = false;
let ayarKanali = null;

function okulAyarlariCacheTemizle() {
  okulAyarlariCache = null;
}

function ayarDinlemeyiBaslat() {
  if (ayarDinlemeHazir || typeof window === "undefined") return;
  ayarDinlemeHazir = true;

  if ("BroadcastChannel" in window) {
    ayarKanali = new BroadcastChannel(AYARLAR_KANAL_ADI);
    ayarKanali.addEventListener("message", event => {
      if (event.data?.type === "school-settings-updated") okulAyarlariCacheTemizle();
    });
  }

  window.addEventListener("storage", event => {
    if (event.key === AYARLAR_STORAGE_KEY) okulAyarlariCacheTemizle();
  });
}

function ayarDegisikliginiYayinla() {
  if (typeof window === "undefined") return;
  const payload = { type: "school-settings-updated", zaman: Date.now() };
  try {
    ayarKanali?.postMessage(payload);
  } catch {}
  try {
    localStorage.setItem(AYARLAR_STORAGE_KEY, String(payload.zaman));
  } catch {}
}

ayarDinlemeyiBaslat();

export async function okulAyarlariGetir(force = false) {
  if (okulAyarlariCache && !force) return okulAyarlariCache;
  const ref = doc(db, SETTINGS_COLLECTION, SCHOOL_DOC_ID);
  const snap = await getDoc(ref);
  okulAyarlariCache = {
    ...DEFAULT_SCHOOL_SETTINGS,
    ...(snap.exists() ? snap.data() : {})
  };
  return okulAyarlariCache;
}

export async function okulAyarlariKaydet(veri) {
  const kayit = {
    egitim_ogretim_yili: String(veri.egitim_ogretim_yili || DEFAULT_SCHOOL_SETTINGS.egitim_ogretim_yili).trim(),
    donem: String(veri.donem || DEFAULT_SCHOOL_SETTINGS.donem).trim(),
    guncelleme_tarihi: bugun()
  };
  await setDoc(doc(db, SETTINGS_COLLECTION, SCHOOL_DOC_ID), kayit, { merge: true });
  okulAyarlariCache = { ...DEFAULT_SCHOOL_SETTINGS, ...kayit };
  ayarDegisikliginiYayinla();
  return okulAyarlariCache;
}

export function okulDonemiEtiketi(ayarlar = DEFAULT_SCHOOL_SETTINGS) {
  return [ayarlar.egitim_ogretim_yili, ayarlar.donem].filter(Boolean).join(" · ");
}
