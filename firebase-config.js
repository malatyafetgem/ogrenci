import {
  getAuth,
  getFirestore,
  initializeApp,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager
} from "./firebase-imports.js?v=20260604-90";

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

let firestoreDb;
try {
  firestoreDb = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  });
} catch (_) {
  firestoreDb = getFirestore(app);
}

export const db = firestoreDb;
