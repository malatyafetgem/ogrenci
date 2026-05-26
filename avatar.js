function avatarKind(cinsiyet) {
  const value = String(cinsiyet || "").trim().toLocaleLowerCase("tr-TR");
  if (value === "kız" || value === "kiz") return "girl";
  if (value === "erkek") return "boy";
  return "neutral";
}

const PALETTES = {
  girl: {
    bg: "#ffe7f0",
    hair: "#7b2f5b",
    shirt: "#e83e8c",
    accent: "#f8a8c7"
  },
  boy: {
    bg: "#e7f1ff",
    hair: "#2d4a68",
    shirt: "#0d6efd",
    accent: "#8bbcff"
  },
  neutral: {
    bg: "#edf2f7",
    hair: "#4b5563",
    shirt: "#6c757d",
    accent: "#cbd5e1"
  }
};

function svgToDataUri(svg) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export function avatarSrc(cinsiyet) {
  const renk = PALETTES[avatarKind(cinsiyet)];
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" role="img" aria-label="Öğrenci avatarı">
      <rect width="120" height="120" rx="60" fill="${renk.bg}"/>
      <circle cx="60" cy="47" r="25" fill="#f2c7a5"/>
      <path d="M32 47c3-24 19-34 36-29 12 4 20 14 21 29-11-8-25-11-40-8-7 1-12 4-17 8Z" fill="${renk.hair}"/>
      <path d="M25 108c5-24 18-37 35-37s30 13 35 37H25Z" fill="${renk.shirt}"/>
      <path d="M45 76c5 5 10 8 15 8s10-3 15-8" fill="none" stroke="${renk.accent}" stroke-width="6" stroke-linecap="round"/>
      <circle cx="51" cy="50" r="3" fill="#2f2f2f"/>
      <circle cx="69" cy="50" r="3" fill="#2f2f2f"/>
      <path d="M51 61c5 4 13 4 18 0" fill="none" stroke="#8a4b36" stroke-width="3" stroke-linecap="round"/>
    </svg>`;
  return svgToDataUri(svg);
}
