/** Exercise the real service-worker code under deterministic network and cache failures. */
import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
const source = readFileSync(new URL("../sw.js", import.meta.url), "utf8");
function worker(scope = "https://example.org/flowpilot-erp-intelligence/") {
  const handlers = {},
    stores = new Map();
  let offline = false,
    claimed = false,
    skipped = false;
  const key = (req) => (typeof req === "string" ? req : req.url);
  const fetcher = async (req) => {
    if (offline) throw Error("offline");
    return new Response(key(req));
  };
  const caches = {
    keys: async () => [...stores.keys()],
    delete: async (k) => stores.delete(k),
    open: async (k) => {
      if (!stores.has(k)) stores.set(k, new Map());
      const store = stores.get(k);
      return {
        addAll: async (requests) => {
          const responses = await Promise.all(requests.map(fetcher));
          requests.forEach((r, i) => store.set(key(r), responses[i]));
        },
        match: async (req) => store.get(key(req))?.clone(),
      };
    },
  };
  const self = {
    registration: { scope },
    location: { origin: new URL(scope).origin },
    clients: {
      claim: async () => {
        claimed = true;
      },
    },
    skipWaiting: () => {
      skipped = true;
    },
    addEventListener: (name, fn) => {
      handlers[name] = fn;
    },
  };
  vm.runInNewContext(source, { self, caches, Request, URL, fetch: fetcher });
  return {
    stores,
    caches,
    scope,
    setOffline: () => {
      offline = true;
    },
    get claimed() {
      return claimed;
    },
    get skipped() {
      return skipped;
    },
    async lifecycle(name) {
      let promise;
      handlers[name]({
        waitUntil: (p) => {
          promise = p;
        },
      });
      await promise;
    },
    message(data) {
      handlers.message({ data });
    },
    async request(path, mode = "cors", method = "GET") {
      let result;
      handlers.fetch({
        request: { url: new URL(path, scope).href, mode, method },
        respondWith: (p) => {
          result = p;
        },
      });
      return result;
    },
  };
}
test("offline entry, hash-route shell, modules and JSON survive at a repository subpath", async () => {
  const w = worker();
  await w.lifecycle("install");
  await w.lifecycle("activate");
  w.setOffline();
  assert.equal(w.claimed, true);
  for (const file of [
    "./",
    "./?source=installed",
    "index.html",
    "src/main.js",
    "src/pwa.js",
    "data.json",
    "icons/icon-192.png",
  ]) {
    const response = await w.request(
      file,
      file.startsWith("./") || file === "index.html" ? "navigate" : "cors",
    );
    assert.equal(response.status, 200);
    assert.ok((await response.text()).startsWith(w.scope));
  }
});
test("activation deletes only old caches belonging to this exact repository", async () => {
  const w = worker();
  await w.caches.open("flowpilot:" + w.scope + ":old");
  await w.caches.open("flowpilot:https://example.org/another/:old");
  await w.caches.open("unrelated-cache");
  await w.lifecycle("install");
  await w.lifecycle("activate");
  assert.equal(w.stores.has("flowpilot:" + w.scope + ":old"), false);
  assert.equal(
    w.stores.has("flowpilot:https://example.org/another/:old"),
    true,
  );
  assert.equal(w.stores.has("unrelated-cache"), true);
});
test("unknown files, APIs, POST and other origins are not cached or replaced by HTML", async () => {
  const w = worker();
  await w.lifecycle("install");
  for (const [path, mode, method] of [
    ["missing.js", "cors", "GET"],
    ["api/orders", "cors", "GET"],
    ["missing-page", "navigate", "GET"],
    ["https://external.org/", "navigate", "GET"],
    ["../another/", "navigate", "GET"],
    ["data.json", "cors", "POST"],
  ])
    assert.equal(await w.request(path, mode, method), undefined);
});
test("failed precache rejects installation and does not activate a partial release", async () => {
  const w = worker();
  w.setOffline();
  await assert.rejects(w.lifecycle("install"), /offline/);
  assert.equal(w.claimed, false);
});
test("waiting update only activates on the explicit supported message", () => {
  const w = worker();
  w.message({ type: "UNKNOWN" });
  assert.equal(w.skipped, false);
  w.message({ type: "SKIP_WAITING" });
  assert.equal(w.skipped, true);
});
test("root-domain deployment also supports offline entry", async () => {
  const w = worker("https://example.org/");
  await w.lifecycle("install");
  w.setOffline();
  assert.equal((await w.request("./", "navigate")).status, 200);
});
// Browser-install APIs are mocked here; physical device installation is documented as a separate manual check.
globalThis.window = new JSDOM('<html lang="tr"><body></body></html>', {
  url: "https://example.org/repo/",
}).window;
const { setupPWA, messages } = await import("../src/pwa.js");
function ui(secure = false) {
  const win = new JSDOM(
    '<html lang="tr"><body><aside id="pwa"></aside></body></html>',
    { url: "https://example.org/repo/" },
  ).window;
  Object.defineProperty(win, "isSecureContext", { value: secure });
  return win;
}
test("PWA translations have matching complete keys", () => {
  for (const lang of ["tr", "de"])
    assert.deepEqual(
      Object.keys(messages[lang]).sort(),
      Object.keys(messages.en).sort(),
    );
});
test("unsupported contexts retain ERP and give translated offline guidance", () => {
  const w = ui();
  setupPWA(w);
  assert.ok(w.document.body.textContent.includes(messages.tr.unsupported));
  w.document.documentElement.lang = "de";
  w.dispatchEvent(new w.Event("flowpilot-language"));
  assert.ok(w.document.body.textContent.includes(messages.de.unsupported));
});
test("offline banner follows connection events and install event is used only once", async () => {
  const w = ui();
  setupPWA(w);
  Object.defineProperty(w.navigator, "onLine", { value: false });
  w.dispatchEvent(new w.Event("offline"));
  assert.equal(w.document.querySelector(".pwa-offline").hidden, false);
  let calls = 0;
  const event = new w.Event("beforeinstallprompt", { cancelable: true });
  event.prompt = async () => {
    calls++;
  };
  event.userChoice = Promise.resolve({ outcome: "dismissed" });
  w.dispatchEvent(event);
  assert.equal(event.defaultPrevented, true);
  w.document.querySelector("#pwa-install").click();
  await new Promise(setImmediate);
  assert.equal(calls, 1);
  assert.equal(w.document.querySelector("#pwa-install").hidden, true);
});
test("registration failure remains nonfatal and is visible", async () => {
  const w = ui(true);
  Object.defineProperty(w.navigator, "serviceWorker", {
    value: {
      addEventListener() {},
      register: async () => {
        throw Error("storage blocked");
      },
    },
  });
  setupPWA(w);
  await new Promise(setImmediate);
  assert.ok(w.document.body.textContent.includes(messages.tr.unavailable));
});
test("update prompt waits for explicit save confirmation", async () => {
  const w = ui(true);
  let message;
  Object.defineProperty(w.navigator, "serviceWorker", {
    value: {
      addEventListener() {},
      register: async () => ({
        waiting: {
          postMessage: (m) => {
            message = m;
          },
        },
        addEventListener() {},
      }),
    },
  });
  setupPWA(w);
  await new Promise(setImmediate);
  assert.equal(w.document.querySelector(".pwa-update").hidden, false);
  assert.equal(message, undefined);
  w.document.querySelector("#pwa-update").click();
  assert.equal(message.type, "SKIP_WAITING");
});
