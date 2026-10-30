/// <reference lib="webworker" />
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { CacheFirst, ExpirationPlugin, NetworkFirst, Serwist } from "serwist";
import { OFFLINE_PAGE, OFFLINE_SCREENS, OFFLINE_TEMPLATES, PAGES_CACHE, PHOTOS_CACHE } from "@/lib/offline-screens";

/*
 * ana's service worker, built by Serwist (src/app/serwist/[path]/route.ts serves it at
 * /serwist/sw.js). The app's code is precached from the build's own list, so every screen's
 * scripts and styles (even ones loaded only when needed, like the moment form) are on the
 * device; old versions are cleaned up on update.
 *  - app screens saved by this version: opened from the saved copy at once, and fetched again
 *    behind it (the next open has the new copy; one no longer allowed is dropped, and the page
 *    asking is told to load again)
 *  - other pages, and screens saved by an older version: network first (a few seconds), else
 *    the saved copy, kept by path (so /home?source=pwa opens /home); every screen is saved
 *    ahead on start and when the app asks; a moment or person page falls back to its
 *    template; else a plain offline page
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

/*
 * Saved pages are stamped with the version of the app that saved them. A page saved by an older
 * version points at that version's scripts, which are gone once this one takes over, so only
 * this version's pages open straight from the device.
 */
const STAMP = "x-ana-build";
const BUILD = (() => {
  const text = JSON.stringify(self.__SW_MANIFEST ?? []);
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
})();

/**
 * A page response worth keeping, stamped with this version; null if it isn't a real app page:
 * a redirect (to sign-in, or home when a section was switched off; once a page has started
 * streaming, Next sends a 200 that redirects from inside the page), an error, or something else.
 */
async function toKeep(res: Response): Promise<Response | null> {
  if (!res.ok || res.redirected || res.type === "opaqueredirect" || !(res.headers.get("content-type") ?? "").includes("text/html")) return null;
  const html = await res.text();
  // (In the page's own data, or as a meta tag. The server puts nothing of anyone's journal in a
  // page, so these can't come from what someone wrote.)
  if (html.includes("NEXT_REDIRECT;") || html.includes('id="__next-page-redirect"')) return null;
  const headers = new Headers(res.headers);
  headers.set(STAMP, BUILD);
  return new Response(html, { status: res.status, statusText: res.statusText, headers });
}

/** The app's own screens: these open from the device when this version saved them. */
const APP_PAGES = new Set(OFFLINE_SCREENS);
const isAppPage = (path: string) =>
  APP_PAGES.has(path) || Object.keys(OFFLINE_TEMPLATES).some((prefix) => path.startsWith(prefix) && path.length > prefix.length);

const networkFirst = new NetworkFirst({
  cacheName: PAGES_CACHE,
  // On a weak connection, open the saved copy instead of waiting on the network.
  networkTimeoutSeconds: 5,
  plugins: [
    { cacheKeyWillBeUsed: async ({ request }) => pageKey(request.url) },
    // Only real app pages, never a redirect to sign-in.
    { cacheWillUpdate: async ({ response }) => toKeep(response.clone()) },
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
});

/** Screens opened from the device and being fetched again: path → whether it was dropped. */
const refreshing = new Map<string, Promise<boolean>>();

/** Fetch a screen opened from the device again, behind it. True if it's no longer allowed (dropped). */
async function refresh(event: FetchEvent, request: Request): Promise<boolean> {
  try {
    const res = (await event.preloadResponse.catch(() => undefined)) ?? (await fetch(request));
    const cache = await caches.open(PAGES_CACHE);
    const keep = await toKeep(res);
    if (keep) {
      await cache.put(pageKey(request.url), keep);
      return false;
    }
    // Redirected (signed out, no longer approved, a section switched off) or gone: drop it, so
    // the next open asks the server. A server error leaves the saved copy be.
    if (res.status >= 500) return false;
    await cache.delete(pageKey(request.url));
    return true;
  } catch {
    return false; // offline: the saved copy is all there is
  }
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
      handler: async ({ request, event, url }) => {
        const fetchEvent = event as FetchEvent;
        // A new open of this screen: an earlier answer about it no longer applies.
        refreshing.delete(url.pathname);
        if (isAppPage(url.pathname)) {
          const saved = await caches.open(PAGES_CACHE).then((c) => c.match(pageKey(request.url)));
          if (saved && saved.headers.get(STAMP) === BUILD) {
            const done = refresh(fetchEvent, request);
            refreshing.set(url.pathname, done);
            fetchEvent.waitUntil(done);
            return saved;
          }
        }
        return networkFirst.handle({ request, event: fetchEvent });
      },
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
        const keep = await toKeep(res);
        if (!keep) continue;
        await cache.put(pageKey(url), keep);
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
  } else if (event.data?.type === "fresh?" && typeof event.data.path === "string") {
    // A screen opened from the device asks whether it's still allowed (answered once the
    // server has been asked; true means load again).
    const done = refreshing.get(event.data.path) ?? Promise.resolve(false);
    refreshing.delete(event.data.path);
    event.waitUntil(done.then((gone) => event.ports[0]?.postMessage({ gone })));
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
