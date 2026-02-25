/* ============================================
   service-worker.js — PWA Offline Support
============================================ */

const CACHE_NAME = "minha-biblioteca-v1";

// Arquivos que ficam disponíveis offline
const PRECACHE_ASSETS = [
  "/public/index.html",
  "/public/dashboard.html",
  "/public/style.css",
  "/public/app.js",
  "/manifest.json",
];

// =============================================
// INSTALL — Pré-cache dos assets
// =============================================
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// =============================================
// ACTIVATE — Limpa caches antigos
// =============================================
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// =============================================
// FETCH — Cache-first para assets, network-first para PDFs
// =============================================
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // PDFs: sempre tenta a rede primeiro (download mais recente)
  if (url.pathname.endsWith(".pdf")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Outros assets: cache-first
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
    )
  );
});
