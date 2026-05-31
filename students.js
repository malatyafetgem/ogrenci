/**
 * students.js — Öğrenci Firestore CRUD işlemleri
 */
import { db } from "./firebase-config.js?v=20260531-36";
import {
  collection, doc, getDoc, getDocs, addDoc, setDoc,
  updateDoc, deleteDoc, query, where, writeBatch
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  bugun, compareOgrenci, compareSinif, compareTarihDesc,
  devamsizlikGunDegeri, formatTarih, tarihSiralamaAnahtari
} from "./utils.js?v=20260531-36";

const KOLEKSIYON = "students";
const VELI_KOLEKSIYON = "veliler";
const KAYIT_KOLEKSIYONLARI = ["devamsizliklar", "davranislar", "veligorusmeleri"];
const VERI_CACHE_PREFIX = "obs-data-cache-v1:";
const OGRENCI_CACHE_TTL = 3 * 60 * 1000;
const KAYIT_CACHE_TTL = 2 * 60 * 1000;
const TEMIZLENECEK_EKRAN_CACHELERI = ["obs-dashboard-cache-v3"];
let ogrenciCachePromise = null;
let veliCachePromise = null;
const kayitCachePromises = new Map();
const arkaPlanYenilemeleri = new Map();

function ogrenciCacheTemizle() {
  ogrenciCachePromise = null;
}

function veliCacheTemizle() {
  veliCachePromise = null;
  yerelCacheSil(VELI_KOLEKSIYON);
  try {
    TEMIZLENECEK_EKRAN_CACHELERI.forEach(key => localStorage.removeItem(key));
  } catch {}
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
  veliCacheTemizle();
  kayitCachePromises.clear();
  arkaPlanYenilemeleri.clear();
  tumYerelCacheleriTemizle();
}

export function veriCacheleriniTemizle() {
  tumCacheleriTemizle();
}

function kayitCacheTemizle(koleksiyon) {
  kayitCachePromises.delete(koleksiyon);
  yerelCacheSil(`kayit:${koleksiyon}`);
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
  const id = String(ogrenciNo);
  const refler = [];
  for (const koleksiyon of KAYIT_KOLEKSIYONLARI) {
    const snap = await getDocs(query(collection(db, koleksiyon), where("ogrenciId", "==", id)));
    snap.docs.forEach(d => refler.push(d.ref));
  }
  await refleriBatchSil(refler);
}

function boolDeger(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;
  const text = String(value || "").trim().toLocaleLowerCase("tr-TR");
  return ["1", "evet", "e", "true", "var", "x", "birincil"].includes(text);
}

function sayiDeger(value, fallback = 0) {
  const n = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : fallback;
}

function ilkDolu(...degerler) {
  return degerler.find(v => v !== undefined && v !== null && String(v).trim() !== "") || "";
}

const YAKINLIK_SIRASI = {
  "Anne": 1,
  "Baba": 2,
  "Vasi": 3,
  "Üvey Anne": 4,
  "Üvey Baba": 5,
  "Dede": 6,
  "Nine": 7,
  "Abi": 8,
  "Abla": 9,
  "Koruyucu Aile": 10,
  "Diğer": 99
};

