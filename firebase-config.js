import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyCy1ny9QfkRnV3KcMRwBubPCOQyScLylQU",
  authDomain: "ogrenci-226bd.firebaseapp.com",
  projectId: "ogrenci-226bd",
  storageBucket: "ogrenci-226bd.firebasestorage.app",
  messagingSenderId: "377067365807",
  appId: "1:377067365807:web:f2835b593edd3850743b5a"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
