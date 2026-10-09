(function () {
"use strict";
const OBS = window.OBS = window.OBS || {};
const { db, collection, doc, getDoc, getDocs, addDoc, setDoc, updateDoc, deleteDoc, deleteField, query, where, writeBatch, bugun, compareOgrenci, compareSinif, compareTarihDesc, formatTarih, tarihSiralamaAnahtari, APP_VERSION } = OBS;
/**
 * students.js — Öğrenci Firestore CRUD işlemleri
 */

const KOLEKSIYON = "students";
const KAYIT_KOLEKSIYONLARI = ["davranislar", "veligorusmeleri"];
const VERI_CACHE_PREFIX = `obs-data-cache-v2:${APP_VERSION}:`;
const ESKI_VERI_CACHE_PREFIXLERI = ["obs-data-cache-v1:"];
const OGRENCI_CACHE_TTL = 3 * 60 * 1000;
const KAYIT_CACHE_TTL = 2 * 60 * 1000;
const TEMIZLENECEK_EKRAN_CACHE_PREFIXLERI = ["obs-dashboard-cache-"];
// Öğrenci belgesinde tutulan tek alanlar (firestore.rules ile aynı olmalı).
const IZINLI_OGRENCI_ALANLARI = [
  "numara", "ad", "soyad", "sinif", "cinsiyet", "yatililik",
  "dogum_tarihi", "durum", "olusturma_tarihi", "guncelleme_tarihi"
];
let ogrenciCachePromise = null;
const kayitCachePromises = new Map();
const arkaPlanYenilemeleri = new Map();
const yerelCacheUyarilari = new Set();

function ogrenciCacheTemizle() {
  ogrenciCachePromise = null;
}

function cacheKey(key) {
  return `${VERI_CACHE_PREFIX}${key}`;
}

function yerelCacheHatasiLogla(islem, key, err) {
  const imza = `${islem}:${key}`;
  if (yerelCacheUyarilari.has(imza)) return;
  yerelCacheUyarilari.add(imza);
  console.warn(`[OBS] Yerel cache ${islem} başarısız: ${key}`, err);
}

function yerelCacheOku(key, ttl) {
  try {
    const raw = sessionStorage.getItem(cacheKey(key));
    if (!raw) return null;
    const cache = JSON.parse(raw);
    if (!cache?.zaman || Date.now() - cache.zaman > ttl) return null;
    return Array.isArray(cache.veri) ? cache.veri : null;
  } catch (err) {
    yerelCacheHatasiLogla("okuma", key, err);
    return null;
  }
}

function yerelCacheYaz(key, veri) {
  try {
    sessionStorage.setItem(cacheKey(key), JSON.stringify({ zaman: Date.now(), veri }));
  } catch (err) {
    yerelCacheHatasiLogla("yazma", key, err);
  }
}

function yerelCacheSil(key) {
  try {
    sessionStorage.removeItem(cacheKey(key));
  } catch (err) {
    yerelCacheHatasiLogla("silme", key, err);
  }
}

function ekranCacheleriniTemizle() {
  try {
    Object.keys(sessionStorage)
      .filter(key => TEMIZLENECEK_EKRAN_CACHE_PREFIXLERI.some(prefix => key.startsWith(prefix)))
      .forEach(key => sessionStorage.removeItem(key));
  } catch (err) {
    yerelCacheHatasiLogla("ekran temizleme", TEMIZLENECEK_EKRAN_CACHE_PREFIXLERI.join(","), err);
  }
}

function tumYerelCacheleriTemizle() {
  try {
    Object.keys(sessionStorage)
      .filter(key =>
        key.startsWith(VERI_CACHE_PREFIX) ||
        ESKI_VERI_CACHE_PREFIXLERI.some(prefix => key.startsWith(prefix))
      )
      .forEach(key => sessionStorage.removeItem(key));
  } catch (err) {
    yerelCacheHatasiLogla("toplu temizleme", VERI_CACHE_PREFIX, err);
  }
  ekranCacheleriniTemizle();
}

function tumCacheleriTemizle() {
  ogrenciCacheTemizle();
  kayitCachePromises.clear();
  arkaPlanYenilemeleri.clear();
  tumYerelCacheleriTemizle();
}

function veriCacheleriniTemizle() {
  tumCacheleriTemizle();
}

function kayitCacheTemizle(koleksiyon) {
  kayitCachePromises.delete(koleksiyon);
  yerelCacheSil(`kayit:${koleksiyon}`);
  ekranCacheleriniTemizle();
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
    if (cached && cached.length > 0) {
      arkaPlandaYenile("students", ogrenciBelgeleriniFirestoredanGetir);
      return cached;
    }
    if (cached && cached.length === 0) yerelCacheSil("students");
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
      .then(snap => snap.docs.map(d => ogrenciBelgesiniNormalizeEt({ id: d.id, ...d.data() })))
}

function ogrenciDurumunuNormalizeEt(durum) {
  const deger = String(durum || "").trim();
  if (!deger || deger === "Aktif") return "Aktif";
  return "Mezun";
}

function ogrenciBelgesiniNormalizeEt(veri = {}) {
  return {
    ...veri,
    durum: ogrenciDurumunuNormalizeEt(veri.durum)
  };
}

function ogrenciAktifMi(ogrenci) {
  return ogrenciDurumunuNormalizeEt(ogrenci?.durum) === "Aktif";
}

async function tumKayitlariGetir(koleksiyon) {
  if (kayitCachePromises.has(koleksiyon)) return kayitCachePromises.get(koleksiyon);
  const key = `kayit:${koleksiyon}`;
  const cached = yerelCacheOku(key, KAYIT_CACHE_TTL);
  if (cached) {
    arkaPlandaYenile(key, () => tumKayitlariFirestoredanGetir(koleksiyon));
    return cached;
  }
  const promise = tumKayitlariFirestoredanGetir(koleksiyon)
    .then(veri => {
      yerelCacheYaz(key, veri);
      return veri;
    })
    .catch(err => {
      kayitCachePromises.delete(koleksiyon);
      throw err;
    });
  kayitCachePromises.set(koleksiyon, promise);
  return promise;
}

async function tumKayitlariFirestoredanGetir(koleksiyon) {
  const snap = await getDocs(collection(db, koleksiyon));
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(kayit => kayit.ogrenciId);
}

/**
 * Firestore "in" operatörü en fazla 30 değer kabul eder.
 * Bu fonksiyon ID listesini 30'luk gruplara bölerek birden fazla sorgu
 * paralel çalıştırır ve sonuçları birleştirir.
 */
async function ogrenciIdlerineGoreKayitlariGetir(koleksiyon, idler) {
  const BATCH = 30;
  const sonuclar = [];
  for (let i = 0; i < idler.length; i += BATCH) {
    const grup = idler.slice(i, i + BATCH);
    const snap = await getDocs(
      query(collection(db, koleksiyon), where("ogrenciId", "in", grup))
    );
    snap.docs.forEach(d => sonuclar.push({ id: d.id, ...d.data() }));
  }
  return sonuclar.filter(kayit => kayit.ogrenciId);
}

/**
 * Verilen ref listesini writeBatch ile siler (max 450/batch).
 */
async function refleriBatchSil(refler) {
  for (let i = 0; i < refler.length; i += 450) {
    const batch = writeBatch(db);
    refler.slice(i, i + 450).forEach(ref => batch.delete(ref));
    await batch.commit();
  }
}

async function ogrenciGlobalKayitlariniSil(ogrenciNo) {
  const refler = [];
  for (const koleksiyon of KAYIT_KOLEKSIYONLARI) {
    refler.push(...await ogrenciIdIleRefleriGetir(koleksiyon, ogrenciNo));
  }
  await refleriBatchSil(refler);
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

function ogrenciIdSorguDegerleri(ogrenciNo) {
  const id = String(ogrenciNo);
  const degerler = [id];
  const sayisal = Number(id);
  if (/^\d+$/.test(id) && String(sayisal) === id && Number.isSafeInteger(sayisal)) degerler.push(sayisal);
  return degerler;
}

async function ogrenciIdIleBelgeleriGetir(koleksiyon, ogrenciNo) {
  const sonuc = new Map();
  for (const deger of ogrenciIdSorguDegerleri(ogrenciNo)) {
    const snap = await getDocs(query(collection(db, koleksiyon), where("ogrenciId", "==", deger)));
    snap.docs.forEach(d => sonuc.set(d.id, { id: d.id, ...d.data() }));
  }
  return [...sonuc.values()];
}

async function ogrenciIdIleRefleriGetir(koleksiyon, ogrenciNo) {
  const sonuc = new Map();
  for (const deger of ogrenciIdSorguDegerleri(ogrenciNo)) {
    const snap = await getDocs(query(collection(db, koleksiyon), where("ogrenciId", "==", deger)));
    snap.docs.forEach(d => sonuc.set(d.id, d.ref));
  }
  return [...sonuc.values()];
}

async function kayitlariOgrenciyeGoreGetir(koleksiyon, ogrenciNo) {
  return (await ogrenciIdIleBelgeleriGetir(koleksiyon, ogrenciNo))
    .filter(kayit => kayit.ogrenciId !== undefined && kayit.ogrenciId !== null)
    .sort((a, b) => compareTarihDesc(a.tarih, b.tarih));
}

/** Tüm aktif ve mezun öğrencileri getir */
async function tumOgrencileriDurumlariylaGetir() {
  const ogrenciler = await tumOgrenciBelgeleriGetir();
  return ogrenciler
    .map(ogrenciBelgesiniNormalizeEt)
    .sort(compareOgrenci);
}

/** Tüm aktif öğrencileri getir */
async function tumOgrencileriGetir() {
  return (await tumOgrencileriDurumlariylaGetir())
    .filter(ogrenciAktifMi)
    .sort(compareOgrenci);
}

/** Tek öğrenci getir */
async function ogrenciGetir(ogrenciNo) {
  const snap = await getDoc(doc(db, KOLEKSIYON, String(ogrenciNo)));
  if (!snap.exists()) return null;
  return ogrenciBelgesiniNormalizeEt({ id: snap.id, ...snap.data() });
}

/** Öğrenci numarası daha önce kullanılmış mı? */
async function noMevcutMu(ogrenciNo) {
  const snap = await getDoc(doc(db, KOLEKSIYON, String(ogrenciNo)));
  return snap.exists();
}

function ogrenciEklemeVerisi(veri) {
  return {
    ...veri,
    durum: "Aktif",
    olusturma_tarihi: bugun()
  };
}

function ogrenciGuncellemeVerisi(veri, eski = {}) {
  const guncelVeri = {
    ...veri,
    guncelleme_tarihi: bugun()
  };
  if ("durum" in guncelVeri) {
    guncelVeri.durum = ogrenciDurumunuNormalizeEt(guncelVeri.durum);
  } else {
    guncelVeri.durum = ogrenciDurumunuNormalizeEt(eski?.durum || "");
  }
  // Eski sürümden kalan alanlar (telefon, TC vb.) güncelleme sırasında temizlenir.
  Object.keys(eski || {}).forEach(alan => {
    if (!IZINLI_OGRENCI_ALANLARI.includes(alan)) guncelVeri[alan] = deleteField();
  });
  return guncelVeri;
}

/** Öğrenci ekle (belge ID = öğrenci numarası) */
async function ogrenciEkle(ogrenciNo, veri) {
  await setDoc(doc(db, KOLEKSIYON, String(ogrenciNo)), ogrenciEklemeVerisi(veri));
  tumCacheleriTemizle();
}

/** Öğrenci güncelle */
async function ogrenciGuncelle(ogrenciNo, veri) {
  const ref = doc(db, KOLEKSIYON, String(ogrenciNo));
  const eskiSnap = await getDoc(ref);
  const eski = eskiSnap.exists() ? eskiSnap.data() : {};
  await updateDoc(ref, ogrenciGuncellemeVerisi(veri, eski));
  tumCacheleriTemizle();
}

async function ogrenciSil(ogrenciNo) {
  const id = String(ogrenciNo);
  await ogrenciGlobalKayitlariniSil(id);
  await deleteDoc(doc(db, KOLEKSIYON, id));
  tumCacheleriTemizle();
}

// ── Davranışlar ─────────────────────────────────────────────────────────────

async function davranislarGetir(ogrenciNo) {
  return kayitlariOgrenciyeGoreGetir("davranislar", ogrenciNo);
}

async function davranisEkle(ogrenciNo, veri) {
  const ref = await addDoc(collection(db, "davranislar"), {
    ogrenciId: String(ogrenciNo),
    ...tarihliVeri(veri)
  });
  kayitCacheTemizle("davranislar");
  return ref;
}

async function davranisGuncelle(_ogrenciNo, kayitId, veri) {
  await updateDoc(doc(db, "davranislar", String(kayitId)), tarihliVeri(veri));
  kayitCacheTemizle("davranislar");
}

async function davranisSil(_ogrenciNo, kayitId) {
  await deleteDoc(doc(db, "davranislar", String(kayitId)));
  kayitCacheTemizle("davranislar");
}

async function tumDavranislariGetir() {
  const kayitlar = await tumKayitlariGetir("davranislar");
  return kayitlar.sort((a, b) => compareTarihDesc(a.tarih, b.tarih));
}

/**
 * Verilen sınıfa ait davranış kayıtlarını getirir.
 * sinif boş verilirse tüm kayıtlar döner.
 *
 * Firestore Console'da performans için önerilen index:
 *   Koleksiyon: davranislar | Alan: ogrenciId (ASC) | Alan: tarih_sira (DESC)
 *   https://console.firebase.google.com/project/_/firestore/indexes
 */
async function sinifaGoreDavranislariGetir(sinif) {
  if (!sinif) return tumDavranislariGetir();
  const ogrenciler = await tumOgrencileriGetir();
  const sinifIdleri = ogrenciler
    .filter(o => o.sinif === sinif)
    .map(o => String(o.id));
  if (!sinifIdleri.length) return [];
  const kayitlar = await ogrenciIdlerineGoreKayitlariGetir("davranislar", sinifIdleri);
  return kayitlar.sort((a, b) => compareTarihDesc(a.tarih, b.tarih));
}

// ── Veli Görüşmeleri ───────────────────────────────────────────────────────

async function gorusmeleriGetir(ogrenciNo) {
  return kayitlariOgrenciyeGoreGetir("veligorusmeleri", ogrenciNo);
}

async function gorusmeEkle(ogrenciNo, veri) {
  const ref = await addDoc(collection(db, "veligorusmeleri"), {
    ogrenciId: String(ogrenciNo),
    ...tarihliVeri(veri)
  });
  kayitCacheTemizle("veligorusmeleri");
  return ref;
}

async function gorusmeSil(_ogrenciNo, kayitId) {
  await deleteDoc(doc(db, "veligorusmeleri", String(kayitId)));
  kayitCacheTemizle("veligorusmeleri");
}

async function gorusmeGuncelle(_ogrenciNo, kayitId, veri) {
  // Eski sürümden kalan veli_id alanı güncelleme sırasında temizlenir.
  await updateDoc(doc(db, "veligorusmeleri", String(kayitId)), { ...tarihliVeri(veri), veli_id: deleteField() });
  kayitCacheTemizle("veligorusmeleri");
}

async function tumGorusmeleriGetir() {
  const kayitlar = await tumKayitlariGetir("veligorusmeleri");
  return kayitlar.sort((a, b) => compareTarihDesc(a.tarih, b.tarih));
}

/**
 * Verilen sınıfa ait veli görüşmesi kayıtlarını getirir.
 * sinif boş verilirse tüm kayıtlar döner.
 *
 * Firestore Console'da performans için önerilen index:
 *   Koleksiyon: veligorusmeleri | Alan: ogrenciId (ASC) | Alan: tarih_sira (DESC)
 *   https://console.firebase.google.com/project/_/firestore/indexes
 */
async function sinifaGoreGorusmeleriGetir(sinif) {
  if (!sinif) return tumGorusmeleriGetir();
  const ogrenciler = await tumOgrencileriGetir();
  const sinifIdleri = ogrenciler
    .filter(o => o.sinif === sinif)
    .map(o => String(o.id));
  if (!sinifIdleri.length) return [];
  const kayitlar = await ogrenciIdlerineGoreKayitlariGetir("veligorusmeleri", sinifIdleri);
  return kayitlar.sort((a, b) => compareTarihDesc(a.tarih, b.tarih));
}

// ── Yardımcı: Dinamik sınıf listesi ─────────────────────────────────────────

async function siniflarGetir() {
  const set = new Set();
  const ogrenciler = await tumOgrenciBelgeleriGetir();
  ogrenciler.forEach(veri => {
    if (ogrenciAktifMi(veri) && veri.sinif) set.add(veri.sinif);
  });
  return [...set].sort(compareSinif);
}

async function tumSiniflariGetir() {
  const set = new Set();
  const ogrenciler = await tumOgrencileriDurumlariylaGetir();
  ogrenciler.forEach(veri => {
    if (veri.sinif) set.add(veri.sinif);
  });
  return [...set].sort(compareSinif);
}

Object.assign(OBS, { veriCacheleriniTemizle, ogrenciDurumunuNormalizeEt, ogrenciAktifMi, tumOgrencileriDurumlariylaGetir, tumOgrencileriGetir, ogrenciGetir, noMevcutMu, ogrenciEkle, ogrenciGuncelle, ogrenciSil, davranislarGetir, davranisEkle, davranisGuncelle, davranisSil, tumDavranislariGetir, sinifaGoreDavranislariGetir, gorusmeleriGetir, gorusmeEkle, gorusmeSil, gorusmeGuncelle, tumGorusmeleriGetir, sinifaGoreGorusmeleriGetir, siniflarGetir, tumSiniflariGetir, IZINLI_OGRENCI_ALANLARI });
})();
