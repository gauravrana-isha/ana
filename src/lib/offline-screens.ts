/*
 * What's kept on the device for offline use. Shared by the app and the service worker (which
 * is bundled from src/app/sw.ts), so the two lists can't drift apart.
 */

/** Every screen, saved ahead so the whole app opens offline. */
export const OFFLINE_SCREENS = [
  "/today", "/tracker", "/daily", "/weekly", "/expressions", "/people", "/commitment", "/insights",
  "/profile", "/profile/who", "/profile/sections", "/profile/practices", "/profile/questions",
  "/profile/device", "/profile/privacy", "/profile/data",
  // Admins only (anyone else is turned away, and nothing is kept).
  "/admin",
];

/**
 * A moment's and a person's page, kept once as a template: those pages read their id from the
 * address, so offline one saved copy opens any moment or person (even one made offline).
 */
export const OFFLINE_TEMPLATES: Record<string, string> = { "/expressions/": "/expressions/~", "/people/": "/people/~" };

/** Shown offline for a page this device never saved. */
export const OFFLINE_PAGE = "/offline.html";

/** Saved pages, by path. */
export const PAGES_CACHE = "ana-pages";

/** A person's own photos (private; cleared with everything else on sign-out). */
export const PHOTOS_CACHE = "ana-photos";
