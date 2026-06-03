// Loads DataTables from CDN when available; keeps the local fallback otherwise.
(function () {
  const JQUERY_URL = "https://cdn.jsdelivr.net/npm/jquery@3.7.1/dist/jquery.min.js";
  const DATATABLES_URL = "https://cdn.datatables.net/2.0.3/js/dataTables.min.js";
  const DATATABLES_BS5_URL = "https://cdn.datatables.net/2.0.3/js/dataTables.bootstrap5.min.js";
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
      script.onload = () => finish(true);
      script.onerror = () => finish(false);
      document.head.appendChild(script);
    });
  }

  async function loadNativeDataTable() {
    if (nativeReady()) {
      setMode("native");
      return true;
    }

    if (!window.jQuery) {
      await loadScript(JQUERY_URL);
    }
    if (!window.jQuery) {
      setMode("fallback");
      return false;
    }

    await loadScript(DATATABLES_URL);
    await loadScript(DATATABLES_BS5_URL);

    setMode(nativeReady() ? "native" : "fallback");
    return nativeReady();
  }

  window.obsDataTableReady = loadNativeDataTable();
})();
