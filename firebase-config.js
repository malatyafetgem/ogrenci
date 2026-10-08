/**
 * firebase-config.js — Firebase başlatma (compat SDK, klasik script).
 * Önce firebase-app-compat, firebase-auth-compat, firebase-firestore-compat ve firebase-imports.js yüklenmelidir.
 */
(function () {
"use strict";
const OBS = window.OBS = window.OBS || {};

const firebaseConfig = {
  apiKey: "AIzaSyCy1ny9QfkRnV3KcMRwBubPCOQyScLylQU",
  authDomain: "ogrenci-226bd.firebaseapp.com",
  projectId: "ogrenci-226bd",
  storageBucket: "ogrenci-226bd.firebasestorage.app",
  messagingSenderId: "377067365807",
  appId: "1:377067365807:web:f2835b593edd3850743b5a"
};

let auth = null;
let db = null;
let baslatmaHatasi = null;

try {
  const app = firebase.initializeApp(firebaseConfig);
  try {
    auth = firebase.auth(app);
  } catch (err) {
    console.error("Firebase Auth başlatılamadı:", err);
    baslatmaHatasi = baslatmaHatasi || ("Auth: " + (err.code || err.message));
  }
  try {
    db = firebase.firestore(app);
    try {
      // file:// altında WebChannel bağlantısı sorun çıkarırsa otomatik long-polling'e düşer.
      db.settings({ experimentalAutoDetectLongPolling: true, merge: true });
    } catch (_) {
      // Ayarlar daha önce uygulanmışsa varsayılanlarla devam edilir.
    }
  } catch (err) {
    console.error("Firestore başlatılamadı:", err);
    baslatmaHatasi = baslatmaHatasi || ("Firestore: " + (err.code || err.message));
  }
} catch (err) {
  console.error("Firebase başlatılamadı:", err);
  baslatmaHatasi = err.code || err.message;
}

Object.assign(OBS, { auth, db, baslatmaHatasi });
})();
