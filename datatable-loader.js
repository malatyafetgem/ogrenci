// Loads DataTables from CDN when available; falls back to DataTableFallback otherwise.
// Sayfalar CDN scriptleri doğrudan yükleyip datatable-fallback.js ile güvence altına alıyor;
// bu dosya gerektiğinde manuel CDN yüklemesi için korunmaktadır.
(function () {
  const DT_URL    = "https://cdn.jsdelivr.net/npm/datatables.net@2.3.0/js/dataTables.min.js";
  const DT_BS5_URL = "https://cdn.jsdelivr.net/npm/datatables.net-bs5@2.3.0/js/dataTables.bootstrap5.min.js";
  const FALLBACK_NAME = "DataTableFallback";

  function setMode(mode) {
    document.documentElement.dataset.obsDatatable = mode;
  }

  function nativeReady() {
    return !!window.DataTable && window.DataTable.name !== FALLBACK_NAME;
  }

  function loadScript(src) {
    return new Promise(resolve => {
      const script = document.createElement("script");
      let done = false;
      const timer = window.setTimeout(() => finish(false), 5000);
      function finish(ok) {
        if (done) return;
        done = true;
        window.clearTimeout(timer);
        resolve(ok);
      }
      script.src = src;
      script.async = false;
      script.onload  = () => finish(true);
      script.onerror = () => finish(false);
      document.head.appendChild(script);
    });
  }

  async function loadNativeDataTable() {
    if (nativeReady()) { setMode("native"); return true; }
    await loadScript(DT_URL);
    await loadScript(DT_BS5_URL);
    setMode(nativeReady() ? "native" : "fallback");
    return nativeReady();
  }

  window.obsDataTableReady = loadNativeDataTable();
})();
