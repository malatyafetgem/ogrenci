import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function fonksiyonBlogu(kaynak, ad) {
  const start = kaynak.search(new RegExp(`(?:export\\s+async\\s+function|async\\s+function|function)\\s+${ad}\\s*\\(`));
  if (start === -1) return "";
  const acilis = kaynak.indexOf("{", start);
  if (acilis === -1) return "";
  let derinlik = 0;
  for (let i = acilis; i < kaynak.length; i++) {
    if (kaynak[i] === "{") derinlik++;
    else if (kaynak[i] === "}") {
      derinlik--;
      if (derinlik === 0) return kaynak.slice(acilis, i + 1);
    }
  }
  return kaynak.slice(acilis);
}

test("Veri okuma cache sözleşmesi öğrenci ve kayıt koleksiyonlarını kapsar", () => {
  const js = readFileSync("students.js", "utf8");
  const tumOgrenciBelgeleriGetir = fonksiyonBlogu(js, "tumOgrenciBelgeleriGetir");
  const tumKayitlariGetir = fonksiyonBlogu(js, "tumKayitlariGetir");

  assert.match(js, /const\s+VERI_CACHE_PREFIX\s*=\s*"obs-data-cache-v1:"/);
  assert.match(js, /const\s+OGRENCI_CACHE_TTL\s*=\s*3\s*\*\s*60\s*\*\s*1000/);
  assert.match(js, /const\s+KAYIT_CACHE_TTL\s*=\s*2\s*\*\s*60\s*\*\s*1000/);
  assert.match(js, /function\s+yerelCacheOku/);
  assert.match(js, /function\s+yerelCacheYaz/);
  assert.match(js, /function\s+arkaPlandaYenile/);

  assert.match(tumOgrenciBelgeleriGetir, /yerelCacheOku\("students",\s*OGRENCI_CACHE_TTL\)/);
  assert.match(tumOgrenciBelgeleriGetir, /arkaPlandaYenile\("students",\s*ogrenciBelgeleriniFirestoredanGetir\)/);
  assert.match(tumOgrenciBelgeleriGetir, /yerelCacheYaz\("students",\s*veri\)/);

  assert.match(tumKayitlariGetir, /kayitCachePromises\.has\(koleksiyon\)/);
  assert.match(tumKayitlariGetir, /yerelCacheOku\(key,\s*KAYIT_CACHE_TTL\)/);
  assert.match(tumKayitlariGetir, /arkaPlandaYenile\(key,\s*\(\)\s*=>\s*tumKayitlariFirestoredanGetir\(koleksiyon\)\)/);
  assert.match(tumKayitlariGetir, /yerelCacheYaz\(key,\s*veri\)/);
});

test("Sınıfa göre kayıt sorguları tüm koleksiyon yerine öğrenciId in sorgusuna bölünür", () => {
  const js = readFileSync("students.js", "utf8");
  const helper = fonksiyonBlogu(js, "ogrenciIdlerineGoreKayitlariGetir");
  const kontroller = [
    ["sinifaGoreDevamsizliklariGetir", "tumDevamsizliklariGetir", "devamsizliklar"],
    ["sinifaGoreDavranislariGetir", "tumDavranislariGetir", "davranislar"],
    ["sinifaGoreGorusmeleriGetir", "tumGorusmeleriGetir", "veligorusmeleri"]
  ];

  assert.match(helper, /const\s+BATCH\s*=\s*30/);
  assert.match(helper, /i\s*\+=\s*BATCH/);
  assert.match(helper, /where\("ogrenciId",\s*"in",\s*grup\)/);

  for (const [fn, tumFn, koleksiyon] of kontroller) {
    const block = fonksiyonBlogu(js, fn);
    assert.match(block, new RegExp(`if \\(!sinif\\) return ${tumFn}\\(\\);`), `${fn} boş sınıfta tüm kayıt davranışını açık tutmalı`);
    assert.match(block, /const\s+ogrenciler\s*=\s*await\s+tumOgrencileriGetir\(\)/, `${fn} önce aktif öğrencileri almalı`);
    assert.match(block, /\.filter\(o\s*=>\s*o\.sinif\s*===\s*sinif\)/, `${fn} sınıfı öğrenci listesinde süzmeli`);
    assert.match(block, /\.map\(o\s*=>\s*String\(o\.id\)\)/, `${fn} öğrenci id değerlerini stringleştirmeli`);
    assert.match(block, new RegExp(`ogrenciIdlerineGoreKayitlariGetir\\("${koleksiyon}",\\s*sinifIdleri\\)`), `${fn} ${koleksiyon} için in sorgusu kullanmalı`);
    assert.match(js, new RegExp(`Koleksiyon: ${koleksiyon} \\| Alan: ogrenciId \\(ASC\\) \\| Alan: tarih_sira \\(DESC\\)`), `${koleksiyon} index notu korunmalı`);
  }
});

