import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";

const htmlFiles = readdirSync(".").filter(file => file.endsWith(".html"));

test("HTML dosyalarında inline style ve inline event handler kullanılmaz", () => {
  assert.ok(htmlFiles.length > 0, "HTML dosyası bulunamadı");

  const sorunlar = [];
  for (const file of htmlFiles) {
    const html = readFileSync(file, "utf8");
    if (/<style\b/i.test(html)) sorunlar.push(`${file}: <style>`);
    if (/\sstyle\s*=/i.test(html)) sorunlar.push(`${file}: style=`);
    if (/\s(onclick|onchange|oninput|onsubmit|onkeydown|onkeyup|onload|onerror|onmouseover|onfocus|onblur)\s*=/i.test(html)) {
      sorunlar.push(`${file}: inline event handler`);
    }
  }

  assert.deepEqual(sorunlar, []);
});

test("HTML dosyalarında tema rengi ayarı ve dark mode girişi yoktur", () => {
  const sorunlar = [];
  for (const file of htmlFiles) {
    const html = readFileSync(file, "utf8");
    if (/Tema Rengi|tema-renk|obs-tema-rengi|prefers-color-scheme|dark-mode/i.test(html)) {
      sorunlar.push(file);
    }
  }

  assert.deepEqual(sorunlar, []);
});
