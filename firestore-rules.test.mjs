import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const rules = readFileSync("firestore.rules", "utf8");

function matchBlock(collectionName) {
  const escaped = collectionName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = rules.match(new RegExp(`match /${escaped}/\\{[^}]+\\} \\{[\\s\\S]*?\\n    \\}`));
  return match?.[0] || "";
}

test("Kişisel veri koleksiyonları giriş yapmış kullanıcı tarafından okunabilir", () => {
  const readableCollections = [
    "students",
    "veliler",
    "devamsizliklar",
    "davranislar",
    "veligorusmeleri",
    "_autocomplete",
    "_settings"
  ];

  assert.match(rules, /function\s+canReadPersonalData\(\)\s*\{\s*return signedIn\(\);/);

  for (const collectionName of readableCollections) {
    const block = matchBlock(collectionName);
    assert.match(block, /allow read: if canReadPersonalData\(\);/, `${collectionName} signed-in okuma izni içermeli`);
  }

  assert.match(rules, /match \/\{document=\*\*\}\s*\{[\s\S]*allow read: if false;[\s\S]*allow write: if false;/);
});

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

test("Öğrenci bağlantılı kayıtlar string ogrenciId ve var öğrenci şartını korur", () => {
  const validators = ["validVeli", "validAttendance", "validBehavior", "validMeeting"];

  for (const validator of validators) {
    const match = rules.match(new RegExp(`function ${validator}\\(\\) \\{[\\s\\S]*?\\n    \\}`));
    const body = match?.[0] || "";
    assert.match(body, /request\.resource\.data\.keys\(\)\.hasAll\(\[[^\]]*"ogrenciId"/, `${validator} ogrenciId zorunlu tutmalı`);
    assert.match(body, /request\.resource\.data\.ogrenciId is string/, `${validator} ogrenciId string şartı içermeli`);
    assert.match(body, /request\.resource\.data\.ogrenciId\.size\(\) > 0/, `${validator} boş ogrenciId engellemeli`);
    assert.match(body, /studentExists\(request\.resource\.data\.ogrenciId\)/, `${validator} öğrenci varlığını kontrol etmeli`);
  }
});
