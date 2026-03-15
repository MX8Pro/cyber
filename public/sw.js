const VERSION = "v4";
const SHELL_CACHE = `cashier-shell-${VERSION}`;
const DOCUMENT_CACHE = `cashier-documents-${VERSION}`;
const RUNTIME_CACHE = `cashier-runtime-${VERSION}`;
const SHELL_ASSETS = ["/", "/login", "/admin/login", "/worker/login", "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => ![SHELL_CACHE, DOCUMENT_CACHE, RUNTIME_CACHE].includes(key))
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(networkFirst(event.request, DOCUMENT_CACHE, "/worker/login"));
    return;
  }

  if (url.pathname.startsWith("/api/public/workers")) {
    event.respondWith(staleWhileRevalidate(event.request, RUNTIME_CACHE));
    return;
  }

  if (url.pathname.startsWith("/_next/static/") || ["script", "style", "font", "image"].includes(event.request.destination)) {
    event.respondWith(staleWhileRevalidate(event.request, RUNTIME_CACHE));
    return;
  }

  event.respondWith(cacheFirst(event.request, RUNTIME_CACHE));
});

async function networkFirst(request, cacheName, fallbackPath) {
  const cache = await caches.open(cacheName);

  try {
    const response = await fetch(request);
    if (response && response.ok) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }

    const fallback = await caches.match(fallbackPath);
    if (fallback) {
      return fallback;
    }

    throw new Error("OFFLINE_FALLBACK_NOT_AVAILABLE");
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const networkPromise = fetch(request)
    .then(async (response) => {
      if (response && response.ok) {
        await cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached);

  return cached || networkPromise;
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) {
    return cached;
  }

  const response = await fetch(request);
  if (response && response.ok) {
    await cache.put(request, response.clone());
  }
  return response;
}
