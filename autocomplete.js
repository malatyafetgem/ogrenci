(function () {
"use strict";
const OBS = window.OBS = window.OBS || {};
const { db, doc, getDoc, setDoc } = OBS;
/**
 * autocomplete.js — Firestore'daki _autocomplete koleksiyonunu okur/yazar.
 */

// Bellek içi önbellek (aynı oturumda tekrar Firestore'a gitmesin)
const onbellek = {};

/**
 * Bir autocomplete listesi çeker. Bulunamazsa boş dizi döner.
 */
async function autocompleteYukle(alan) {
  if (onbellek[alan]) return onbellek[alan];
  try {
    const snap = await getDoc(doc(db, "_autocomplete", alan));
    const degerler = snap.exists() ? (snap.data().degerler || []) : [];
    onbellek[alan] = degerler;
    return degerler;
  } catch (_) {
    return [];
  }
}

/**
 * Yeni bir değer ekler (tekrar etmiyorsa). Firestore'u günceller.
 */
async function autocompleteGuncelle(alan, yeniDeger) {
  if (!yeniDeger || !yeniDeger.trim()) return;
  const temiz = yeniDeger.trim();
  const mevcut = await autocompleteYukle(alan);
  if (mevcut.some(d => d.toLowerCase() === temiz.toLowerCase())) return; // Zaten var
  const guncel = [...mevcut, temiz].sort();
  onbellek[alan] = guncel;
  try {
    await setDoc(doc(db, "_autocomplete", alan), { degerler: guncel }, { merge: false });
  } catch (e) {
    console.warn("Autocomplete güncellenemedi:", alan, e);
  }
}

Object.assign(OBS, { autocompleteYukle, autocompleteGuncelle });
})();
