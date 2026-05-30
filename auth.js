import { auth } from "./firebase-config.js?v=20260530-32";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { toast } from "./utils.js?v=20260530-32";

// Sistemde yalnızca bu Firebase UID Admin kabul edilir.
const ADMIN_UIDS = ["zpaTsm2L7FSCqLA8BDkxI7bX9vM2"];

/**
 * Oturum gerektiren sayfalarda çağrılır.
 * Giriş yoksa login sayfasına yönlendirir.
 */
export function requireAuth(callback) {
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.href = "index.html";
    } else {
      document.body.classList.toggle("admin-user", isAdminUser(user));
      if (callback) callback(user);
      applyAdminVisibility(document);
    }
  });
}

export function isAdminUser(user = getCurrentUser()) {
  if (!user) return false;
  return ADMIN_UIDS.includes(user.uid);
}

export function requireAdmin(callback) {
  requireAuth((user) => {
    if (!isAdminUser(user)) {
      document.body.innerHTML = `
        <main class="container py-5">
          <div class="alert alert-warning shadow-sm">
            <h5 class="alert-heading">Admin yetkisi gerekli</h5>
            <p class="mb-3">Bu sayfa yalnızca Admin UID ile giriş yapan kullanıcılar içindir.</p>
            <a href="dashboard.html" class="btn btn-primary btn-sm">Ana sayfaya dön</a>
          </div>
        </main>`;
      return;
    }
    if (callback) callback(user);
  });
}

export function applyAdminVisibility(root = document) {
  if (isAdminUser()) return;
  root.querySelectorAll("[data-admin-only]").forEach(el => el.classList.add("d-none"));
}

export function adminActionAllowed() {
  if (isAdminUser()) return true;
  toast("Bu işlem sadece Admin yetkisiyle yapılabilir.", "warning");
  return false;
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
