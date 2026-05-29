/**
 * autocomplete.js — Firestore'daki _autocomplete koleksiyonunu okur/yazar.
 */
import { db } from "./firebase-config.js?v=20260529-24";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Bellek içi önbellek (aynı oturumda tekrar Firestore'a gitmesin)
const onbellek = {};

/**
 * Bir autocomplete listesi çeker. Bulunamazsa boş dizi döner.
 */
export async function autocompleteYukle(alan) {
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
export async function autocompleteGuncelle(alan, yeniDeger) {
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

/**
 * Türkiye il listesini döndürür (sabit, Firestore'dan bağımsız fallback).
 */
export function illerListesi() {
  return [
    "Adana","Adıyaman","Afyonkarahisar","Ağrı","Aksaray","Amasya","Ankara","Antalya",
    "Ardahan","Artvin","Aydın","Balıkesir","Bartın","Batman","Bayburt","Bilecik",
    "Bingöl","Bitlis","Bolu","Burdur","Bursa","Çanakkale","Çankırı","Çorum",
    "Denizli","Diyarbakır","Düzce","Edirne","Elazığ","Erzincan","Erzurum","Eskişehir",
    "Gaziantep","Giresun","Gümüşhane","Hakkari","Hatay","Iğdır","Isparta","İstanbul",
    "İzmir","Kahramanmaraş","Karabük","Karaman","Kars","Kastamonu","Kayseri","Kilis",
    "Kırıkkale","Kırklareli","Kırşehir","Kocaeli","Konya","Kütahya","Malatya","Manisa",
    "Mardin","Mersin","Muğla","Muş","Nevşehir","Niğde","Ordu","Osmaniye","Rize",
    "Sakarya","Samsun","Şanlıurfa","Siirt","Sinop","Şırnak","Sivas","Tekirdağ",
    "Tokat","Trabzon","Tunceli","Uşak","Van","Yalova","Yozgat","Zonguldak"
  ];
}
