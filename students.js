/**
 * students.js — Öğrenci Firestore CRUD işlemleri
 */
import { db } from "./firebase-config.js";
import {
  collection, doc, getDoc, getDocs, addDoc, setDoc,
  updateDoc, deleteDoc, collectionGroup
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { bugun, compareOgrenci, compareSinif, compareTarihDesc, formatTarih, tarihSiralamaAnahtari } from "./utils.js";

const KOLEKSIYON = "students";

function altKayit(d) {
  return {
    id: d.id,
    ogrenciId: d.ref.parent.parent?.id || "",
    ...d.data()
  };
}

async function tumAltKayitlariGetir(altKoleksiyon) {
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
  const snap = await getDocs(collection(db, KOLEKSIYON));
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
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
}

/** Öğrenci güncelle */
export async function ogrenciGuncelle(ogrenciNo, veri) {
  await updateDoc(doc(db, KOLEKSIYON, String(ogrenciNo)), {
    ...veri,
    guncelleme_tarihi: bugun()
  });
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
}

// ── Alt koleksiyon: Devamsızlıklar ──────────────────────────────────────────

export async function devamsizliklarGetir(ogrenciNo) {
  const snap = await getDocs(collection(db, KOLEKSIYON, String(ogrenciNo), "devamsizliklar"));
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => compareTarihDesc(a.tarih, b.tarih));
}

export async function devamsizlikEkle(ogrenciNo, veri) {
  return addDoc(collection(db, KOLEKSIYON, String(ogrenciNo), "devamsizliklar"), tarihliVeri(veri));
}

export async function devamsizlikSil(ogrenciNo, kayitId) {
  await deleteDoc(doc(db, KOLEKSIYON, String(ogrenciNo), "devamsizliklar", kayitId));
}

/** Özürlü ve özürsüz toplamları hesapla */
export function devamsizlikHesapla(kayitlar) {
  let ozurlu = 0, ozursuz = 0;
  for (const k of kayitlar) {
    const gun = Number(k.gun_degeri) || 0;
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
  return addDoc(collection(db, KOLEKSIYON, String(ogrenciNo), "davranislar"), tarihliVeri(veri));
}

export async function davranisGuncelle(ogrenciNo, kayitId, veri) {
  await updateDoc(doc(db, KOLEKSIYON, String(ogrenciNo), "davranislar", kayitId), veri);
}

export async function davranisSil(ogrenciNo, kayitId) {
  await deleteDoc(doc(db, KOLEKSIYON, String(ogrenciNo), "davranislar", kayitId));
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
  return addDoc(collection(db, KOLEKSIYON, String(ogrenciNo), "veligorusmeleri"), tarihliVeri(veri));
}

export async function gorusmeSil(ogrenciNo, kayitId) {
  await deleteDoc(doc(db, KOLEKSIYON, String(ogrenciNo), "veligorusmeleri", kayitId));
}

export async function tumGorusmeleriGetir() {
  const kayitlar = await tumAltKayitlariGetir("veligorusmeleri");
  return kayitlar.sort((a, b) => compareTarihDesc(a.tarih, b.tarih));
}

// ── Yardımcı: Dinamik sınıf listesi ─────────────────────────────────────────

export async function siniflarGetir() {
  const snap = await getDocs(collection(db, KOLEKSIYON));
  const set = new Set();
  snap.forEach(d => {
    const veri = d.data();
    if ((veri.durum || "Aktif") === "Aktif" && veri.sinif) set.add(veri.sinif);
  });
  return [...set].sort(compareSinif);
}
