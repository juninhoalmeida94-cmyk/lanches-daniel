// Aumente esta versão sempre que alterar HTML, CSS ou JavaScript.
const CACHE_VERSION = "v22";
const CACHE_NAME = `daniel-lanches-os-${CACHE_VERSION}`;
const scopeUrl = new URL(self.registration.scope);
const scopedUrl = asset => new URL(asset, scopeUrl).toString();
const OFFLINE_URL = scopedUrl("offline.html");

const ASSETS = [
  "./",
  "index.html",
  "style.css",
  "script.js",
  "public-app.js",
  "env.js",
  "manifest.webmanifest",
  "offline.html",
  "404.html",
  "daniel-lanches-hero.png",
  "daniel-lanches-logo.jpg",
  "daniel-lanches-icon-192.png",
  "daniel-lanches-icon-512.png",
  "daniel-lanches-icon-maskable-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(cache =>
        Promise.allSettled(
          ASSETS.map(asset =>
            cache.add(scopedUrl(asset)).catch(error => {
              console.warn("[sw] asset ignorado no cache:", asset, error);
            })
          )
        )
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;

  if (request.method !== "GET") return;

  const requestUrl = new URL(request.url);

  // Não interceptar Supabase, CDN ou outras origens.
  if (requestUrl.origin !== self.location.origin) return;

  // Navegação: rede primeiro; em falha, index ou página offline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, copy);
            });
          }

          return response;
        })
        .catch(async () => {
          const cachedPage = await caches.match(request);
          if (cachedPage) return cachedPage;

          const indexPage = await caches.match(scopedUrl("index.html"));
          if (indexPage) return indexPage;

          return caches.match(OFFLINE_URL);
        })
    );

    return;
  }

  // Arquivos estáticos: rede primeiro para evitar arquivos antigos.
  event.respondWith(
    fetch(request)
      .then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, copy);
          });
        }

        return response;
      })
      .catch(() => caches.match(request))
  );
});
