/**
 * students.js — Öğrenci Firestore CRUD işlemleri
 */
import { db } from "./firebase-config.js?v=20260608-101";
import {
  collection, doc, getDoc, getDocs, addDoc, setDoc,
  updateDoc, deleteDoc, deleteField, query, where, writeBatch
} from "./firebase-imports.js?v=20260608-101";
import {
  bugun, compareOgrenci, compareSinif, compareTarihDesc,
  devamsizlikGunDegeri, devamsizlikKapsananTarihler,
  formatTarih, sayiEtiketiTR, tarihSiralamaAnahtari
} from "./utils.js?v=20260608-101";

const KOLEKSIYON = "students";
const VELI_KOLEKSIYON = "veliler";
const KAYIT_KOLEKSIYONLARI = ["devamsizliklar", "davranislar", "veligorusmeleri"];
const VERI_CACHE_PREFIX = "obs-data-cache-v1:";
const OGRENCI_CACHE_TTL = 3 * 60 * 1000;
const KAYIT_CACHE_TTL = 2 * 60 * 1000;
const TEMIZLENECEK_EKRAN_CACHE_PREFIXLERI = ["obs-dashboard-cache-"];
const MAX_ATOMIK_YAZMA = 450;
export const OGRENCI_DURUMLARI = ["Aktif", "Mezun"];
const VELI_DURUMLARI = ["Aktif", "Vefat", "Ulaşılamıyor", "Velayeti Yok", "Aranmasın"];
let ogrenciCachePromise = null;
let veliCachePromise = null;
const kayitCachePromises = new Map();
const arkaPlanYenilemeleri = new Map();
const yerelCacheUyarilari = new Set();

function ogrenciCacheTemizle() {
  ogrenciCachePromise = null;
}

function veliCacheTemizle() {
  veliCachePromise = null;
  yerelCacheSil(VELI_KOLEKSIYON);
  ekranCacheleriniTemizle();
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
      .filter(key => key.startsWith(VERI_CACHE_PREFIX))
      .forEach(key => sessionStorage.removeItem(key));
  } catch (err) {
    yerelCacheHatasiLogla("toplu temizleme", VERI_CACHE_PREFIX, err);
  }
  ekranCacheleriniTemizle();
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
      .then(snap => snap.docs.map(d => ogrenciBelgesiniNormalizeEt({ id: d.id, ...d.data() })))
}

