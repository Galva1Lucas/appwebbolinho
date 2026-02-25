/* ============================================
   service-worker.js — PWA Offline Support
============================================ */

const CACHE_VERSION = "v3";
const CACHE_NAME = `minha-biblioteca-${CACHE_VERSION}`;

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
  console.log(`🔧 Service Worker instalando... (${CACHE_NAME})`);
  
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("📦 Cacheando assets...");
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => {
        console.log("✅ Cache completo! Service Worker pronto");
        return self.skipWaiting();
      })
      .catch((err) => {
        console.error("❌ Erro ao cachear:", err);
        throw err;
      })
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
      .then((cacheNames) => {
        console.log("🗑️ Caches disponíveis:", cacheNames);
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => {
              console.log(`  📌 Deletando cache antigo: ${name}`);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log("✅ Caches limpas! Claiming clients...");
        return self.clients.claim();
      })
  );
});

// =============================================
// FETCH — Estratégia de cache
// =============================================
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignora requisições não-GET
  if (request.method !== "GET") {
    return;
  }

  // Ignora navegador requests ou dados locais
  if (url.protocol === "chrome-extension:" || url.protocol === "moz-extension:") {
    return;
  }

  // PDFs: sempre tenta a rede primeiro (download mais recente)
  if (url.pathname.endsWith(".pdf")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (!response || response.status !== 200) {
            return caches.match(request);
          }
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => {
          console.log(`📄 PDF offline: ${request.url}`);
          return caches.match(request);
        })
    );
    return;
  }

  // Outros assets: cache-first, fallback para rede
  event.respondWith(
    caches
      .match(request)
      .then((cached) => {
        if (cached) {
          console.log(`💾 Cache hit: ${request.url}`);
          return cached;
        }

        return fetch(request).then((response) => {
          if (!response || response.status !== 200) {
            throw new Error(`Bad response: ${response.status}`);
          }

          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, clone);
          });

          return response;
        });
      })
      .catch(() => {
        console.log(`🚫 Offline (sem cache): ${request.url}`);
        
        // Retorna página offline para document requests
        if (request.destination === "document") {
          return caches.match("./index.html");
        }
        
        // Retorna resposta vazia para outros tipos
        return new Response("Offline - recurso não disponível", {
          status: 503,
          statusText: "Service Unavailable",
        });
      })
  );
});

// Log quando o service worker está pronto
console.log("✅ Service Worker carregado e pronto!");
self.addEventListener("controllerchange", () => {
  console.log("✅ Service Worker agora está controlando a página");
});

