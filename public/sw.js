/*
 * ana service worker. Small and explicit:
 *  - pages: network first, last good copy when offline
 *  - /_next/static: cache first (file names change every build)
 *  - images, fonts, icons: cache first
 *  - /api and auth: never cached here (private data; the app keeps its own cache, cleared on sign-out)
 *  - push: shows reminders (moments coming back, the commitment letter); a tap opens the page
 * On localhost it only handles push, so development builds are never served from cache.
 */
const VERSION = "ana-v4";
const DEV = self.location.hostname === "localhost" || self.location.hostname === "127.0.0.1";
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
  if (DEV || request.method !== "GET") return;
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

self.addEventListener("push", (event) => {
  let msg = {};
  try {
    msg = event.data ? event.data.json() : {};
  } catch {
    msg = { body: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    self.registration.showNotification(msg.title || "ana", {
      body: msg.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-96.png",
      tag: msg.tag,
      renotify: !!msg.tag,
      data: { url: msg.url || "/today", id: msg.id },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/today", self.location.origin).href;
  const id = event.notification.data?.id;
  event.waitUntil(
    (async () => {
      // Opened from the phone's tray: it's read in the bell too.
      if (id) {
        fetch("/api/notifications", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: [id] }) }).catch(() => {});
      }
      const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const w of wins) {
        if (new URL(w.url).origin === self.location.origin) {
          await w.focus();
          if ("navigate" in w) return w.navigate(target);
          return;
        }
      }
      return self.clients.openWindow(target);
    })()
  );
});
