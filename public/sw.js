/**
 * Longevify Service Worker — offline shell + asset cache.
 *
 * Estratégias por tipo de request:
 *  - HTML pages: network-first, fallback offline shell
 *  - Static assets (JS/CSS/imagens): stale-while-revalidate
 *  - API requests: network-only (sem cache, evita stale auth/data)
 *
 * Bump CACHE_VERSION quando quiser invalidar tudo (deploy major).
 */

const CACHE_VERSION = "longevify-v1";
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const OFFLINE_URL = "/offline.html";

const PRECACHE_ASSETS = [
  "/offline.html",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (k) => k !== CACHE_VERSION && k !== RUNTIME_CACHE,
            )
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Só intercepta GETs same-origin
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // API requests — network-only (auth-sensitive)
  if (url.pathname.startsWith("/api/")) return;

  // Auth routes — network-only (cookies-sensitive)
  if (
    url.pathname.startsWith("/login") ||
    url.pathname.startsWith("/signup") ||
    url.pathname.startsWith("/auth/") ||
    url.pathname.startsWith("/logout") ||
    url.pathname.startsWith("/reset-password") ||
    url.pathname.startsWith("/update-password")
  ) {
    return;
  }

  // Navigation requests (HTML) — network-first com fallback offline
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          // Não cacheia páginas autenticadas (RSC payloads)
          if (
            res.headers.get("cache-control")?.includes("no-store") ||
            url.searchParams.has("_rsc")
          ) {
            return res;
          }
          return res;
        })
        .catch(() => caches.match(OFFLINE_URL)),
    );
    return;
  }

  // Static assets — stale-while-revalidate
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    /\.(js|css|woff2?|png|jpg|jpeg|svg|webp|ico)$/i.test(url.pathname)
  ) {
    event.respondWith(
      caches.open(RUNTIME_CACHE).then((cache) =>
        cache.match(request).then((cached) => {
          const fetchPromise = fetch(request)
            .then((res) => {
              if (res && res.status === 200) {
                cache.put(request, res.clone());
              }
              return res;
            })
            .catch(() => cached);
          return cached || fetchPromise;
        }),
      ),
    );
    return;
  }
});

// Push notifications — handled when nativo via Capacitor, mas
// fallback web push aqui pra PWA standalone install.
self.addEventListener("push", (event) => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title || "Longevify", {
      body: data.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: data.url ? { url: data.url } : undefined,
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/home";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && "focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    }),
  );
});
