/**
 * students.js — Öğrenci Firestore CRUD işlemleri
 */
import { db } from "./firebase-config.js?v=20260529-24";
import {
  collection, doc, getDoc, getDocs, addDoc, setDoc,
  updateDoc, deleteDoc, collectionGroup, query, where
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  bugun, compareOgrenci, compareSinif, compareTarihDesc,
  devamsizlikGunDegeri, formatTarih, tarihSiralamaAnahtari
} from "./utils.js?v=20260529-24";

const KOLEKSIYON = "students";
const VELI_KOLEKSIYON = "veliler";
const GLOBAL_KAYIT_KOLEKSIYONLARI = new Set(["devamsizliklar", "davranislar", "veligorusmeleri"]);
const VERI_CACHE_PREFIX = "obs-data-cache-v1:";
const OGRENCI_CACHE_TTL = 3 * 60 * 1000;
const ALT_CACHE_TTL = 2 * 60 * 1000;
const TEMIZLENECEK_EKRAN_CACHELERI = ["obs-dashboard-cache-v3"];
let ogrenciCachePromise = null;
let veliCachePromise = null;
const altCachePromises = new Map();
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
    __refPath: d.ref.path,
    __kaynak: "legacy",
    ...d.data()
  };
}

function globalKayit(d) {
  return {
    id: d.id,
    ogrenciId: d.data().ogrenciId || "",
    __refPath: d.ref.path,
    __kaynak: "global",
    ...d.data()
  };
}

function altKayitAnahtari(kayit, altKoleksiyon) {
  return `${kayit.ogrenciId || ""}/${altKoleksiyon}/${kayit.id || kayit.__refPath || ""}`;
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
  const kayitlar = new Map();
  async function globalKayitlariEkle() {
    if (!GLOBAL_KAYIT_KOLEKSIYONLARI.has(altKoleksiyon)) return;
    const snap = await getDocs(collection(db, altKoleksiyon));
    snap.docs.map(globalKayit)
      .filter(kayit => kayit.ogrenciId)
      .forEach(kayit => kayitlar.set(altKayitAnahtari(kayit, altKoleksiyon), kayit));
  }

  try {
    const snap = await getDocs(collectionGroup(db, altKoleksiyon));
    snap.docs.map(altKayit)
      .filter(kayit => kayit.ogrenciId)
      .forEach(kayit => kayitlar.set(altKayitAnahtari(kayit, altKoleksiyon), kayit));
    await globalKayitlariEkle();
    return [...kayitlar.values()];
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
    listeler.flat().forEach(kayit => kayitlar.set(altKayitAnahtari(kayit, altKoleksiyon), kayit));
    await globalKayitlariEkle();
    return [...kayitlar.values()];
  }
}

async function kaydiIkiYerdeGuncelle(globalRef, legacyRef, veri) {
  let guncellendi = false;
  try {
    await updateDoc(globalRef, veri);
    guncellendi = true;
  } catch (_) {}
  try {
    await updateDoc(legacyRef, veri);
    guncellendi = true;
  } catch (err) {
    if (!guncellendi) throw err;
  }
}

