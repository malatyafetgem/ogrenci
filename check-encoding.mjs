import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL(".", import.meta.url));
const FILE_RE = /\.(html|js|css)$/i;
const BAD_CHARS = [
  0x00c2, // common mojibake prefix
  0x00c3,
  0x00c4,
  0x00c5,
  0xfffd  // replacement character
].map(code => String.fromCodePoint(code));

const files = (await readdir(ROOT)).filter(file => FILE_RE.test(file));
const findings = [];

for (const file of files) {
  const text = await readFile(join(ROOT, file), "utf8");
  text.split(/\r?\n/).forEach((line, index) => {
    if (BAD_CHARS.some(ch => line.includes(ch))) {
      findings.push(`${file}:${index + 1}:${line.trim()}`);
    }
  });
}

if (findings.length) {
  console.error("Encoding check failed. Possible mojibake found:");
  console.error(findings.join("\n"));
  process.exit(1);
}

console.log("Encoding check passed.");
