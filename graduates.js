/**
 * graduates.js — Mezun Firestore CRUD işlemleri
 */
import { db } from "./firebase-config.js?v=20260527-18";
import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { bugun } from "./utils.js?v=20260527-18";

const KOLEKSIYON = "graduates";

export async function tumMezunlarGetir() {
  const snap = await getDocs(query(collection(db, KOLEKSIYON), orderBy("soyad")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function mezunGetir(id) {
  const snap = await getDoc(doc(db, KOLEKSIYON, String(id)));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function mezunGuncelle(id, veri) {
  await updateDoc(doc(db, KOLEKSIYON, String(id)), {
    ...veri,
    guncelleme_tarihi: bugun()
  });
}

export async function mezunYillariGetir() {
  const snap = await getDocs(collection(db, KOLEKSIYON));
  const yillar = new Set();
  snap.forEach(d => { if (d.data().mezuniyet_yili) yillar.add(d.data().mezuniyet_yili); });
  return [...yillar].sort((a, b) => b - a);
}