async function ogrenciGlobalKayitlariniSil(ogrenciNo) {
  const id = String(ogrenciNo);
  for (const koleksiyon of GLOBAL_KAYIT_KOLEKSIYONLARI) {
    const snap = await getDocs(query(collection(db, koleksiyon), where("ogrenciId", "==", id)));
    for (const d of snap.docs) await deleteDoc(d.ref);
  }
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
  const yakinlik = ilkDolu(veri.yakinlik, veri.tur, eski.yakinlik, eski.tur, "Diğer");
  const meslekGrubu = ilkDolu(veri.meslek_grubu, veri.alan, eski.meslek_grubu, eski.alan);
  const gorevUnvan = ilkDolu(veri.gorev_unvan, veri.gorev, eski.gorev_unvan, eski.gorev);
  const il = ilkDolu(veri.il, veri.sehir, eski.il, eski.sehir);
  const adres = ilkDolu(veri.adres, veri.ev_adresi, eski.adres, eski.ev_adresi);
  const olusturmaTarihi = ilkDolu(veri.olusturma_tarihi, eski.olusturma_tarihi, bugun());
  const guncellemeTarihi = ilkDolu(veri.guncelleme_tarihi, eski.guncelleme_tarihi, bugun());
  const birincilKaynak = veri.birincil ?? eski.birincil ?? false;
  const acilKaynak = veri.acil_kisi ?? eski.acil_kisi ?? false;

  return {
    ...(veri.id || eski.id ? { id: veri.id || eski.id } : {}),
    ogrenciId: String(ilkDolu(veri.ogrenciId, eski.ogrenciId, ogrenciNo)),
    yakinlik,
    tur: yakinlik,
    ad: ilkDolu(veri.ad, eski.ad),
    soyad: ilkDolu(veri.soyad, eski.soyad),
    durum: ilkDolu(veri.durum, eski.durum, "Aktif"),
    birincil: boolDeger(birincilKaynak),
    acil_kisi: boolDeger(acilKaynak),
    iletisim_sirasi: sayiDeger(ilkDolu(veri.iletisim_sirasi, eski.iletisim_sirasi), 0),
    telefon: ilkDolu(veri.telefon, eski.telefon),
    e_posta: ilkDolu(veri.e_posta, veri.eposta, eski.e_posta, eski.eposta),
    il,
    ilce: ilkDolu(veri.ilce, eski.ilce),
    adres,
    calisma_durumu: ilkDolu(veri.calisma_durumu, eski.calisma_durumu),
    meslek_grubu: meslekGrubu,
    meslek: ilkDolu(veri.meslek, eski.meslek),
    gorev_unvan: gorevUnvan,
    kurum: ilkDolu(veri.kurum, veri.is_yeri, eski.kurum, eski.is_yeri),
    notlar: ilkDolu(veri.notlar, eski.notlar),
    olusturma_tarihi: olusturmaTarihi,
    guncelleme_tarihi: guncellemeTarihi,
    alan: meslekGrubu,
    gorev: gorevUnvan,
    sehir: il,
    ev_adresi: adres
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

/** Öğrenci sil (tüm alt koleksiyonlarla — güvenli silme) */
export async function ogrenciSil(ogrenciNo) {
  const id = String(ogrenciNo);
  const altKoleksiyonlar = ["veliler", "devamsizliklar", "davranislar", "veligorusmeleri"];
  await ogrenciVelileriniSil(id);
  await ogrenciGlobalKayitlariniSil(id);
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
  const mezunRef = doc(db, "graduates", id);
  const mevcutMezun = await getDoc(mezunRef);
  const kayit = {
    ...mezunVerisi,
    guncelleme_tarihi: bugun(),
    mezuniyet_tarihi: bugun()
  };
  if (!mevcutMezun.exists()) kayit.olusturma_tarihi = bugun();
  await setDoc(mezunRef, kayit, { merge: true });
  // students'ta durumu güncelle
  await updateDoc(doc(db, KOLEKSIYON, id), { durum: "Mezun" });
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
    const cached = yerelCacheOku(VELI_KOLEKSIYON, ALT_CACHE_TTL);
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
  for (const d of snap.docs) await deleteDoc(d.ref);
  veliCacheTemizle();
}

// ── Alt koleksiyon: Devamsızlıklar ──────────────────────────────────────────

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
  altCacheTemizle("devamsizliklar");
  return ref;
}

export async function devamsizlikSil(ogrenciNo, kayitId) {
  await deleteDoc(doc(db, "devamsizliklar", String(kayitId)));
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
  altCacheTemizle("davranislar");
  return ref;
}

export async function davranisGuncelle(ogrenciNo, kayitId, veri) {
  await kaydiIkiYerdeGuncelle(
    doc(db, "davranislar", String(kayitId)),
    doc(db, KOLEKSIYON, String(ogrenciNo), "davranislar", kayitId),
    veri
  );
  altCacheTemizle("davranislar");
}

export async function davranisSil(ogrenciNo, kayitId) {
  await deleteDoc(doc(db, "davranislar", String(kayitId)));
  await deleteDoc(doc(db, KOLEKSIYON, String(ogrenciNo), "davranislar", kayitId));
  altCacheTemizle("davranislar");
}

export async function tumDavranislariGetir() {
  const kayitlar = await tumAltKayitlariGetir("davranislar");
  return kayitlar.sort((a, b) => compareTarihDesc(a.tarih, b.tarih));
}

// ── Alt koleksiyon: Veli Görüşmeleri ────────────────────────────────────────

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
  altCacheTemizle("veligorusmeleri");
  return ref;
}

export async function gorusmeSil(ogrenciNo, kayitId) {
  await deleteDoc(doc(db, "veligorusmeleri", String(kayitId)));
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
