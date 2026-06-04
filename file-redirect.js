(() => {
  if (window.location.protocol !== "file:") return;

  const DEFAULT_PORTS = [8091, 5500, 8000, 8080, 3000, 5173];
  const SERVER_PARAM = "obsServer";
  const SERVER_STORAGE_KEY = "obs-local-server";

  const fileName = decodeURIComponent(window.location.pathname.split(/[\\/]/).pop() || "index.html");
  const basePaths = localProjectPaths();
  const searchParams = new URLSearchParams(window.location.search);
  const storedServer = safeLocalStorageGet(SERVER_STORAGE_KEY);
  const explicitServer = searchParams.get(SERVER_PARAM) || storedServer || "";
  const candidates = buildCandidates(explicitServer, basePaths);

  tryRedirect(candidates, fileName);

  function localProjectPaths() {
    const path = decodeURIComponent(window.location.pathname || "").replace(/\\/g, "/");
    const parts = path.split("/").filter(Boolean);
    const currentDir = parts.length >= 2 ? parts[parts.length - 2] : "";
    return ["", currentDir ? `${currentDir}/` : ""].filter((item, index, arr) => item !== undefined && arr.indexOf(item) === index);
  }

  function buildCandidates(explicit, paths) {
    const urls = [];
    if (explicit) paths.forEach(path => urls.push(normalizeBase(explicit, path)));
    DEFAULT_PORTS.forEach(port => {
      paths.forEach(path => {
        urls.push(`http://127.0.0.1:${port}/${path}`);
        urls.push(`http://localhost:${port}/${path}`);
      });
    });
    return [...new Set(urls.filter(Boolean))];
  }

  function normalizeBase(value, path) {
    const trimmed = String(value || "").trim();
    if (!trimmed) return "";
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
    const url = new URL(withProtocol);
    const pathname = url.pathname.endsWith("/") ? url.pathname : `${url.pathname}/`;
    if (path && !pathname.toLocaleLowerCase("tr-TR").endsWith(`/${path.toLocaleLowerCase("tr-TR")}`)) {
      url.pathname = `${pathname}${path}`.replace(/\/{2,}/g, "/");
    } else {
      url.pathname = pathname;
    }
    return url.toString();
  }

  async function tryRedirect(baseUrls, targetFileName) {
    for (const baseUrl of baseUrls) {
      try {
        await fetch(baseUrl, { mode: "no-cors", cache: "no-store" });
        safeLocalStorageSet(SERVER_STORAGE_KEY, baseUrl);
        const targetUrl = `${baseUrl}${targetFileName}${window.location.search}${window.location.hash}`;
        window.location.replace(targetUrl);
        return;
      } catch (_) {
        // Bir sonraki aday denenir.
      }
    }
    showServerWarning(baseUrls[0] || `http://127.0.0.1:${DEFAULT_PORTS[0]}/`);
  }

  function showServerWarning(suggestedBase) {
    window.addEventListener("DOMContentLoaded", () => {
      const warning = document.createElement("div");
      warning.className = "file-redirect-warning";
      warning.innerHTML = `
        <div class="file-redirect-warning-card">
          <h2 class="file-redirect-warning-title">Yerel sunucu gerekli</h2>
          <p>Bu sistem modul ve Firebase dosyalari kullandigi icin dosyaya cift tiklayarak tam calismaz.</p>
          <p>Yerel sunucuyu baslatin ve tarayicida su adrese gidin:</p>
          <p><strong>${escapeHtml(suggestedBase)}</strong></p>
          <p class="file-redirect-warning-note">Farkli bir adres kullaniyorsaniz dosyayi <strong>?${SERVER_PARAM}=http://adres:port/</strong> parametresiyle acabilirsiniz. Gerekirse adrese alt yolu da ekleyin.</p>
        </div>`;
      document.body.innerHTML = "";
      document.body.appendChild(warning);
    });
  }

  function safeLocalStorageGet(key) {
    try {
      return localStorage.getItem(key) || "";
    } catch {
      return "";
    }
  }

  function safeLocalStorageSet(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {}
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
})();
