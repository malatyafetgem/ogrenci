import { db } from "./firebase-config.js?v=20260602-47";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { bugun } from "./utils.js?v=20260602-47";

const SETTINGS_COLLECTION = "_settings";
const SCHOOL_DOC_ID = "school";

export const DEFAULT_SCHOOL_SETTINGS = {
  egitim_ogretim_yili: "2025-2026",
  donem: "2. Dönem"
};

let okulAyarlariCache = null;

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
  return okulAyarlariCache;
}

export function okulDonemiEtiketi(ayarlar = DEFAULT_SCHOOL_SETTINGS) {
  return [ayarlar.egitim_ogretim_yili, ayarlar.donem].filter(Boolean).join(" · ");
}
