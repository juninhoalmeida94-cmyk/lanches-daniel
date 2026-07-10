// Bump this on every deploy so old caches get cleared out automatically.
const CACHE_VERSION = "v6";
const CACHE_NAME = `daniel-lanches-os-${CACHE_VERSION}`;
const OFFLINE_URL = "./offline.html";

const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./manifest.webmanifest",
  "./offline.html",
  "./daniel-lanches-hero.png",
  "./daniel-lanches-logo.jpg",
  "./daniel-lanches-icon-192.png",
  "./daniel-lanches-icon-512.png",
  "./daniel-lanches-icon-maskable-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;

  // Only handle GET requests; let everything else (POST, etc.) pass through.
  if (request.method !== "GET") return;

  // Never cache Supabase/API/CDN cross-origin calls. Realtime and fresh API
  // responses must go straight to the network.
  if (new URL(request.url).origin !== self.location.origin) return;

  // Page navigations: try the network first so users get fresh content
  // when online, fall back to cache, then to the offline page.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          return response;
        })
        .catch(() =>
          caches.match(request).then(cached => cached || caches.match(OFFLINE_URL))
        )
    );
    return;
  }

  // Static assets: cache-first, fall back to network, and quietly
  // refresh the cache in the background (stale-while-revalidate).
  event.respondWith(
    caches.match(request).then(cached => {
      const networkFetch = fetch(request)
        .then(response => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || networkFetch;
    })
  );
});
