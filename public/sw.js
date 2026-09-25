/*
 * ana service worker. Small and explicit:
 *  - pages: network first, last good copy when offline
 *  - /_next/static: cache first (file names change every build)
 *  - images, fonts, icons: cache first
 *  - /api and auth: never cached here (private data; the app keeps its own cache, cleared on sign-out)
 */
const VERSION = "ana-v3";
const PAGES = `${VERSION}-pages`;
const STATIC = `${VERSION}-static`;
const MEDIA = `${VERSION}-media`;

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([PAGES, STATIC, MEDIA]);
      for (const key of await caches.keys()) if (!keep.has(key)) await caches.delete(key);
      await self.clients.claim();
    })()
  );
});

async function cacheFirst(cacheName, request) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok) cache.put(request, res.clone());
  return res;
}

async function networkFirstPage(request) {
  const cache = await caches.open(PAGES);
  try {
    const res = await fetch(request);
    // Only keep real app pages, never redirects to sign-in.
    if (res.ok && !res.redirected) cache.put(request, res.clone());
    return res;
  } catch {
    return (await cache.match(request)) || (await cache.match("/today")) || Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirstPage(request));
  } else if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(STATIC, request));
  } else if (/\.(png|jpg|jpeg|webp|svg|ico|woff2?)$/.test(url.pathname) || url.pathname.startsWith("/_next/image")) {
    event.respondWith(cacheFirst(MEDIA, request));
  }
});

self.addEventListener("message", (event) => {
  if (event.data === "clear") event.waitUntil(caches.keys().then((ks) => Promise.all(ks.map((k) => caches.delete(k)))));
});