function veliKaydiniNormalizeEt(ogrenciNo, veri = {}, eski = {}) {
  const olusturmaTarihi = ilkDolu(veri.olusturma_tarihi, eski.olusturma_tarihi, bugun());
  const guncellemeTarihi = ilkDolu(veri.guncelleme_tarihi, eski.guncelleme_tarihi, bugun());
  const birincilKaynak = veri.birincil ?? eski.birincil ?? false;
  const acilKaynak = veri.acil_kisi ?? eski.acil_kisi ?? false;

  return {
    ...(veri.id || eski.id ? { id: veri.id || eski.id } : {}),
    ogrenciId: String(ilkDolu(veri.ogrenciId, eski.ogrenciId, ogrenciNo)),
    yakinlik: ilkDolu(veri.yakinlik, eski.yakinlik, "Diğer"),
    ad: ilkDolu(veri.ad, eski.ad),
    soyad: ilkDolu(veri.soyad, eski.soyad),
    durum: ilkDolu(veri.durum, eski.durum, "Aktif"),
    birincil: boolDeger(birincilKaynak),
    acil_kisi: boolDeger(acilKaynak),
    iletisim_sirasi: sayiDeger(ilkDolu(veri.iletisim_sirasi, eski.iletisim_sirasi), 0),
    telefon: ilkDolu(veri.telefon, eski.telefon),
    e_posta: ilkDolu(veri.e_posta, eski.e_posta),
    il: ilkDolu(veri.il, eski.il),
    ilce: ilkDolu(veri.ilce, eski.ilce),
    adres: ilkDolu(veri.adres, eski.adres),
    calisma_durumu: ilkDolu(veri.calisma_durumu, eski.calisma_durumu),
    meslek_grubu: ilkDolu(veri.meslek_grubu, eski.meslek_grubu),
    meslek: ilkDolu(veri.meslek, eski.meslek),
    gorev_unvan: ilkDolu(veri.gorev_unvan, eski.gorev_unvan),
    kurum: ilkDolu(veri.kurum, eski.kurum),
    notlar: ilkDolu(veri.notlar, eski.notlar),
    olusturma_tarihi: olusturmaTarihi,
    guncelleme_tarihi: guncellemeTarihi
  };
}

function veliSiralama(a, b) {
  return Number(!!b.birincil) - Number(!!a.birincil)
    || sayiDeger(a.iletisim_sirasi, 999) - sayiDeger(b.iletisim_sirasi, 999)
    || (YAKINLIK_SIRASI[a.yakinlik] || 99) - (YAKINLIK_SIRASI[b.yakinlik] || 99)
    || `${a.ad || ""} ${a.soyad || ""}`.localeCompare(`${b.ad || ""} ${b.soyad || ""}`, "tr");
}

