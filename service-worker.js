/* ============================================
   service-worker.js — PWA Offline Support
============================================ */

const CACHE_NAME = "minha-biblioteca-v2";

// Arquivos que ficam disponíveis offline
const PRECACHE_ASSETS = [
  "./index.html",
  "./dashboard.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
];

// =============================================
// INSTALL — Pré-cache dos assets
// =============================================
self.addEventListener("install", (event) => {
  console.log("🔧 Service Worker instalando...");
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("📦 Cacheando assets...");
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => {
        console.log("✅ Cache completo!");
        return self.skipWaiting();
      })
      .catch((err) => console.error("❌ Erro ao cachear:", err))
  );
});

// =============================================
// ACTIVATE — Limpa caches antigos
// =============================================
self.addEventListener("activate", (event) => {
  console.log("🔄 Service Worker ativando...");
  event.waitUntil(
    caches
      .keys()
      .then((keys) => {
        console.log("🗑️ Limpando caches antigos...");
        return Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => {
              console.log("  Deletando:", key);
              return caches.delete(key);
            })
        );
      })
      .then(() => {
        console.log("✅ Caches limpos!");
        return self.clients.claim();
      })
  );
});

// =============================================
// FETCH — Cache-first para assets, network-first para PDFs
// =============================================
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignora requests não-GET
  if (request.method !== "GET") {
    return;
  }

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
        }).catch(() => {
          // Se falhar, tenta retornar um fallback
          if (request.destination === "document") {
            return caches.match("./index.html");
          }
        })
    )
  );
});

console.log("✅ Service Worker registrado!");