test("Rapor sayfaları sınıf filtresinde sınıfa göre kayıt yardımcılarını kullanır", () => {
  const kontroller = [
    ["attendance-report.html", "sinifaGoreDevamsizliklariGetir", "tumDevamsizliklariGetir"],
    ["behavior-report.html", "sinifaGoreDavranislariGetir", "tumDavranislariGetir"],
    ["meetings-list.html", "sinifaGoreGorusmeleriGetir", "tumGorusmeleriGetir"]
  ];

  for (const [file, filteredFn, allFn] of kontroller) {
    const html = readFileSync(file, "utf8");
    assert.match(html, new RegExp(`import \\{[\\s\\S]*${filteredFn}`), `${file} ${filteredFn} import etmeli`);
    assert.match(html, new RegExp(`${filteredFn}\\(filtSinif\\)`), `${file} sınıf filtresini yardımcıya geçmeli`);
    assert.match(html, /Promise\.all\(\[/, `${file} öğrenci ve kayıt okumalarını paralelleştirmeli`);
    assert.doesNotMatch(html, new RegExp(`import \\{[\\s\\S]*${allFn}`), `${file} doğrudan tüm kayıt importuna dönmemeli`);
  }
});

test("Dashboard sürümlü cache kullanır ve ağır panelleri sınırlı gösterir", () => {
  const html = readFileSync("dashboard.html", "utf8");

  assert.match(html, /import\s*\{\s*APP_VERSION\s*\}/);
  assert.match(html, /DASHBOARD_CACHE_KEY\s*=\s*`obs-dashboard-cache-v4:\$\{APP_VERSION\}`/);
  assert.match(html, /DASHBOARD_CACHE_TTL\s*=\s*5\s*\*\s*60\s*\*\s*1000/);
  assert.match(html, /dashboardCacheUygula\(dashboardCacheOku\(\)\)/);
  assert.match(html, /const\s+ogrenciler\s*=\s*await\s+tumOgrencileriGetir\(\)/);
  assert.match(html, /Promise\.all\(\[\s*tumDevamsizliklariGetir\(\),\s*tumDavranislariGetir\(\)\s*\]\)/);
  assert.match(html, /dashboardCacheYaz\(ozet\)/);
  assert.match(html, /tumOgrenciler\.map\(ogrenciCacheOzet\)/);
  assert.match(html, /devamsizlikHtml:\s*document\.getElementById\("devamsizlik-tablo"\)\.innerHTML/);
  assert.match(html, /davranisHtml:\s*document\.getElementById\("davranis-liste"\)\.innerHTML/);
  assert.match(html, /uyarilar\.slice\(0,\s*5\)/);
  assert.match(html, /tümDavranislar\.slice\(0,\s*5\)/);
});

test("Liste ekranları DataTable sayfa boyutunu sınırlı tutar", () => {
  const kontroller = [
    ["students-list.html", 25],
    ["phone-list.html", 50],
    ["attendance-report.html", 25],
    ["behavior-report.html", 20],
    ["meetings-list.html", 25]
  ];

  for (const [file, expected] of kontroller) {
    const html = readFileSync(file, "utf8");
    assert.match(html, new RegExp(`pageLength:\\s*${expected}\\b`), `${file} pageLength ${expected} olmalı`);
  }
});