export function ogrenciDurumunuNormalizeEt(durum) {
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

export function ogrenciAktifMi(ogrenci) {
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
    durum: veliDurumunuNormalizeEt(ilkDolu(veri.durum, eski.durum, "Aktif")),
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

function veliDurumunuNormalizeEt(durum) {
  const deger = String(durum || "").trim();
  if (!deger) return "Aktif";
  return VELI_DURUMLARI.includes(deger) ? deger : "Aranmasın";
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

function devamsizlikTemelAlaniDegisti(veri) {
  return ["tarih", "miktar", "gun_degeri"].some(alan => alan in veri);
}

function devamsizlikGuncellemeVerisi(mevcut, veri) {
  const guncelleme = tarihliVeri(veri);
  if (!devamsizlikTemelAlaniDegisti(guncelleme)) return guncelleme;

  const hesapKaydi = {
    ...mevcut,
    ...guncelleme
  };
  delete hesapKaydi.kapsanan_tarihler;
  delete hesapKaydi.tarih_bitis;

  const gunDegeri = devamsizlikGunDegeri(hesapKaydi);
  if (gunDegeri <= 0) return guncelleme;

  hesapKaydi.gun_degeri = gunDegeri;
  hesapKaydi.miktar = sayiEtiketiTR(gunDegeri);
  const kapsananTarihler = devamsizlikKapsananTarihler(hesapKaydi);

  return {
    ...guncelleme,
    gun_degeri: gunDegeri,
    miktar: sayiEtiketiTR(gunDegeri),
    kapsanan_tarihler: kapsananTarihler,
    tarih_bitis: kapsananTarihler.length > 1
      ? kapsananTarihler[kapsananTarihler.length - 1]
      : deleteField()
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
export async function tumOgrencileriDurumlariylaGetir() {
  const ogrenciler = await tumOgrenciBelgeleriGetir();
  return ogrenciler
    .map(ogrenciBelgesiniNormalizeEt)
    .sort(compareOgrenci);
}

/** Tüm aktif öğrencileri getir */
export async function tumOgrencileriGetir() {
  return (await tumOgrencileriDurumlariylaGetir())
    .filter(ogrenciAktifMi)
    .sort(compareOgrenci);
}

/** Tek öğrenci getir */
export async function ogrenciGetir(ogrenciNo) {
  const snap = await getDoc(doc(db, KOLEKSIYON, String(ogrenciNo)));
  if (!snap.exists()) return null;
  return ogrenciBelgesiniNormalizeEt({ id: snap.id, ...snap.data() });
}

/** Öğrenci numarası daha önce kullanılmış mı? */
export async function noMevcutMu(ogrenciNo) {
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
  return guncelVeri;
}

function atomikYazmaEkle(batch, apply, sayac) {
  if (sayac.deger >= MAX_ATOMIK_YAZMA) {
    throw new Error(`Tek işlemde güvenli yazma sınırı aşıldı (${MAX_ATOMIK_YAZMA}). İşlemi daha küçük parçalara bölün.`);
  }
  apply(batch);
  sayac.deger++;
}

/** Öğrenci ekle (belge ID = öğrenci numarası) */
export async function ogrenciEkle(ogrenciNo, veri) {
  await setDoc(doc(db, KOLEKSIYON, String(ogrenciNo)), ogrenciEklemeVerisi(veri));
  tumCacheleriTemizle();
}

/** Öğrenci güncelle */
export async function ogrenciGuncelle(ogrenciNo, veri) {
  const ref = doc(db, KOLEKSIYON, String(ogrenciNo));
  const eskiSnap = await getDoc(ref);
  const eski = eskiSnap.exists() ? eskiSnap.data() : {};
  await updateDoc(ref, ogrenciGuncellemeVerisi(veri, eski));
  tumCacheleriTemizle();
}

export async function ogrenciVeVelileriKaydet({
  ogrenciNo,
  duzenlemeId = "",
  ogrenciVeri = {},
  kaydedilecekVeliler = [],
  silinecekVeliler = []
} = {}) {
  const id = String(duzenlemeId || ogrenciNo || "");
  if (!id) throw new Error("Öğrenci numarası bulunamadı.");

  const batch = writeBatch(db);
  const sayac = { deger: 0 };
  const ogrRef = doc(db, KOLEKSIYON, id);

  if (duzenlemeId) {
    const eskiSnap = await getDoc(ogrRef);
    const eski = eskiSnap.exists() ? eskiSnap.data() : {};
    atomikYazmaEkle(batch, b => b.update(ogrRef, ogrenciGuncellemeVerisi(ogrenciVeri, eski)), sayac);
  } else {
    atomikYazmaEkle(batch, b => b.set(ogrRef, ogrenciEklemeVerisi(ogrenciVeri)), sayac);
  }

  for (const veliId of silinecekVeliler) {
    if (!veliId) continue;
    atomikYazmaEkle(batch, b => b.delete(doc(db, VELI_KOLEKSIYON, String(veliId))), sayac);
  }

  for (const item of kaydedilecekVeliler) {
    const veliId = item?.id ? String(item.id) : "";
    let eski = {};
    if (veliId) {
      const eskiSnap = await getDoc(doc(db, VELI_KOLEKSIYON, veliId));
      eski = eskiSnap.exists() ? eskiSnap.data() : {};
    }
    const { id: _id, ...kayit } = veliKaydiniNormalizeEt(id, { ...item.veri, ogrenciId: id }, eski);
    kayit.guncelleme_tarihi = bugun();
    if (!veliId) kayit.olusturma_tarihi = bugun();

    const veliRef = veliId
      ? doc(db, VELI_KOLEKSIYON, veliId)
      : doc(collection(db, VELI_KOLEKSIYON));
    if (veliId) {
      atomikYazmaEkle(batch, b => b.set(veliRef, kayit, { merge: true }), sayac);
    } else {
      atomikYazmaEkle(batch, b => b.set(veliRef, kayit), sayac);
    }
  }

  await batch.commit();
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
  const veliler = await ogrenciIdIleBelgeleriGetir(VELI_KOLEKSIYON, ogrenciNo);
  return veliler
    .map(veri => veliKaydiniNormalizeEt(ogrenciNo, veri))
    .sort(veliSiralama);
}

export async function tumVelileriGetir() {
  if (!veliCachePromise) {
    const cached = yerelCacheOku(VELI_KOLEKSIYON, KAYIT_CACHE_TTL);
    if (cached) {
      arkaPlandaYenile(VELI_KOLEKSIYON, tumVelileriFirestoredanGetir);
      return cached.map(veri => veliKaydiniNormalizeEt("", veri));
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
  await refleriBatchSil(await ogrenciIdIleRefleriGetir(VELI_KOLEKSIYON, ogrenciNo));
  veliCacheTemizle();
}

// ── Devamsızlıklar ─────────────────────────────────────────────────────────

export async function devamsizliklarGetir(ogrenciNo) {
  return kayitlariOgrenciyeGoreGetir("devamsizliklar", ogrenciNo);
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
  const ref = doc(db, "devamsizliklar", String(kayitId));
  const eskiSnap = await getDoc(ref);
  const mevcut = eskiSnap.exists() ? eskiSnap.data() : {};
  await updateDoc(ref, devamsizlikGuncellemeVerisi(mevcut, veri));
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

/**
 * Verilen sınıfa ait devamsızlık kayıtlarını getirir.
 * sinif boş verilirse tüm kayıtlar döner.
 *
 * Firestore Console'da performans için önerilen index:
 *   Koleksiyon: devamsizliklar | Alan: ogrenciId (ASC) | Alan: tarih_sira (DESC)
 *   https://console.firebase.google.com/project/_/firestore/indexes
 */
export async function sinifaGoreDevamsizliklariGetir(sinif) {
  if (!sinif) return tumDevamsizliklariGetir();
  const ogrenciler = await tumOgrencileriGetir();
  const sinifIdleri = ogrenciler
    .filter(o => o.sinif === sinif)
    .map(o => String(o.id));
  if (!sinifIdleri.length) return [];
  const kayitlar = await ogrenciIdlerineGoreKayitlariGetir("devamsizliklar", sinifIdleri);
  return kayitlar.sort((a, b) => compareTarihDesc(a.tarih, b.tarih));
}

// ── Davranışlar ─────────────────────────────────────────────────────────────

export async function davranislarGetir(ogrenciNo) {
  return kayitlariOgrenciyeGoreGetir("davranislar", ogrenciNo);
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

/**
 * Verilen sınıfa ait davranış kayıtlarını getirir.
 * sinif boş verilirse tüm kayıtlar döner.
 *
 * Firestore Console'da performans için önerilen index:
 *   Koleksiyon: davranislar | Alan: ogrenciId (ASC) | Alan: tarih_sira (DESC)
 *   https://console.firebase.google.com/project/_/firestore/indexes
 */
export async function sinifaGoreDavranislariGetir(sinif) {
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

export async function gorusmeleriGetir(ogrenciNo) {
  return kayitlariOgrenciyeGoreGetir("veligorusmeleri", ogrenciNo);
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

/**
 * Verilen sınıfa ait veli görüşmesi kayıtlarını getirir.
 * sinif boş verilirse tüm kayıtlar döner.
 *
 * Firestore Console'da performans için önerilen index:
 *   Koleksiyon: veligorusmeleri | Alan: ogrenciId (ASC) | Alan: tarih_sira (DESC)
 *   https://console.firebase.google.com/project/_/firestore/indexes
 */
export async function sinifaGoreGorusmeleriGetir(sinif) {
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

export async function siniflarGetir() {
  const set = new Set();
  const ogrenciler = await tumOgrenciBelgeleriGetir();
  ogrenciler.forEach(veri => {
    if (ogrenciAktifMi(veri) && veri.sinif) set.add(veri.sinif);
  });
  return [...set].sort(compareSinif);
}

export async function tumSiniflariGetir() {
  const set = new Set();
  const ogrenciler = await tumOgrencileriDurumlariylaGetir();
  ogrenciler.forEach(veri => {
    if (veri.sinif) set.add(veri.sinif);
  });
  return [...set].sort(compareSinif);
}
