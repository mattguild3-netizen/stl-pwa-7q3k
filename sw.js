// Sea-Time Logbook service worker: keeps the app shell available offline once it has been opened over https.
// The build stamps VERSION and SHELL; a new VERSION installs in the background and waits until the user taps
// "Reload" on the "New version available" banner (or every tab of the app is closed).
// Only same-origin app files are handled here. Map tiles are fetched cross-origin and cached by the app itself in
// IndexedDB (map.js), so this worker never touches them. User data lives in localStorage, never in this cache.
const VERSION = "77ea5f76e3ff";
const SHELL = ["./", "index.html", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png"];
const CACHE = "seatime-shell-" + VERSION;

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: "reload" })))));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith("seatime-") && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("message", e => { if (e.data && e.data.type === "SKIP_WAITING") self.skipWaiting(); });

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;           // map tiles and anything else off-site: untouched
  if (req.mode === "navigate") {                               // opening the app (any path in scope) -> the cached app
    e.respondWith(caches.open(CACHE).then(c => c.match(SHELL[0]).then(r => r || fetch(req))));
    return;
  }
  e.respondWith(caches.open(CACHE).then(c => c.match(req, { ignoreSearch: true }).then(r => r || fetch(req))));
});
