function avatarKind(cinsiyet) {
  const value = String(cinsiyet || "").trim().toLocaleLowerCase("tr-TR");
  if (value === "kız" || value === "kiz") return "girl";
  if (value === "erkek") return "boy";
  return "neutral";
}

const PALETTES = {
  girl: {
    bg1: "#fff6fb",
    bg2: "#ffe6f1",
    hair: "#d61f69",
    shirt: "#f37aaa",
    accent: "#ffffff",
    skin: "#f06298",
    brush1: "#ffd4e5",
    brush2: "#ff8fbd",
    brush3: "#f24183",
    text: "#d61f69",
    shadow: "#8f123f"
  },
  boy: {
    bg1: "#f6fbff",
    bg2: "#e4f2ff",
    hair: "#0b3f88",
    shirt: "#78b9ff",
    accent: "#ffffff",
    skin: "#1674d2",
    brush1: "#cfe8ff",
    brush2: "#78b9ff",
    brush3: "#1674d2",
    text: "#0b3f88",
    shadow: "#082b5c"
  },
  neutral: {
    bg1: "#fbf8ff",
    bg2: "#eee4ff",
    hair: "#4f2a86",
    shirt: "#b48ae9",
    accent: "#ffffff",
    skin: "#7e57c2",
    brush1: "#eadcff",
    brush2: "#b48ae9",
    brush3: "#7e57c2",
    text: "#4f2a86",
    shadow: "#30145f"
  }
};

function svgToDataUri(svg) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export function avatarSrc(cinsiyet) {
  const kind = avatarKind(cinsiyet);
  const renk = PALETTES[kind];

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" role="img" aria-label="Öğrenci avatarı">
      <defs>
        <linearGradient id="avatar-bg" x1="18" y1="12" x2="110" y2="120" gradientUnits="userSpaceOnUse">
          <stop stop-color="${renk.bg1}"/>
          <stop offset="1" stop-color="${renk.bg2}"/>
        </linearGradient>
        <filter id="avatar-soft-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#0f172a" flood-opacity=".16"/>
        </filter>
        <filter id="avatar-text-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="3" stdDeviation="1.6" flood-color="${renk.shadow}" flood-opacity=".35"/>
        </filter>
      </defs>

      <circle cx="64" cy="64" r="60" fill="url(#avatar-bg)"/>
      <circle cx="64" cy="64" r="59" fill="none" stroke="${renk.brush3}" stroke-opacity=".16" stroke-width="2"/>

      <g filter="url(#avatar-soft-shadow)">
        <circle cx="64" cy="64" r="53" fill="#ffffff"/>
        <path d="M28 47c15-9 35-12 65-11 5 0 8 2 8 4 0 3-4 5-10 5-22 0-39 3-60 11-5 2-9 1-10-2-1-2 2-5 7-7Z" fill="${renk.brush1}" opacity=".92"/>
        <path d="M24 67c18-12 43-17 79-15 5 0 8 2 8 5 0 3-4 5-10 5-28 1-48 6-72 18-5 2-10 2-11-1-2-3 1-8 6-12Z" fill="${renk.brush2}" opacity=".82"/>
        <path d="M34 87c14-9 35-13 61-13 5 0 8 2 8 5 0 3-4 5-9 5-18 1-34 5-54 14-5 2-9 1-10-2-1-3 0-6 4-9Z" fill="${renk.brush3}" opacity=".72"/>
        <path d="M24 88c18-6 44-10 82-10" fill="none" stroke="#ffffff" stroke-width="9" stroke-linecap="round" stroke-opacity=".55"/>
        <path d="M31 42c14-5 34-8 61-8" fill="none" stroke="#ffffff" stroke-width="6" stroke-linecap="round" stroke-opacity=".5"/>
      </g>

      <g filter="url(#avatar-text-shadow)" text-anchor="middle" font-family="Arial Black, Impact, Montserrat, system-ui, sans-serif" font-weight="900" font-style="italic" letter-spacing="1.5">
        <text x="64" y="59" fill="#ffffff" stroke="${renk.text}" stroke-width="1.3" paint-order="stroke" font-size="35">FET</text>
        <text x="64" y="93" fill="#ffffff" stroke="${renk.text}" stroke-width="1.3" paint-order="stroke" font-size="35">GEM</text>
      </g>
    </svg>`;

  return svgToDataUri(svg);
}