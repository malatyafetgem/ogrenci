/**
 * students.js — Öğrenci Firestore CRUD işlemleri
 */
import { db } from "./firebase-config.js?v=20260527-18";
import {
  collection, doc, getDoc, getDocs, addDoc, setDoc,
  updateDoc, deleteDoc, collectionGroup
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  bugun, compareOgrenci, compareSinif, compareTarihDesc,
  devamsizlikGunDegeri, formatTarih, tarihSiralamaAnahtari
} from "./utils.js?v=20260527-18";

const KOLEKSIYON = "students";
const VERI_CACHE_PREFIX = "obs-data-cache-v1:";
const OGRENCI_CACHE_TTL = 3 * 60 * 1000;
const ALT_CACHE_TTL = 2 * 60 * 1000;
const TEMIZLENECEK_EKRAN_CACHELERI = ["obs-dashboard-cache-v3"];
let ogrenciCachePromise = null;
const altCachePromises = new Map();
const arkaPlanYenilemeleri = new Map();

function ogrenciCacheTemizle() {
  ogrenciCachePromise = null;
}

function cacheKey(key) {
  return `${VERI_CACHE_PREFIX}${key}`;
}

function yerelCacheOku(key, ttl) {
  try {
    const raw = localStorage.getItem(cacheKey(key));
    if (!raw) return null;
    const cache = JSON.parse(raw);
    if (!cache?.zaman || Date.now() - cache.zaman > ttl) return null;
    return Array.isArray(cache.veri) ? cache.veri : null;
  } catch {
    return null;
  }
}

function yerelCacheYaz(key, veri) {
  try {
    localStorage.setItem(cacheKey(key), JSON.stringify({ zaman: Date.now(), veri }));
  } catch {
    // Depolama doluysa Firestore cache'iyle devam edilir.
  }
}

function yerelCacheSil(key) {
  try {
    localStorage.removeItem(cacheKey(key));
  } catch {}
}

function tumYerelCacheleriTemizle() {
  try {
    Object.keys(localStorage)
      .filter(key => key.startsWith(VERI_CACHE_PREFIX))
      .forEach(key => localStorage.removeItem(key));
    TEMIZLENECEK_EKRAN_CACHELERI.forEach(key => localStorage.removeItem(key));
  } catch {}
}

function tumCacheleriTemizle() {
  ogrenciCacheTemizle();
  altCachePromises.clear();
  arkaPlanYenilemeleri.clear();
  tumYerelCacheleriTemizle();
}

function altCacheTemizle(altKoleksiyon) {
  altCachePromises.delete(altKoleksiyon);
  yerelCacheSil(`alt:${altKoleksiyon}`);
  try {
    TEMIZLENECEK_EKRAN_CACHELERI.forEach(key => localStorage.removeItem(key));
  } catch {}
}

function arkaPlandaYenile(key, loader) {
  if (arkaPlanYenilemeleri.has(key)) return;
  const is = loader()
    .then(veri => yerelCacheYaz(key, veri))
    .catch(() => {})
    .finally(() => arkaPlanYenilemeleri.delete(key));
  arkaPlanYenilemeleri.set(key, is);
}

async function tumOgrenciBelgeleriGetir() {
  if (!ogrenciCachePromise) {
    const cached = yerelCacheOku("students", OGRENCI_CACHE_TTL);
    if (cached) {
      arkaPlandaYenile("students", ogrenciBelgeleriniFirestoredanGetir);
      return cached;
    }
    ogrenciCachePromise = ogrenciBelgeleriniFirestoredanGetir()
      .then(veri => {
        yerelCacheYaz("students", veri);
        return veri;
      })
      .catch(err => {
        ogrenciCacheTemizle();
        throw err;
      });
  }
  return ogrenciCachePromise;
}

function ogrenciBelgeleriniFirestoredanGetir() {
  return getDocs(collection(db, KOLEKSIYON))
      .then(snap => snap.docs.map(d => ({ id: d.id, ...d.data() })))
}

function altKayit(d) {
  return {
    id: d.id,
    ogrenciId: d.ref.parent.parent?.id || "",
    ...d.data()
  };
}

