// sw.js — Öğrenci Bilgileri Service Worker
const CACHE_VERSION = "obs-cache-v1.0.36";
const CACHE_NAME = CACHE_VERSION;

const SHELL_URLS = [
  "./",
  "./index.html",
  "./dashboard.html",
  "./students-list.html",
  "./students-detail.html",
  "./students-add-edit.html",
  "./attendance-entry.html",
  "./attendance-report.html",
  "./behavior-entry.html",
  "./behavior-report.html",
  "./meetings-entry.html",
  "./meetings-list.html",
  "./phone-list.html",
  "./parents-list.html",
  "./class-promotion.html",
  "./settings.html",
  "./excel-export.html",

  "./app.css",
  "./layout.js",
  "./auth.js",
  "./students.js",
  "./utils.js",
  "./school-settings.js",
  "./autocomplete.js",
  "./avatar.js",
  "./version.js",
  "./file-redirect.js",
  "./firebase-config.js",

  "./pwa.js",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon-180.png",
  "./favicon-32.png",
  "./favicon-16.png",
  "./favicon.ico"
];

const BYPASS_HOSTS = [
  "firestore.googleapis.com",
  "identitytoolkit.googleapis.com",
  "securetoken.googleapis.com",
  "firebase.googleapis.com",
  "firebaseapp.com",
  "firebaseio.com",
  "googleapis.com",
  "gstatic.com"
];

const CDN_HOSTS = [
  "cdn.jsdelivr.net",
  "cdn.datatables.net"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.allSettled(SHELL_URLS.map(url => cache.add(url)))
    )
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", event => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", event => {
  const req = event.request;

  if (req.method !== "GET") return;

  const url = new URL(req.url);

  if (BYPASS_HOSTS.some(host => url.hostname.includes(host))) {
    return;
  }

  if (CDN_HOSTS.some(host => url.hostname.includes(host))) {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache =>
        cache.match(req).then(cached => {
          const fetchPromise = fetch(req)
            .then(res => {
              if (res && res.status === 200) {
                cache.put(req, res.clone());
              }
              return res;
            })
            .catch(() => cached);

          return cached || fetchPromise;
        })
      )
    );
    return;
  }

  event.respondWith(
    Promise.race([
      fetch(req).then(res => {
        if (res && res.status === 200 && res.type !== "opaque") {
          caches.open(CACHE_NAME).then(cache => cache.put(req, res.clone()));
        }
        return res;
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 3000)
      )
    ]).catch(() =>
      caches.match(req).then(cached => {
        if (cached) return cached;

        const accept = req.headers.get("accept") || "";
        if (accept.includes("text/html")) {
          return caches.match("./index.html");
        }

        return undefined;
      })
    )
  );
});
