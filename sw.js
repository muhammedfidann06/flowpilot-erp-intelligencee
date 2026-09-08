/** Generated service worker: one complete release per cache, isolated to this deployment scope. */
const PREFIX = 'flowpilot:' + self.registration.scope + ':';
const CACHE = PREFIX + '56e68e5cfaf539f6';
const ASSETS = ["index.html","data.json","manifest.webmanifest","src/data.js","src/engine.js","src/favicon.svg","src/i18n.js","src/main.js","src/pwa.js","src/styles.css","icons/apple-touch-icon.png","icons/icon-192.png","icons/icon-512.png","icons/maskable-512.png"].map(path => new URL(path, self.registration.scope).href);
const SHELL = new URL('index.html', self.registration.scope).href;
self.addEventListener('install', event => {
  // addAll is atomic: a missing asset must fail installation, not create a partially usable release.
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS.map(url => new Request(url, {cache:'reload'})))));
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key.startsWith(PREFIX) && key !== CACHE) await caches.delete(key);
    await self.clients.claim();
  })());
});
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
self.addEventListener('fetch', event => {
  const request = event.request, url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || !url.href.startsWith(self.registration.scope)) return;
  // Only the entrypoint and known assets are intercepted. APIs, other repositories and missing files keep normal HTTP semantics.
  const entry = url.pathname === new URL(self.registration.scope).pathname || url.pathname === new URL(SHELL).pathname;
  if (request.mode === 'navigate' && entry) {
    event.respondWith(caches.open(CACHE).then(async cache => (await cache.match(SHELL)) || fetch(request)));
  } else if (ASSETS.includes(url.href)) {
    event.respondWith(caches.open(CACHE).then(async cache => (await cache.match(request)) || fetch(request)));
  }
});
