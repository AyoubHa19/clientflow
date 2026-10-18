// ClientFlow's service worker (Stage 19). It does one thing: when opening a
// page fails because there's no connection, it shows a friendly offline
// page instead of the browser's error. It never stores pages or data
// (they're private and change all the time); only the offline page and its
// icon are kept.

const CACHE = "clientflow-offline-v1";
const OFFLINE_FILES = ["/offline.html", "/icons/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(OFFLINE_FILES)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Remove older versions of the offline cache.
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  if (request.mode === "navigate") {
    // Pages: always from the network; the offline page only if that fails.
    event.respondWith(fetch(request).catch(() => caches.match("/offline.html")));
    return;
  }
  // The offline page's icon, when offline.
  if (new URL(request.url).pathname === "/icons/icon-192.png") {
    event.respondWith(fetch(request).catch(() => caches.match(request)));
  }
});
