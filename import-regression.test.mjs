import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function fonksiyonBlogu(kaynak, ad) {
  const start = kaynak.search(new RegExp(`function\\s+${ad}\\s*\\(`));
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

test("Öğrenci Excel importu admin kapısı, zorunlu eşleşme ve hata raporu içerir", () => {
  const html = readFileSync("students-list.html", "utf8");
  const dosyaOku = fonksiyonBlogu(html, "dosyaOku");
  const previewGuncelle = fonksiyonBlogu(html, "previewGuncelle");
  const importBaslat = fonksiyonBlogu(html, "importBaslat");

  assert.match(html, /id="excel-import-btn"[^>]*data-admin-only/);
  assert.match(html, /document\.getElementById\("excel-import-btn"\)\.addEventListener\("click"/);
  assert.match(importBaslat, /if\s*\(!adminActionAllowed\(\)\)\s*return/);

  assert.match(dosyaOku, /XLSX\.read\(ev\.target\.result,\s*\{\s*type:\s*"array",\s*cellDates:\s*true\s*\}\)/);
  assert.match(dosyaOku, /XLSX\.utils\.sheet_to_json\(ws,\s*\{\s*defval:\s*"",\s*raw:\s*false\s*\}\)/);
  assert.match(dosyaOku, /Excel sayfasında aktarılacak satır bulunamadı\./);
  assert.match(dosyaOku, /Excel dosyası okunamadı:/);

  assert.match(html, /function\s+zorunluEksikler/);
  assert.match(previewGuncelle, /baslatBtn\.disabled\s*=\s*eksikler\.length\s*>\s*0\s*\|\|\s*importVerisi\.length\s*===\s*0/);
  assert.match(previewGuncelle, /Zorunlu alanları eşleştirin:/);

  assert.match(importBaslat, /const\s+mod\s*=\s*importModu\(\)/);
  assert.match(importBaslat, /mod\s*===\s*"sadece-guncelle"\s*&&\s*!mevcut/);
  assert.match(importBaslat, /Öğrenci no bulunamadı/);
  assert.match(importBaslat, /Yeni öğrenci için eksik alan:/);
  assert.match(importBaslat, /hatalar\.push\(\{\s*satir:\s*i\s*\+\s*2/);
  assert.match(importBaslat, /hatalar\.slice\(0,\s*10\)/);
  assert.match(importBaslat, /hata-rapor-indir-btn/);
  assert.match(importBaslat, /text\/tab-separated-values;charset=utf-8/);
  assert.match(importBaslat, /import-hata-raporu-\$\{bugun\(\)\}\.tsv/);
});

test("Öğrenci import satır çözümleme yeni kayıt ve tarih risklerini işaretler", () => {
  const html = readFileSync("students-list.html", "utf8");
  const satirCoz = fonksiyonBlogu(html, "satirCoz");
  const importModuAciklamaGuncelle = fonksiyonBlogu(html, "importModuAciklamaGuncelle");

  assert.match(satirCoz, /if\s*\(!numara\)\s*hatalar\.push\("Öğrenci No yok"\)/);
  assert.match(satirCoz, /gecerliTarih\(dogumTarihi\)/);
  assert.match(satirCoz, /hatalar\.push\("Doğum tarihi geçersiz"\)/);
  assert.match(satirCoz, /if\s*\(!ogrVeri\.ad\)\s*yeniKayitEksikleri\.push\("Ad"\)/);
  assert.match(satirCoz, /if\s*\(!ogrVeri\.soyad\)\s*yeniKayitEksikleri\.push\("Soyad"\)/);
  assert.match(satirCoz, /if\s*\(!ogrVeri\.sinif\)\s*yeniKayitEksikleri\.push\("Sınıf"\)/);
  assert.match(satirCoz, /cokluVeliler\s*=\s*\[1,\s*2,\s*3\]/);
  assert.match(html, /const\s+TEKIL_YAKINLIKLAR\s*=\s*new Set\(\["Anne",\s*"Baba",\s*"Vasi",\s*"Üvey Anne",\s*"Üvey Baba"\]\)/);
  assert.match(importModuAciklamaGuncelle, /Bu modda yeni öğrenci oluşturulmaz/);
  assert.match(importModuAciklamaGuncelle, /Yeni öğrenci oluşturmak için Ad, Soyad ve Sınıf bilgileri gerekir/);
});

test("Devamsızlık Excel importu zorunlu alan, neden kodu ve tarih doğrulaması yapar", () => {
  const html = readFileSync("attendance-entry.html", "utf8");
  const excelDosyaOku = fonksiyonBlogu(html, "excelDosyaOku");
  const excelOnizlemeGuncelle = fonksiyonBlogu(html, "excelOnizlemeGuncelle");
  const excelSatirCoz = fonksiyonBlogu(html, "excelSatirCoz");
  const excelTarihOku = fonksiyonBlogu(html, "excelTarihOku");

  assert.match(html, /const\s+EXCEL_ALANLARI\s*=\s*\[/);
  assert.match(html, /key:\s*"ogrenci_no"[\s\S]*required:\s*true/);
  assert.match(html, /key:\s*"tarih"[\s\S]*required:\s*true/);
  assert.match(html, /Neden Kodları/);
  assert.match(html, /Geçerli kodlar:/);
  assert.match(html, /NEDEN_TANIMLARI/);

  assert.match(excelDosyaOku, /XLSX\.read\(ev\.target\.result,\s*\{\s*type:\s*"array",\s*cellDates:\s*true\s*\}\)/);
  assert.match(excelDosyaOku, /XLSX\.utils\.sheet_to_json\(ws,\s*\{\s*defval:\s*"",\s*raw:\s*false\s*\}\)/);
  assert.match(excelDosyaOku, /Excel sayfasında aktarılacak satır bulunamadı\./);

  assert.match(excelOnizlemeGuncelle, /aktarBtn\.disabled\s*=\s*eksikler\.length\s*>\s*0\s*\|\|\s*!excelVerisi\.length/);
  assert.match(excelOnizlemeGuncelle, /Zorunlu alanları eşleştirin:/);
  assert.match(excelOnizlemeGuncelle, /excelDosyaTekrarlariniIsaretle/);

  assert.match(excelSatirCoz, /if\s*\(!no\)\s*return\s*\{\s*\.\.\.temel,\s*durum:\s*"Öğrenci no yok"\s*\}/);
  assert.match(excelSatirCoz, /if\s*\(!ogr\)\s*return\s*\{\s*\.\.\.temel,\s*durum:\s*"Öğrenci bulunamadı"\s*\}/);
  assert.match(excelSatirCoz, /if\s*\(!tarih\)\s*return\s*\{\s*\.\.\.temel,\s*durum:\s*"Tarih yok"\s*\}/);
  assert.match(excelSatirCoz, /if\s*\(!tanim\)\s*return\s*\{\s*\.\.\.temel,\s*durum:\s*`Tanımsız neden:/);
  assert.match(excelSatirCoz, /if\s*\(!veri\)\s*return\s*\{\s*\.\.\.temel,\s*durum:\s*"Miktar yok\/geçersiz"\s*\}/);

  assert.match(excelTarihOku, /value instanceof Date/);
  assert.match(excelTarihOku, /gecerliTarih\(formatted\)/);
  assert.match(excelTarihOku, /raw\.match\(/);
  assert.match(excelTarihOku, /\\d\{1,2\}[\s\S]*\\d\{2,4\}/);
  assert.match(excelTarihOku, /serial\s*>\s*25000\s*&&\s*serial\s*<\s*60000/);
});

test("Devamsızlık importu dosya içi ve sistemdeki tekrarları yazmadan engeller", () => {
  const html = readFileSync("attendance-entry.html", "utf8");
  const excelDosyaTekrarlariniIsaretle = fonksiyonBlogu(html, "excelDosyaTekrarlariniIsaretle");
  const sistemdeAyniTarihVar = fonksiyonBlogu(html, "sistemdeAyniTarihVar");
  const excelAktar = fonksiyonBlogu(html, "excelAktar");

  assert.match(excelDosyaTekrarlariniIsaretle, /const\s+gorulen\s*=\s*new Set\(\)/);
  assert.match(excelDosyaTekrarlariniIsaretle, /gorulen\.has\(`\$\{satir\.no\}\|\$\{tarih\}`\)/);
  assert.match(excelDosyaTekrarlariniIsaretle, /durum:\s*`Aynı dosyada tekrar:/);
  assert.match(excelDosyaTekrarlariniIsaretle, /atla:\s*true/);

  assert.match(sistemdeAyniTarihVar, /cache\.set\(ogrId,\s*await\s+devamsizliklarGetir\(ogrId\)\)/);
  assert.match(sistemdeAyniTarihVar, /cakisanTarihler\(tarihler,\s*cache\.get\(ogrId\)\)\.length\s*>\s*0/);

  assert.match(excelAktar, /const\s+aktarilacaklar\s*=\s*excelSatirlar\.filter\(s\s*=>\s*s\.aktar\)/);
  assert.match(excelAktar, /Aktarılacak geçerli kayıt yok\./);
  assert.match(excelAktar, /if\s*\(await\s+sistemdeAyniTarihVar\(s\.ogrId,\s*s\.tarihler,\s*mevcutKayitCache\)\)/);
  assert.match(excelAktar, /continue/);
  assert.match(excelAktar, /await\s+devamsizlikEkle\(s\.ogrId,\s*s\.veri\)/);
  assert.match(excelAktar, /dosyadaAtlanan\s*=\s*excelSatirlar\.filter\(s\s*=>\s*s\.atla\)\.length/);
});
