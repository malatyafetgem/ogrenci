/**
 * firebase-imports.js — Firebase "compat" SDK üzerinde, modüler SDK'ya benzer ince bir katman.
 * Sayfalar file:// ile çift tıklanarak açılabilsin diye ES modülü yerine klasik script kullanılır.
 * Önce firebase-app-compat, firebase-auth-compat ve firebase-firestore-compat yüklenmelidir.
 */
(function () {
"use strict";
const OBS = window.OBS = window.OBS || {};

function snapSar(snap) {
  return {
    id: snap.id,
    ref: snap.ref,
    exists: () => snap.exists,
    data: () => snap.data()
  };
}

function doc(taban, ...parcalar) {
  // doc(db, "koleksiyon", "id") | doc(koleksiyonRef) | doc(koleksiyonRef, "id")
  if (typeof taban.collection === "function") {
    return taban.doc(parcalar.join("/"));
  }
  return parcalar.length ? taban.doc(parcalar.join("/")) : taban.doc();
}

function collection(db, yol) {
  return db.collection(yol);
}

async function getDoc(ref) {
  return snapSar(await ref.get());
}

function getDocs(sorgu) {
  return sorgu.get();
}

function setDoc(ref, veri, secenek) {
  return secenek ? ref.set(veri, secenek) : ref.set(veri);
}

function addDoc(koleksiyonRef, veri) {
  return koleksiyonRef.add(veri);
}

function updateDoc(ref, veri) {
  return ref.update(veri);
}

function deleteDoc(ref) {
  return ref.delete();
}

function deleteField() {
  return firebase.firestore.FieldValue.delete();
}

function where(alan, islem, deger) {
  return { tur: "where", alan, islem, deger };
}

function limit(adet) {
  return { tur: "limit", adet };
}

function query(koleksiyonRef, ...kosullar) {
  let q = koleksiyonRef;
  for (const k of kosullar) {
    if (k.tur === "where") q = q.where(k.alan, k.islem, k.deger);
    else if (k.tur === "limit") q = q.limit(k.adet);
  }
  return q;
}

function writeBatch(db) {
  return db.batch();
}

function onSnapshot(ref, ...args) {
  return ref.onSnapshot(...args);
}

// Auth
function signInWithEmailAndPassword(auth, eposta, sifre) {
  return auth.signInWithEmailAndPassword(eposta, sifre);
}

function signOut(auth) {
  return auth.signOut();
}

function onAuthStateChanged(auth, cb, hataCb) {
  return auth.onAuthStateChanged(cb, hataCb);
}

const EmailAuthProvider = {
  credential: (eposta, sifre) => firebase.auth.EmailAuthProvider.credential(eposta, sifre)
};

function reauthenticateWithCredential(kullanici, kimlik) {
  return kullanici.reauthenticateWithCredential(kimlik);
}

Object.assign(OBS, {
  doc, collection, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc, deleteField,
  where, limit, query, writeBatch, onSnapshot,
  signInWithEmailAndPassword, signOut, onAuthStateChanged,
  EmailAuthProvider, reauthenticateWithCredential
});
})();
