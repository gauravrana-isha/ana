/*
 * ana service worker. Small and explicit:
 *  - pages: network first, last good copy when offline (kept by path, so /today?source=pwa
 *    opens /today). Once unlocked and online, the app asks for every screen (and recent
 *    moments and people) to be saved ahead, with their code, so the whole app opens offline.
 *    A page that was never saved shows a plain "not on this phone yet" page, never another one.
 *  - /_next/static: cache first (file names change every build)
 *  - images, fonts, icons: cache first
 *  - /api and auth: never cached here (private data; the app keeps its own cache, cleared on sign-out),
 *    except a person's own photos from /api/media: kept on the device so avatars appear at once
 *    (whole-file image requests only; audio and video stream with Range and go to the network)
 *  - push: shows reminders (moments coming back, the commitment letter); a tap opens the page
 * On localhost it only handles push, so development builds are never served from cache.
 */
const VERSION = "ana-v5";
const DEV = self.location.hostname === "localhost" || self.location.hostname === "127.0.0.1";
const PAGES = `${VERSION}-pages-2`;
/** Shown offline for a page this device never saved. */
const OFFLINE_PAGE = "/offline.html";
const STATIC = `${VERSION}-static`;
/** Images, fonts and icons (renamed when the app icon changes, so the new one is fetched). */
const MEDIA = `${VERSION}-media-2`;
/** People's own photos (private; cleared with everything else on sign-out). */
const PHOTOS = `${VERSION}-photos`;

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(PAGES).then((c) => c.add(OFFLINE_PAGE)).catch(() => {}));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([PAGES, STATIC, MEDIA, PHOTOS]);
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

async function cachePhoto(request) {
  const cache = await caches.open(PHOTOS);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok && (res.headers.get("content-type") || "").startsWith("image/")) cache.put(request, res.clone());
  return res;
}

/** A page's place in the cache: its path alone (the query is only ever a hint like ?source=pwa). */
function pageKey(url) {
  const u = new URL(url, self.location.origin);
  return new Request(u.origin + u.pathname);
}

async function networkFirstPage(request) {
  const cache = await caches.open(PAGES);
  try {
    const res = await fetch(request);
    // Only keep real app pages, never redirects to sign-in.
    if (res.ok && !res.redirected) cache.put(pageKey(request.url), res.clone());
    return res;
  } catch {
    return (await cache.match(pageKey(request.url))) || (await cache.match(OFFLINE_PAGE)) || Response.error();
  }
}

/** The app's code a saved page needs (its scripts and styles), so it runs offline too. */
async function keepAssets(html) {
  const cache = await caches.open(STATIC);
  const urls = [...new Set(html.match(/\/_next\/static\/[^"'\s)\\]+\.(?:js|css)/g) || [])];
  await Promise.all(
    urls.map(async (u) => {
      if (await cache.match(u)) return;
      const res = await fetch(u).catch(() => null);
      if (res && res.ok) await cache.put(u, res);
    })
  );
}

/** Save pages ahead (asked by the app once it's unlocked and online), a few at a time. */
async function warm(urls) {
  const cache = await caches.open(PAGES);
  const list = [...urls];
  const worker = async () => {
    for (let url = list.shift(); url; url = list.shift()) {
      try {
        const res = await fetch(url, { credentials: "same-origin", headers: { Accept: "text/html" } });
        if (!res.ok || res.redirected || !(res.headers.get("content-type") || "").includes("text/html")) continue;
        await keepAssets(await res.clone().text());
        await cache.put(pageKey(url), res);
      } catch {
        return; // offline again: stop
      }
    }
  };
  await Promise.all([worker(), worker(), worker()]);
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (DEV || request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/media/") && !request.headers.has("range")) {
    event.respondWith(cachePhoto(request));
    return;
  }
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
  else if (event.data && event.data.type === "warm" && Array.isArray(event.data.urls)) event.waitUntil(warm(event.data.urls.filter((u) => typeof u === "string" && u.startsWith("/"))));
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
