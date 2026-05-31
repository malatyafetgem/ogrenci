// pwa.js — PWA kayıt ve güncelleme yönetimi
(function () {
  if (!("serviceWorker" in navigator)) return;

  const guvenliLocal =
    location.hostname === "localhost" ||
    location.hostname === "127.0.0.1" ||
    location.hostname === "::1";

  if (location.protocol !== "https:" && !guvenliLocal) return;

  function hazirOlunca(cb) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", cb, { once: true });
    } else {
      cb();
    }
  }

  function guncellemeBildir(sw) {
    if (!sw) return;

    hazirOlunca(function () {
      if (document.getElementById("pwa-guncelle-bildirimi")) return;

      const btn = document.createElement("button");
      btn.id = "pwa-guncelle-bildirimi";
      btn.type = "button";
      btn.textContent = "Yeni sürüm hazır — yenile";
      btn.style.cssText = [
        "position:fixed",
        "left:1rem",
        "right:1rem",
        "bottom:calc(1rem + env(safe-area-inset-bottom,0px))",
        "z-index:3000",
        "border:0",
        "border-radius:12px",
        "padding:.85rem 1rem",
        "background:#D9542B",
        "color:#fff",
        "font-weight:700",
        "box-shadow:0 10px 28px rgba(38,32,25,.22)"
      ].join(";");

      btn.addEventListener("click", function () {
        sw.postMessage({ type: "SKIP_WAITING" });
        btn.disabled = true;
        btn.textContent = "Yenileniyor...";
      });

      document.body.appendChild(btn);
    });
  }

  navigator.serviceWorker.register("./sw.js").then(function (reg) {
    setInterval(function () {
      reg.update();
    }, 30 * 60 * 1000);

    if (reg.waiting) {
      guncellemeBildir(reg.waiting);
    }

    reg.addEventListener("updatefound", function () {
      const sw = reg.installing;
      if (!sw) return;

      sw.addEventListener("statechange", function () {
        if (sw.state === "installed" && navigator.serviceWorker.controller) {
          guncellemeBildir(sw);
        }
      });
    });
  }).catch(function () {
    // PWA kaydı başarısız olsa bile uygulama normal çalışmaya devam eder.
  });

  let yenilendi = false;

  navigator.serviceWorker.addEventListener("controllerchange", function () {
    if (yenilendi) return;
    yenilendi = true;
    location.reload();
  });

  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    window._pwaInstallPrompt = e;

    const btn = document.getElementById("pwa-yukle-btn");
    if (btn) btn.classList.remove("d-none");
  });

  window.addEventListener("appinstalled", function () {
    window._pwaInstallPrompt = null;
  });
})();
