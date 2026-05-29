(() => {
  if (window.location.protocol !== "file:") return;

  const DEFAULT_PORTS = [8091, 5500, 8000, 8080, 3000, 5173];
  const PROJECT_DIR = "ogrenci";
  const SERVER_PARAM = "obsServer";
  const SERVER_STORAGE_KEY = "obs-local-server";

  const fileName = decodeURIComponent(window.location.pathname.split(/[\\/]/).pop() || "index.html");
  const basePath = localProjectPath();
  const searchParams = new URLSearchParams(window.location.search);
  const storedServer = safeLocalStorageGet(SERVER_STORAGE_KEY);
  const explicitServer = searchParams.get(SERVER_PARAM) || storedServer || "";
  const candidates = buildCandidates(explicitServer, basePath);

  tryRedirect(candidates, fileName);

  function localProjectPath() {
    const path = decodeURIComponent(window.location.pathname || "").replace(/\\/g, "/");
    const parts = path.split("/").filter(Boolean);
    const projectIndex = parts.map(part => part.toLocaleLowerCase("tr-TR")).lastIndexOf(PROJECT_DIR);
    return projectIndex >= 0 ? `${parts[projectIndex]}/` : "";
  }

  function buildCandidates(explicit, path) {
    const urls = [];
    if (explicit) urls.push(normalizeBase(explicit, path));
    DEFAULT_PORTS.forEach(port => {
      urls.push(`http://127.0.0.1:${port}/${path}`);
      urls.push(`http://localhost:${port}/${path}`);
    });
    return [...new Set(urls.filter(Boolean))];
  }

  function normalizeBase(value, path) {
    const trimmed = String(value || "").trim();
    if (!trimmed) return "";
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
    const url = new URL(withProtocol);
    const pathname = url.pathname.endsWith("/") ? url.pathname : `${url.pathname}/`;
    if (!pathname.toLocaleLowerCase("tr-TR").endsWith(`/${PROJECT_DIR}/`) && path) {
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
    showServerWarning(baseUrls[0] || `http://127.0.0.1:${DEFAULT_PORTS[0]}/${basePath}`);
  }

  function showServerWarning(suggestedBase) {
    window.addEventListener("DOMContentLoaded", () => {
      const warning = document.createElement("div");
      warning.style.cssText = [
        "position:fixed",
        "inset:0",
        "z-index:99999",
        "display:flex",
        "align-items:center",
        "justify-content:center",
        "background:#f8f9fa",
        "font-family:Arial,sans-serif",
        "padding:24px",
        "text-align:center"
      ].join(";");
      warning.innerHTML = `
        <div style="max-width:560px;background:#fff;border:1px solid #dee2e6;border-radius:8px;padding:24px;box-shadow:0 10px 30px rgba(0,0,0,.08)">
          <h2 style="margin-top:0">Yerel sunucu gerekli</h2>
          <p>Bu sistem modul ve Firebase dosyalari kullandigi icin dosyaya cift tiklayarak tam calismaz.</p>
          <p>Yerel sunucuyu baslatin ve tarayicida su adrese gidin:</p>
          <p><strong>${escapeHtml(suggestedBase)}</strong></p>
          <p style="font-size:13px;color:#6c757d">Farkli bir adres kullaniyorsaniz dosyayi <strong>?${SERVER_PARAM}=http://adres:port/${PROJECT_DIR}/</strong> parametresiyle acabilirsiniz.</p>
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
