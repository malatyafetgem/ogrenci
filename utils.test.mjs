import test from "node:test";
import assert from "node:assert/strict";

import {
  compareSinif,
  devamsizlikDurum,
  devamsizlikDurumEtiketi,
  devamsizlikRenk,
  formatTarih,
  gecerliTarih,
  gecerliTc
} from "./utils.js";

test("gecerliTc boş değeri kabul eder ve hatalı TC değerlerini reddeder", () => {
  assert.equal(gecerliTc(""), true);
  assert.equal(gecerliTc("10000000146"), true);
  assert.equal(gecerliTc("00000000000"), false);
  assert.equal(gecerliTc("12345678901"), false);
  assert.equal(gecerliTc("1000000014A"), false);
});

test("formatTarih farklı girişleri GG.AA.YYYY biçimine çevirir", () => {
  assert.equal(formatTarih("1.2.2026"), "01.02.2026");
  assert.equal(formatTarih("2026-6-3"), "03.06.2026");
  assert.equal(formatTarih(new Date(2026, 5, 3)), "03.06.2026");
  assert.equal(formatTarih("geçersiz"), "geçersiz");
});

test("gecerliTarih takvimde olmayan tarihleri reddeder", () => {
  assert.equal(gecerliTarih("29.02.2024"), true);
  assert.equal(gecerliTarih("31.02.2026"), false);
  assert.equal(gecerliTarih("2026-13-01"), false);
  assert.equal(gecerliTarih("geçersiz"), false);
});

test("compareSinif sınıf seviyesini ve şubeyi Türkçe sıralar", () => {
  const siniflar = ["Mezun", "10-A", "9-B", "12-C", "9-A"];
  siniflar.sort(compareSinif);
  assert.deepEqual(siniflar, ["9-A", "9-B", "10-A", "12-C", "Mezun"]);
});

test("devamsizlikDurum eşiklere göre beklenen uyarı seviyesini döndürür", () => {
  assert.equal(devamsizlikDurum(0, 0), "normal");
  assert.equal(devamsizlikDurum(0, 5), "uyari");
  assert.equal(devamsizlikDurum(10, 0), "uyari");
  assert.equal(devamsizlikDurum(20, 0), "kritik");
  assert.equal(devamsizlikDurum(0, 10), "kaldi");
  assert.equal(devamsizlikDurum(25, 5), "kaldi");
});

test("devamsizlik durum etiketleri ve badge renkleri tutarlıdır", () => {
  assert.equal(devamsizlikDurumEtiketi("normal"), "Normal");
  assert.equal(devamsizlikDurumEtiketi("uyari"), "Uyarı");
  assert.equal(devamsizlikDurumEtiketi("kritik"), "Kritik");
  assert.equal(devamsizlikDurumEtiketi("kaldi"), "Kaldı");

  assert.equal(devamsizlikRenk("normal"), "success");
  assert.equal(devamsizlikRenk("uyari"), "warning");
  assert.equal(devamsizlikRenk("kritik"), "danger");
  assert.equal(devamsizlikRenk("kaldi"), "dark");
});
