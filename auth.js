(function () {
"use strict";
const OBS = window.OBS = window.OBS || {};
const { auth, signInWithEmailAndPassword, signOut, onAuthStateChanged, toast } = OBS;

const adminClaimUids = new Set();

/**
 * Oturum gerektiren sayfalarda çağrılır.
 * Giriş yoksa login sayfasına yönlendirir.
 */
function requireAuth(callback) {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "index.html";
    } else {
      await adminClaiminiHazirla(user);
      document.body.classList.toggle("admin-user", isAdminUser(user));
      if (callback) callback(user);
      applyAdminVisibility(document);
    }
  });
}

function isAdminUser(user = getCurrentUser()) {
  if (!user) return false;
  return adminClaimUids.has(user.uid);
}

async function adminClaiminiHazirla(user) {
  if (!user) return;
  try {
    const token = await user.getIdTokenResult();
    if (token?.claims?.admin === true) {
      adminClaimUids.add(user.uid);
    } else {
      adminClaimUids.delete(user.uid);
    }
  } catch {
    // Token okunamazsa kullanıcı admin sayılmaz; server-side rules yine belirleyicidir.
    adminClaimUids.delete(user.uid);
  }
}

function requireAdmin(callback) {
  requireAuth((user) => {
    if (!isAdminUser(user)) {
      document.body.innerHTML = `
        <main class="container py-5">
          <div class="alert alert-warning shadow-sm">
            <h5 class="alert-heading">Admin yetkisi gerekli</h5>
            <p class="mb-3">Bu sayfa yalnızca admin yetkisi tanımlanmış kullanıcılar içindir.</p>
            <a href="dashboard.html" class="btn btn-primary btn-sm">Ana sayfaya dön</a>
          </div>
        </main>`;
      return;
    }
    if (callback) callback(user);
  });
}

function applyAdminVisibility(root = document) {
  if (isAdminUser()) return;
  root.querySelectorAll("[data-admin-only]").forEach(el => el.classList.add("d-none"));
}

function adminActionAllowed() {
  if (isAdminUser()) return true;
  toast("Bu işlem sadece Admin yetkisiyle yapılabilir.", "warning");
  return false;
}

/**
 * Login sayfasında çağrılır.
 * Zaten giriş yapılmışsa dashboard'a yönlendirir.
 */
function redirectIfLoggedIn() {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      window.location.href = "dashboard.html";
    }
  });
}

/**
 * E-posta ve şifre ile giriş yap.
 */
async function login(email, password) {
  try {
    return await signInWithEmailAndPassword(auth, email, password);
  } catch (err) {
    // file:// gibi ortamlarda kalıcı depolama desteklenmezse oturum sekme belleğine (sessionStorage) alınır.
    if (err?.code !== "auth/operation-not-supported-in-this-environment") throw err;
    await auth.setPersistence(firebase.auth.Auth.Persistence.SESSION);
    return signInWithEmailAndPassword(auth, email, password);
  }
}

/**
 * Çıkış yap ve login sayfasına yönlendir.
 */
async function logout() {
  await signOut(auth);
  adminClaimUids.clear();
  temizleYerelOturumCache();
  window.location.href = "index.html";
}

function temizleYerelOturumCache() {
  [localStorage, sessionStorage].forEach(storage => {
    try {
      Object.keys(storage)
        .filter(key => key.startsWith("obs-"))
        .forEach(key => storage.removeItem(key));
    } catch {
      // Tarayıcı depolaması kapalıysa çıkış akışı yine devam eder.
    }
  });
}

/**
 * Aktif kullanıcıyı döndürür.
 */
function getCurrentUser() {
  return auth.currentUser;
}

Object.assign(OBS, { requireAuth, isAdminUser, requireAdmin, applyAdminVisibility, adminActionAllowed, redirectIfLoggedIn, login, logout, getCurrentUser });
})();