async function tumAltKayitlariGetir(altKoleksiyon) {
  if (altCachePromises.has(altKoleksiyon)) return altCachePromises.get(altKoleksiyon);
  const key = `alt:${altKoleksiyon}`;
  const cached = yerelCacheOku(key, ALT_CACHE_TTL);
  if (cached) {
    arkaPlandaYenile(key, () => tumAltKayitlariFirestoredanGetir(altKoleksiyon));
    return cached;
  }
  const promise = tumAltKayitlariFirestoredanGetir(altKoleksiyon)
    .then(veri => {
      yerelCacheYaz(key, veri);
      return veri;
    })
    .catch(err => {
      altCachePromises.delete(altKoleksiyon);
      throw err;
    });
  altCachePromises.set(altKoleksiyon, promise);
  return promise;
}

async function tumAltKayitlariFirestoredanGetir(altKoleksiyon) {
  try {
    const snap = await getDocs(collectionGroup(db, altKoleksiyon));
    return snap.docs.map(altKayit);
  } catch (_) {
    const ogrSnap = await getDocs(collection(db, KOLEKSIYON));
    const listeler = await Promise.all(
      ogrSnap.docs.map(async ogrDoc => {
        try {
          const snap = await getDocs(collection(db, KOLEKSIYON, ogrDoc.id, altKoleksiyon));
          return snap.docs.map(d => ({ id: d.id, ogrenciId: ogrDoc.id, ...d.data() }));
        } catch (_) {
          return [];
        }
      })
    );
    return listeler.flat();
  }
}

function tarihliVeri(veri) {
  if (!("tarih" in veri)) return veri;
  const tarih = formatTarih(veri.tarih);
  return {
    ...veri,
    tarih,
    tarih_sira: tarihSiralamaAnahtari(tarih)
  };
}

/** Tüm aktif öğrencileri getir */
export async function tumOgrencileriGetir() {
  const ogrenciler = await tumOgrenciBelgeleriGetir();
  return ogrenciler
    .filter(o => (o.durum || "Aktif") === "Aktif")
    .sort(compareOgrenci);
}

/** Tek öğrenci getir */
export async function ogrenciGetir(ogrenciNo) {
  const snap = await getDoc(doc(db, KOLEKSIYON, String(ogrenciNo)));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

/** Öğrenci numarası daha önce kullanılmış mı? */
export async function noMevcutMu(ogrenciNo) {
  const snap = await getDoc(doc(db, KOLEKSIYON, String(ogrenciNo)));
  return snap.exists();
}

/** Öğrenci ekle (belge ID = öğrenci numarası) */
export async function ogrenciEkle(ogrenciNo, veri) {
  await setDoc(doc(db, KOLEKSIYON, String(ogrenciNo)), {
    ...veri,
    durum: "Aktif",
    olusturma_tarihi: bugun()
  });
  tumCacheleriTemizle();
}

/** Öğrenci güncelle */
export async function ogrenciGuncelle(ogrenciNo, veri) {
  await updateDoc(doc(db, KOLEKSIYON, String(ogrenciNo)), {
    ...veri,
    guncelleme_tarihi: bugun()
  });
  tumCacheleriTemizle();
}

/** Öğrenci sil (tüm alt koleksiyonlarla — güvenli silme) */
export async function ogrenciSil(ogrenciNo) {
  const id = String(ogrenciNo);
  const altKoleksiyonlar = ["veliler", "devamsizliklar", "davranislar", "veligorusmeleri"];
  for (const alt of altKoleksiyonlar) {
    const snap = await getDocs(collection(db, KOLEKSIYON, id, alt));
    for (const d of snap.docs) await deleteDoc(d.ref);
  }
  await deleteDoc(doc(db, KOLEKSIYON, id));
  tumCacheleriTemizle();
}

/** Öğrencinin mezun olmasını işle */
export async function ogrenciMezunEt(ogrenciNo, mezunVerisi) {
  const id = String(ogrenciNo);
  // graduates koleksiyonuna kopyala
  await setDoc(doc(db, "graduates", id), {
    ...mezunVerisi,
    mezuniyet_tarihi: bugun()
  });
  // students'ta durumu güncelle
  await updateDoc(doc(db, KOLEKSIYON, id), { durum: "Mezun" });
  tumCacheleriTemizle();
}

// ── Alt koleksiyon: Veliler ──────────────────────────────────────────────────

export async function velileriGetir(ogrenciNo) {
  const snap = await getDocs(collection(db, KOLEKSIYON, String(ogrenciNo), "veliler"));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function tumVelileriGetir() {
  return tumAltKayitlariGetir("veliler");
}

export async function veliEkleGuncelle(ogrenciNo, veliId, veri) {
  if (veliId) {
    await setDoc(doc(db, KOLEKSIYON, String(ogrenciNo), "veliler", veliId), veri, { merge: true });
  } else {
    await addDoc(collection(db, KOLEKSIYON, String(ogrenciNo), "veliler"), veri);
  }
  altCacheTemizle("veliler");
}

// ── Alt koleksiyon: Devamsızlıklar ──────────────────────────────────────────

export async function devamsizliklarGetir(ogrenciNo) {
  const snap = await getDocs(collection(db, KOLEKSIYON, String(ogrenciNo), "devamsizliklar"));
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => compareTarihDesc(a.tarih, b.tarih));
}

export async function devamsizlikEkle(ogrenciNo, veri) {
  const ref = await addDoc(collection(db, KOLEKSIYON, String(ogrenciNo), "devamsizliklar"), tarihliVeri(veri));
  altCacheTemizle("devamsizliklar");
  return ref;
}

export async function devamsizlikSil(ogrenciNo, kayitId) {
  await deleteDoc(doc(db, KOLEKSIYON, String(ogrenciNo), "devamsizliklar", kayitId));
  altCacheTemizle("devamsizliklar");
}

/** Özürlü ve özürsüz toplamları hesapla */
export function devamsizlikHesapla(kayitlar) {
  let ozurlu = 0, ozursuz = 0;
  for (const k of kayitlar) {
    const gun = devamsizlikGunDegeri(k);
    if (k.tur === "Özürlü") ozurlu += gun;
    else ozursuz += gun;
  }
  return { ozurlu, ozursuz };
}

export async function tumDevamsizliklariGetir() {
  const kayitlar = await tumAltKayitlariGetir("devamsizliklar");
  return kayitlar.sort((a, b) => compareTarihDesc(a.tarih, b.tarih));
}

// ── Alt koleksiyon: Davranışlar ─────────────────────────────────────────────

export async function davranislarGetir(ogrenciNo) {
  const snap = await getDocs(collection(db, KOLEKSIYON, String(ogrenciNo), "davranislar"));
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => compareTarihDesc(a.tarih, b.tarih));
}

