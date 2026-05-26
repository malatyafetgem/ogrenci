import { auth } from "./firebase-config.js";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

/**
 * Oturum gerektiren sayfalarda çağrılır.
 * Giriş yoksa login sayfasına yönlendirir.
 */
export function requireAuth(callback) {
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.href = "index.html";
    } else {
      if (callback) callback(user);
    }
  });
}

/**
 * Login sayfasında çağrılır.
 * Zaten giriş yapılmışsa dashboard'a yönlendirir.
 */
export function redirectIfLoggedIn() {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      window.location.href = "dashboard.html";
    }
  });
}

/**
 * E-posta ve şifre ile giriş yap.
 */
export async function login(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

/**
 * Çıkış yap ve login sayfasına yönlendir.
 */
export async function logout() {
  await signOut(auth);
  window.location.href = "index.html";
}

/**
 * Aktif kullanıcıyı döndürür.
 */
export function getCurrentUser() {
  return auth.currentUser;
}
