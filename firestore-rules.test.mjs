import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const rules = readFileSync("firestore.rules", "utf8");

function matchBlock(collectionName) {
  const escaped = collectionName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = rules.match(new RegExp(`match /${escaped}/\\{[^}]+\\} \\{[\\s\\S]*?\\n    \\}`));
  return match?.[0] || "";
}

test("Kayıt ekleme koleksiyonları giriş yapmış kullanıcıya create izni verir", () => {
  const expectations = [
    ["devamsizliklar", "validAttendance"],
    ["davranislar", "validBehavior"],
    ["veligorusmeleri", "validMeeting"]
  ];

  for (const [collectionName, validator] of expectations) {
    const block = matchBlock(collectionName);
    assert.match(block, new RegExp(`allow create: if signedIn\\(\\) && ${validator}\\(\\);`), `${collectionName} create signed-in olmalı`);
    assert.match(block, new RegExp(`allow update: if isAdmin\\(\\) && ${validator}\\(\\);`), `${collectionName} update admin kalmalı`);
    assert.match(block, /allow delete: if isAdmin\(\);/, `${collectionName} delete admin kalmalı`);
    assert.doesNotMatch(block, /allow create, update: if isAdmin/, `${collectionName} create/update birleşik admin kuralı kalmamalı`);
  }
});

test("Ortak otomatik tamamlama giriş yapmış kullanıcı tarafından güncellenebilir", () => {
  const block = matchBlock("_autocomplete");
  assert.match(block, /allow read: if canReadPersonalData\(\);/);
  assert.match(block, /allow create, update: if signedIn\(\) && validAutocomplete\(\);/);
  assert.match(block, /allow delete: if isAdmin\(\);/);
});

test("Ana veri ve sistem yönetimi yazma izinleri admin kalır", () => {
  assert.match(matchBlock("students"), /allow create, update: if isAdmin\(\) && validStudent\(ogrenciNo\);/);
  assert.match(matchBlock("veliler"), /allow create, update: if isAdmin\(\) && validVeli\(\);/);
  assert.match(matchBlock("_settings"), /allow create, update: if isAdmin\(\) && validSettings\(\);/);
});
