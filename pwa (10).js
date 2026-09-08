/** Progressive enhancement: the ERP remains usable if installation or offline storage is unavailable. */
export const messages = {
  tr: {
    title: "Uygulama ve çevrimdışı erişim",
    install: "Uygulamayı yükle",
    help: "Tarayıcının menüsündeki yükleme seçeneğini kullanın. iPhone/iPad: Paylaş → Ana Ekrana Ekle. Bu seçenek tarayıcıya göre değişir.",
    offline:
      "Çevrimdışısınız. Demo verileri ve bu cihazdaki aksiyonlarla çalışıyorsunuz.",
    ready: "Çevrimdışı kullanım hazır. Demo verileri bu cihazda saklandı.",
    preparing: "Çevrimdışı kullanım hazırlanıyor…",
    unavailable:
      "Çevrimdışı erişim hazırlanamadı. Bağlantınızı kontrol edip sayfayı yeniden açın.",
    unsupported:
      "Bu ortamda çevrimdışı erişim kullanılamıyor. HTTPS veya localhost üzerinden açın.",
    update: "Yeni sürüm hazır. Açık formunuzu kaydedip güncelleyin.",
    apply: "Kaydettim, güncelle",
    installed: "Uygulama yüklendi.",
    error: "Yükleme tamamlanamadı; tarayıcı menüsünden yeniden deneyin.",
  },
  en: {
    title: "App and offline access",
    install: "Install app",
    help: "Use the install option in your browser menu. iPhone/iPad: Share → Add to Home Screen. Availability varies by browser.",
    offline:
      "You are offline. You are using demo data and actions stored on this device.",
    ready: "Ready for offline use. Demo data is stored on this device.",
    preparing: "Preparing offline access…",
    unavailable:
      "Offline access could not be prepared. Check your connection and reopen the page.",
    unsupported:
      "Offline access is unavailable here. Open via HTTPS or localhost.",
    update: "An update is ready. Save your open form before updating.",
    apply: "Saved, update now",
    installed: "App installed.",
    error: "Installation did not complete; try again from the browser menu.",
  },
  de: {
    title: "App und Offlinezugriff",
    install: "App installieren",
    help: "Verwenden Sie die Installationsoption im Browsermenü. iPhone/iPad: Teilen → Zum Home-Bildschirm. Die Verfügbarkeit hängt vom Browser ab.",
    offline:
      "Sie sind offline. Sie verwenden Demodaten und Aktionen auf diesem Gerät.",
    ready:
      "Offlinezugriff bereit. Demodaten sind auf diesem Gerät gespeichert.",
    preparing: "Offlinezugriff wird vorbereitet…",
    unavailable:
      "Offlinezugriff konnte nicht vorbereitet werden. Prüfen Sie die Verbindung und öffnen Sie die Seite erneut.",
    unsupported:
      "Offlinezugriff ist hier nicht verfügbar. Öffnen Sie die Seite über HTTPS oder localhost.",
    update:
      "Ein Update ist bereit. Speichern Sie vor dem Update Ihr geöffnetes Formular.",
    apply: "Gespeichert, jetzt aktualisieren",
    installed: "App installiert.",
    error:
      "Installation nicht abgeschlossen; versuchen Sie es über das Browsermenü erneut.",
  },
};
/** Independent DOM region survives route rendering and never touches business data or localStorage. */
export function setupPWA(win = window) {
  const doc = win.document,
    nav = win.navigator;
  const host = doc.querySelector("#pwa");
  if (!host) return;
  let promptEvent,
    registration,
    status = "preparing",
    updating = false;
  const words = () => messages[doc.documentElement.lang] || messages.en;
  function render() {
    const t = words(),
      open = host.querySelector("details")?.open;
    host.innerHTML = `<p class="pwa-offline" role="status" ${nav.onLine !== false ? "hidden" : ""}>${t.offline}</p><details class="pwa-panel" ${open ? "open" : ""}><summary>${t.title}</summary><p role="status">${t[status]}</p><p>${t.help}</p><button type="button" id="pwa-install" ${!promptEvent ? "hidden" : ""}>${t.install}</button></details><div class="pwa-update" role="status" ${!registration?.waiting ? "hidden" : ""}><span>${t.update}</span><button type="button" id="pwa-update">${t.apply}</button></div>`;
    host.querySelector("#pwa-install").onclick = async () => {
      if (!promptEvent) return;
      const event = promptEvent;
      promptEvent = null;
      render();
      try {
        await event.prompt();
        await event.userChoice;
      } catch {
        status = "error";
      }
      render();
    };
    // Updates require explicit consent so an open action form is never silently discarded.
    host.querySelector("#pwa-update").onclick = () => {
      if (!registration?.waiting) return;
      updating = true;
      registration.waiting.postMessage({ type: "SKIP_WAITING" });
    };
  }
  win.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    promptEvent = event;
    render();
  });
  win.addEventListener("appinstalled", () => {
    promptEvent = null;
    status = "installed";
    render();
  });
  for (const event of ["online", "offline", "flowpilot-language"])
    win.addEventListener(event, render);
  if (!win.isSecureContext || !("serviceWorker" in nav)) {
    status = "unsupported";
    render();
    return;
  }
  render();
  nav.serviceWorker.addEventListener("controllerchange", () => {
    if (updating) win.location.reload();
  });
  // Resolve from this module, preserving GitHub project subpaths and custom domains.
  const worker = new URL("../sw.js", import.meta.url);
  nav.serviceWorker
    .register(worker, {
      scope: new URL("./", worker).pathname,
      updateViaCache: "none",
    })
    .then((reg) => {
      registration = reg;
      const track = (installing) => {
        if (!installing) return;
        installing.addEventListener("statechange", () => {
          if (installing.state === "installed") {
            status = "ready";
            render();
          }
          if (installing.state === "redundant") {
            status = "unavailable";
            render();
          }
        });
      };
      if (reg.active || reg.waiting) status = "ready";
      track(reg.installing);
      reg.addEventListener("updatefound", () => track(reg.installing));
      render();
    })
    .catch(() => {
      status = "unavailable";
      render();
    });
}
setupPWA();
