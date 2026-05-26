/**
 * students.js — Öğrenci Firestore CRUD işlemleri
 */
import { db, storage } from "./firebase-config.js";
import {
  collection, doc, getDoc, getDocs, addDoc, setDoc,
  updateDoc, deleteDoc, query, where, orderBy
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  ref, uploadBytes, getDownloadURL, deleteObject
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

const KOLEKSIYON = "students";

/** Tüm aktif öğrencileri getir */
export async function tumOgrencileriGetir() {
  const q = query(collection(db, KOLEKSIYON), where("durum", "==", "Aktif"), orderBy("soyad"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
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
    olusturma_tarihi: new Date().toISOString()
  });
}

/** Öğrenci güncelle */
export async function ogrenciGuncelle(ogrenciNo, veri) {
  await updateDoc(doc(db, KOLEKSIYON, String(ogrenciNo)), {
    ...veri,
    guncelleme_tarihi: new Date().toISOString()
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
    mezuniyet_tarihi: new Date().toISOString()
  });
  // students'ta durumu güncelle
  await updateDoc(doc(db, KOLEKSIYON, id), { durum: "Mezun" });
}

/** Fotoğraf yükle, URL döndür */
export async function fotografYukle(ogrenciNo, dosya) {
  const storageRef = ref(storage, `ogrenciler/${ogrenciNo}/profil_${Date.now()}`);
  await uploadBytes(storageRef, dosya);
  return getDownloadURL(storageRef);
}

/** Fotoğraf sil */
export async function fotografSil(url) {
  try {
    const storageRef = ref(storage, url);
    await deleteObject(storageRef);
  } catch (_) { /* Dosya yoksa sessizce geç */ }
}

// ── Alt koleksiyon: Veliler ──────────────────────────────────────────────────

export async function velileriGetir(ogrenciNo) {
  const snap = await getDocs(collection(db, KOLEKSIYON, String(ogrenciNo), "veliler"));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
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
  const snap = await getDocs(
    query(collection(db, KOLEKSIYON, String(ogrenciNo), "devamsizliklar"), orderBy("tarih", "desc"))
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function devamsizlikEkle(ogrenciNo, veri) {
  return addDoc(collection(db, KOLEKSIYON, String(ogrenciNo), "devamsizliklar"), veri);
}

export async function devamsizlikSil(ogrenciNo, kayitId) {
  await deleteDoc(doc(db, KOLEKSIYON, String(ogrenciNo), "devamsizliklar", kayitId));
}

/** Özürlü ve özürsüz toplamları hesapla */
export function devamsizlikHesapla(kayitlar) {
  let ozurlu = 0, ozursuz = 0;
  for (const k of kayitlar) {
    if (k.tur === "Özürlü") ozurlu += k.gun_degeri || 0;
    else ozursuz += k.gun_degeri || 0;
  }
  return { ozurlu, ozursuz };
}

// ── Alt koleksiyon: Davranışlar ─────────────────────────────────────────────

export async function davranislarGetir(ogrenciNo) {
  const snap = await getDocs(
    query(collection(db, KOLEKSIYON, String(ogrenciNo), "davranislar"), orderBy("tarih", "desc"))
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function davranisEkle(ogrenciNo, veri) {
  return addDoc(collection(db, KOLEKSIYON, String(ogrenciNo), "davranislar"), veri);
}

export async function davranisGuncelle(ogrenciNo, kayitId, veri) {
  await updateDoc(doc(db, KOLEKSIYON, String(ogrenciNo), "davranislar", kayitId), veri);
}

export async function davranisSil(ogrenciNo, kayitId) {
  await deleteDoc(doc(db, KOLEKSIYON, String(ogrenciNo), "davranislar", kayitId));
}

// ── Alt koleksiyon: Veli Görüşmeleri ────────────────────────────────────────

export async function gorusmeleriGetir(ogrenciNo) {
  const snap = await getDocs(
    query(collection(db, KOLEKSIYON, String(ogrenciNo), "veligorusmeleri"), orderBy("tarih", "desc"))
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function gorusmeEkle(ogrenciNo, veri) {
  return addDoc(collection(db, KOLEKSIYON, String(ogrenciNo), "veligorusmeleri"), veri);
}

export async function gorusmeSil(ogrenciNo, kayitId) {
  await deleteDoc(doc(db, KOLEKSIYON, String(ogrenciNo), "veligorusmeleri", kayitId));
}

// ── Yardımcı: Dinamik sınıf listesi ─────────────────────────────────────────

export async function siniflarGetir() {
  const snap = await getDocs(query(collection(db, KOLEKSIYON), where("durum", "==", "Aktif")));
  const set = new Set();
  snap.forEach(d => { if (d.data().sinif) set.add(d.data().sinif); });
  return [...set].sort();
}
