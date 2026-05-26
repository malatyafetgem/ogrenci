function avatarKind(cinsiyet) {
  const value = String(cinsiyet || "").trim().toLocaleLowerCase("tr-TR");
  if (value === "kız" || value === "kiz") return "girl";
  if (value === "erkek") return "boy";
  return "neutral";
}

const PALETTES = {
  girl: {
    bg1: "#fff1f7",
    bg2: "#f7d7e7",
    hair: "#6f2454",
    shirt: "#d63384",
    accent: "#ffffff",
    skin: "#f4c7a1"
  },
  boy: {
    bg1: "#e9f4ff",
    bg2: "#cfe6ff",
    hair: "#243b53",
    shirt: "#0d6efd",
    accent: "#ffffff",
    skin: "#f1c39d"
  },
  neutral: {
    bg1: "#f1f5f9",
    bg2: "#dbe4ee",
    hair: "#475569",
    shirt: "#64748b",
    accent: "#ffffff",
    skin: "#efc5a4"
  }
};

function svgToDataUri(svg) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export function avatarSrc(cinsiyet) {
  const kind = avatarKind(cinsiyet);
  const renk = PALETTES[kind];
  const hair = kind === "girl"
    ? `<path d="M31 59c0-25 14-42 34-42s34 17 34 42c-9-8-21-12-34-12s-25 4-34 12Z" fill="${renk.hair}"/>
       <path d="M34 60c5-21 18-33 34-33 13 0 24 8 30 22-22-6-43-4-64 11Z" fill="${renk.hair}"/>`
    : `<path d="M34 53c3-21 17-34 33-34 18 0 30 13 31 32-8-5-18-8-30-8-15 0-25 3-34 10Z" fill="${renk.hair}"/>
       <path d="M42 42c8-14 31-21 48-4-15-2-29 0-48 4Z" fill="${renk.hair}" opacity=".82"/>`;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" role="img" aria-label="Öğrenci avatarı">
      <defs>
        <linearGradient id="avatar-bg" x1="18" y1="12" x2="110" y2="120" gradientUnits="userSpaceOnUse">
          <stop stop-color="${renk.bg1}"/>
          <stop offset="1" stop-color="${renk.bg2}"/>
        </linearGradient>
      </defs>
      <rect width="128" height="128" rx="64" fill="url(#avatar-bg)"/>
      <path d="M22 118c7-26 23-40 42-40s35 14 42 40H22Z" fill="${renk.shirt}"/>
      <path d="M48 82c5 7 10 10 16 10s11-3 16-10" fill="none" stroke="${renk.accent}" stroke-width="8" stroke-linecap="round"/>
      <circle cx="64" cy="55" r="28" fill="${renk.skin}"/>
      ${hair}
      <circle cx="53" cy="57" r="3.5" fill="#1f2937"/>
      <circle cx="75" cy="57" r="3.5" fill="#1f2937"/>
      <path d="M55 68c6 5 13 5 19 0" fill="none" stroke="#8a4b36" stroke-width="3.5" stroke-linecap="round"/>
      <path d="M42 106h44" stroke="rgba(255,255,255,.45)" stroke-width="5" stroke-linecap="round"/>
    </svg>`;
  return svgToDataUri(svg);
}
