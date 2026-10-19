/// <reference lib="webworker" />
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { CacheFirst, ExpirationPlugin, NetworkFirst, Serwist } from "serwist";
import { OFFLINE_PAGE, OFFLINE_SCREENS, OFFLINE_TEMPLATES, PAGES_CACHE, PHOTOS_CACHE } from "@/lib/offline-screens";

/*
 * ana's service worker, built by Serwist (src/app/serwist/[path]/route.ts serves it at
 * /serwist/sw.js). The app's code is precached from the build's own list, so every screen's
 * scripts and styles (even ones loaded only when needed, like the moment form) are on the
 * device; old versions are cleaned up on update.
 *  - pages: network first (a few seconds), else the saved copy, kept by path (so
 *    /home?source=pwa opens /home); every screen is saved ahead on start and when the app
 *    asks; a moment or person page falls back to its template; else a plain offline page
 *  - a person's own photos from /api/media: kept on the device (whole-file images only)
 *  - images and fonts: cache first
 *  - /api and sign-in: never cached here (private; the app keeps its own encrypted copy)
 *  - push: shows reminders; a tap opens the page
 */

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}
declare const self: ServiceWorkerGlobalScope;

/** A page's place in the cache: its path alone (the query is only ever a hint). */
function pageKey(url: string) {
  const u = new URL(url, self.location.origin);
  return new Request(u.origin + u.pathname);
}

/** The template a moment's or person's page falls back to offline, if it is one. */
function templateFor(path: string) {
  return Object.entries(OFFLINE_TEMPLATES).find(([prefix]) => path.startsWith(prefix) && path.length > prefix.length)?.[1];
}

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  precacheOptions: { cleanupOutdatedCaches: true },
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      matcher: ({ request, sameOrigin, url }) => sameOrigin && request.mode === "navigate" && !url.pathname.startsWith("/api/"),
      handler: new NetworkFirst({
        cacheName: PAGES_CACHE,
        // On a weak connection, open the saved copy instead of waiting on the network.
        networkTimeoutSeconds: 5,
        plugins: [
          { cacheKeyWillBeUsed: async ({ request }) => pageKey(request.url) },
          // Only real app pages, never a redirect to sign-in.
          { cacheWillUpdate: async ({ response }) => (response.ok && !response.redirected ? response : null) },
          {
            handlerDidError: async ({ request }) => {
              const cache = await caches.open(PAGES_CACHE);
              const template = templateFor(new URL(request.url).pathname);
              return (
                (template && (await cache.match(pageKey(template)))) ||
                (await caches.match(OFFLINE_PAGE, { ignoreSearch: true })) ||
                Response.error()
              );
            },
          },
        ],
      }),
    },
    {
      // A person's own photos (whole files; audio and video stream with Range from the network).
      matcher: ({ request, sameOrigin, url }) => sameOrigin && url.pathname.startsWith("/api/media/") && !request.headers.has("range") && !url.searchParams.has("link"),
      handler: new CacheFirst({
        cacheName: PHOTOS_CACHE,
        plugins: [{ cacheWillUpdate: async ({ response }) => (response.ok && (response.headers.get("content-type") ?? "").startsWith("image/") ? response : null) }],
      }),
    },
    {
      matcher: ({ sameOrigin, url }) => sameOrigin && (/\.(?:png|jpg|jpeg|webp|svg|ico|woff2?)$/.test(url.pathname) || url.pathname.startsWith("/_next/image")),
      handler: new CacheFirst({ cacheName: "ana-images", plugins: [new ExpirationPlugin({ maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 90 })] }),
    },
  ],
});

/** Save pages ahead, a few at a time. Returns how many were saved. */
async function warm(urls: string[]) {
  const cache = await caches.open(PAGES_CACHE);
  const list = [...new Set(urls)].filter((u) => u.startsWith("/"));
  let saved = 0;
  const worker = async () => {
    for (let url = list.shift(); url; url = list.shift()) {
      try {
        const res = await fetch(url, { credentials: "same-origin", headers: { Accept: "text/html" } });
        if (!res.ok || res.redirected || !(res.headers.get("content-type") ?? "").includes("text/html")) continue;
        await cache.put(pageKey(url), res);
        saved++;
      } catch {
        return; // offline again: stop
      }
    }
  };
  await Promise.all([worker(), worker(), worker()]);
  return saved;
}

const EVERY_PAGE = [...OFFLINE_SCREENS, ...Object.values(OFFLINE_TEMPLATES)];

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // The hand-written worker before this one kept its caches under "ana-v5-…".
      for (const key of await caches.keys()) if (key.startsWith("ana-v5-")) await caches.delete(key);
      // A new version: save every screen again (signed out, nothing is kept).
      await warm(EVERY_PAGE).catch(() => 0);
    })()
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "clear") {
    event.waitUntil(caches.keys().then((ks) => Promise.all(ks.map((k) => caches.delete(k)))));
  } else if (event.data?.type === "warm" && Array.isArray(event.data.urls)) {
    // Saved, then told back: the app only counts it done once this worker says so.
    const urls = [...EVERY_PAGE, ...event.data.urls.filter((u: unknown): u is string => typeof u === "string")];
    event.waitUntil(warm(urls).then((saved) => event.ports[0]?.postMessage({ saved })));
  }
});

self.addEventListener("push", (event) => {
  let msg: { title?: string; body?: string; tag?: string; url?: string; id?: string } = {};
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
      // `renotify` isn't in every TypeScript lib yet.
      ...({ renotify: !!msg.tag } as object),
      data: { url: msg.url || "/home", id: msg.id },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/home", self.location.origin).href;
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
          if ("navigate" in w) return void (await w.navigate(target));
          return;
        }
      }
      await self.clients.openWindow(target);
    })()
  );
});

serwist.addEventListeners();
