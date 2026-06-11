import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const firebaseConfig = JSON.parse(readFileSync("./firebase.json", "utf8"));

test("firebase.json Firestore rules ve Hosting kök dağıtım ayarını içerir", () => {
  assert.equal(firebaseConfig.firestore?.rules, "firestore.rules");
  assert.equal(firebaseConfig.hosting?.public, ".");

  const ignore = firebaseConfig.hosting?.ignore || [];
  for (const entry of [
    "firebase.json",
    ".firebaserc",
    "firestore.rules",
    "package.json",
    "*.test.mjs",
    "bump-version.mjs",
    "check-encoding.mjs",
    "ogrenci-bilgileri-baslat.cmd",
    "surumu-guncelle.cmd"
  ]) {
    assert.ok(ignore.includes(entry), `${entry} Hosting dağıtımından hariç tutulmalı`);
  }
});

test("firebase.json güvenlik headerlarını ve gerekli CDN kaynaklarını sınırlar", () => {
  const headers = firebaseConfig.hosting?.headers?.[0]?.headers || [];
  const byKey = Object.fromEntries(headers.map(header => [header.key, header.value]));
  const csp = byKey["Content-Security-Policy"] || "";

  assert.ok(csp.includes("default-src 'self'"));
  assert.ok(csp.includes("https://cdn.jsdelivr.net"));
  assert.ok(csp.includes("https://cdn.datatables.net"));
  assert.ok(csp.includes("https://www.gstatic.com"));
  assert.ok(csp.includes("https://fonts.googleapis.com"));
  assert.ok(csp.includes("https://fonts.gstatic.com"));
  assert.ok(csp.includes("https://*.googleapis.com"));
  assert.ok(csp.includes("object-src 'none'"));
  assert.ok(csp.includes("frame-ancestors 'none'"));

  assert.equal(byKey["X-Content-Type-Options"], "nosniff");
  assert.equal(byKey["Referrer-Policy"], "strict-origin-when-cross-origin");
  assert.ok(byKey["Permissions-Policy"]?.includes("camera=()"));
});

test("Firestore yerel Chrome bağlantıları için long polling otomatik algılama kullanır", () => {
  const config = readFileSync("firebase-config.js", "utf8");

  assert.match(config, /initializeFirestore\(app,\s*\{/);
  assert.match(config, /experimentalAutoDetectLongPolling:\s*true/);
  assert.match(config, /localCache:\s*memoryLocalCache\(\)/);
});
