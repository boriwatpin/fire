// FIRE Planner service worker: makes the app installable and usable offline.
// SW_VERSION must match APP_VERSION in the HTML (deploy.sh checks this). Changing it is what
// tells installed copies that a new version exists.
const SW_VERSION = '2.4';
const CACHE = 'fire-planner-' + SW_VERSION;
const SHELL = ['./', './index.html', './fire_estimator_TH.html', './manifest.webmanifest', './manifest-th.webmanifest',
               './icon-180.png', './icon-192.png', './icon-512.png', './icon-maskable-512.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)));
  // No skipWaiting here: an open page shows "new version available" and the user chooses when to reload.
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('fire-planner-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', event => { if (event.data === 'skipWaiting') self.skipWaiting(); });

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;          // fonts, exchange rates, Excel library: straight to the network

  if (req.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('/')){
    // Pages: network first so a deploy shows up right away; fall back to the cached copy offline.
    event.respondWith(
      fetch(req).then(res => {
        if (res.ok){ const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
        return res;
      }).catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('./index.html')))
    );
    return;
  }
  // Icons and manifests: cache first.
  event.respondWith(caches.match(req, { ignoreSearch: true }).then(r => r || fetch(req).then(res => {
    if (res.ok){ const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  })));
});