async function tumVelileriFirestoredanGetir() {
  const snap = await getDocs(collection(db, VELI_KOLEKSIYON));
  return snap.docs
    .map(d => veliKaydiniNormalizeEt("", { id: d.id, ...d.data() }))
    .sort(veliSiralama);
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

export async function ogrenciSil(ogrenciNo) {
  const id = String(ogrenciNo);
  await ogrenciVelileriniSil(id);
  await ogrenciGlobalKayitlariniSil(id);
  await deleteDoc(doc(db, KOLEKSIYON, id));
  tumCacheleriTemizle();
}

// ── Merkezi koleksiyon: Veliler ─────────────────────────────────────────────

export async function velileriGetir(ogrenciNo) {
  const id = String(ogrenciNo);
  const veliler = await tumVelileriGetir();
  return veliler.filter(v => String(v.ogrenciId) === id).sort(veliSiralama);
}

export async function tumVelileriGetir() {
  if (!veliCachePromise) {
    const cached = yerelCacheOku(VELI_KOLEKSIYON, KAYIT_CACHE_TTL);
    if (cached) {
      arkaPlandaYenile(VELI_KOLEKSIYON, tumVelileriFirestoredanGetir);
      return cached;
    }
    veliCachePromise = tumVelileriFirestoredanGetir()
      .then(veri => {
        yerelCacheYaz(VELI_KOLEKSIYON, veri);
        return veri;
      })
      .catch(err => {
        veliCacheTemizle();
        throw err;
      });
  }
  return veliCachePromise;
}

export async function veliEkleGuncelle(ogrenciNo, veliId, veri) {
  let eski = {};
  if (veliId) {
    const eskiSnap = await getDoc(doc(db, VELI_KOLEKSIYON, String(veliId)));
    eski = eskiSnap.exists() ? eskiSnap.data() : {};
  }
  const { id: _id, ...kayit } = veliKaydiniNormalizeEt(ogrenciNo, veri, eski);
  kayit.guncelleme_tarihi = bugun();
  if (!veliId) kayit.olusturma_tarihi = bugun();
  if (veliId) {
    await setDoc(doc(db, VELI_KOLEKSIYON, String(veliId)), kayit, { merge: true });
  } else {
    await addDoc(collection(db, VELI_KOLEKSIYON), kayit);
  }
  veliCacheTemizle();
}

export async function veliSil(_ogrenciNo, veliId) {
  if (!veliId) return;
  await deleteDoc(doc(db, VELI_KOLEKSIYON, String(veliId)));
  veliCacheTemizle();
}

export async function ogrenciVelileriniSil(ogrenciNo) {
  const id = String(ogrenciNo);
  const snap = await getDocs(query(collection(db, VELI_KOLEKSIYON), where("ogrenciId", "==", id)));
  await refleriBatchSil(snap.docs.map(d => d.ref));
  veliCacheTemizle();
}

// ── Devamsızlıklar ─────────────────────────────────────────────────────────

export async function devamsizliklarGetir(ogrenciNo) {
  const id = String(ogrenciNo);
  const kayitlar = await tumDevamsizliklariGetir();
  return kayitlar
    .filter(k => String(k.ogrenciId) === id)
    .sort((a, b) => compareTarihDesc(a.tarih, b.tarih));
}

export async function devamsizlikEkle(ogrenciNo, veri) {
  const ref = await addDoc(collection(db, "devamsizliklar"), {
    ogrenciId: String(ogrenciNo),
    ...tarihliVeri(veri)
  });
  kayitCacheTemizle("devamsizliklar");
  return ref;
}

export async function devamsizlikSil(_ogrenciNo, kayitId) {
  await deleteDoc(doc(db, "devamsizliklar", String(kayitId)));
  kayitCacheTemizle("devamsizliklar");
}

export async function devamsizlikGuncelle(_ogrenciNo, kayitId, veri) {
  await updateDoc(doc(db, "devamsizliklar", String(kayitId)), tarihliVeri(veri));
  kayitCacheTemizle("devamsizliklar");
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
  const kayitlar = await tumKayitlariGetir("devamsizliklar");
  return kayitlar.sort((a, b) => compareTarihDesc(a.tarih, b.tarih));
}

// ── Davranışlar ─────────────────────────────────────────────────────────────

export async function davranislarGetir(ogrenciNo) {
  const id = String(ogrenciNo);
  const kayitlar = await tumDavranislariGetir();
  return kayitlar
    .filter(k => String(k.ogrenciId) === id)
    .sort((a, b) => compareTarihDesc(a.tarih, b.tarih));
}

export async function davranisEkle(ogrenciNo, veri) {
  const ref = await addDoc(collection(db, "davranislar"), {
    ogrenciId: String(ogrenciNo),
    ...tarihliVeri(veri)
  });
  kayitCacheTemizle("davranislar");
  return ref;
}

export async function davranisGuncelle(_ogrenciNo, kayitId, veri) {
  await updateDoc(doc(db, "davranislar", String(kayitId)), tarihliVeri(veri));
  kayitCacheTemizle("davranislar");
}

export async function davranisSil(_ogrenciNo, kayitId) {
  await deleteDoc(doc(db, "davranislar", String(kayitId)));
  kayitCacheTemizle("davranislar");
}

export async function tumDavranislariGetir() {
  const kayitlar = await tumKayitlariGetir("davranislar");
  return kayitlar.sort((a, b) => compareTarihDesc(a.tarih, b.tarih));
}

// ── Veli Görüşmeleri ───────────────────────────────────────────────────────

export async function gorusmeleriGetir(ogrenciNo) {
  const id = String(ogrenciNo);
  const kayitlar = await tumGorusmeleriGetir();
  return kayitlar
    .filter(k => String(k.ogrenciId) === id)
    .sort((a, b) => compareTarihDesc(a.tarih, b.tarih));
}

export async function gorusmeEkle(ogrenciNo, veri) {
  const ref = await addDoc(collection(db, "veligorusmeleri"), {
    ogrenciId: String(ogrenciNo),
    ...tarihliVeri(veri)
  });
  kayitCacheTemizle("veligorusmeleri");
  return ref;
}

export async function gorusmeSil(_ogrenciNo, kayitId) {
  await deleteDoc(doc(db, "veligorusmeleri", String(kayitId)));
  kayitCacheTemizle("veligorusmeleri");
}

export async function gorusmeGuncelle(_ogrenciNo, kayitId, veri) {
  await updateDoc(doc(db, "veligorusmeleri", String(kayitId)), tarihliVeri(veri));
  kayitCacheTemizle("veligorusmeleri");
}

export async function tumGorusmeleriGetir() {
  const kayitlar = await tumKayitlariGetir("veligorusmeleri");
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