export async function davranisEkle(ogrenciNo, veri) {
  const ref = await addDoc(collection(db, KOLEKSIYON, String(ogrenciNo), "davranislar"), tarihliVeri(veri));
  altCacheTemizle("davranislar");
  return ref;
}

export async function davranisGuncelle(ogrenciNo, kayitId, veri) {
  await updateDoc(doc(db, KOLEKSIYON, String(ogrenciNo), "davranislar", kayitId), veri);
  altCacheTemizle("davranislar");
}

export async function davranisSil(ogrenciNo, kayitId) {
  await deleteDoc(doc(db, KOLEKSIYON, String(ogrenciNo), "davranislar", kayitId));
  altCacheTemizle("davranislar");
}

export async function tumDavranislariGetir() {
  const kayitlar = await tumAltKayitlariGetir("davranislar");
  return kayitlar.sort((a, b) => compareTarihDesc(a.tarih, b.tarih));
}

// ── Alt koleksiyon: Veli Görüşmeleri ────────────────────────────────────────

export async function gorusmeleriGetir(ogrenciNo) {
  const snap = await getDocs(collection(db, KOLEKSIYON, String(ogrenciNo), "veligorusmeleri"));
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => compareTarihDesc(a.tarih, b.tarih));
}

export async function gorusmeEkle(ogrenciNo, veri) {
  const ref = await addDoc(collection(db, KOLEKSIYON, String(ogrenciNo), "veligorusmeleri"), tarihliVeri(veri));
  altCacheTemizle("veligorusmeleri");
  return ref;
}

export async function gorusmeSil(ogrenciNo, kayitId) {
  await deleteDoc(doc(db, KOLEKSIYON, String(ogrenciNo), "veligorusmeleri", kayitId));
  altCacheTemizle("veligorusmeleri");
}

export async function tumGorusmeleriGetir() {
  const kayitlar = await tumAltKayitlariGetir("veligorusmeleri");
  return kayitlar.sort((a, b) => compareTarihDesc(a.tarih, b.tarih));
}

// ── Yardımcı: Dinamik sınıf listesi ─────────────────────────────────────────

export async function siniflarGetir() {
  const set = new Set();
  const ogrenciler = await tumOgrenciBelgeleriGetir();
  ogrenciler.forEach(veri => {
    if ((veri.durum || "Aktif") === "Aktif" && veri.sinif) set.add(veri.sinif);
  });
  return [...set].sort(compareSinif);
}
