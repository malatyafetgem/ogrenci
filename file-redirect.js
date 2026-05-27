(() => {
  if (window.location.protocol !== "file:") return;

  const LOCAL_BASE = "http://127.0.0.1:8091/ogrenci/";
  const fileName = window.location.pathname.split(/[\\/]/).pop() || "index.html";
  const targetUrl = `${LOCAL_BASE}${fileName}${window.location.search}${window.location.hash}`;

  fetch(LOCAL_BASE, { mode: "no-cors", cache: "no-store" })
    .then(() => window.location.replace(targetUrl))
    .catch(() => {
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
          <div style="max-width:520px;background:#fff;border:1px solid #dee2e6;border-radius:8px;padding:24px;box-shadow:0 10px 30px rgba(0,0,0,.08)">
            <h2 style="margin-top:0">Yerel sunucu gerekli</h2>
            <p>Bu sistem modul ve Firebase dosyalari kullandigi icin index dosyasina cift tiklayarak tam calismaz.</p>
            <p><strong>baslat.bat</strong> dosyasini acin veya adres cubuguna su adresi yazin:</p>
            <p><strong>${LOCAL_BASE}</strong></p>
          </div>`;
        document.body.innerHTML = "";
        document.body.appendChild(warning);
      });
    });
})();
