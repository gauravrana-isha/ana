"use client";

import type { QueryClient } from "@tanstack/react-query";
import { prefetchScreen } from "./prefetch";
import { isUnlocked } from "./vault/vault";
import type { MomentsCopy } from "./journal";

/*
 * Makes the whole journal open offline. Once it's unlocked and online, every screen's data is
 * fetched (and kept on the device, sealed, with the rest of the cache) and the service worker
 * is asked to save every screen ahead, with the code it needs, plus each person's page and the
 * most recent moments. Done again after each new version of the app, or every few hours.
 */

const SCREENS = [
  "/today", "/tracker", "/daily", "/weekly", "/expressions", "/people", "/commitment", "/insights",
  "/profile", "/profile/who", "/profile/sections", "/profile/practices", "/profile/questions",
  "/profile/device", "/profile/privacy", "/profile/data",
];
const RECENT_MOMENTS = 40;
const MAX_PEOPLE = 150;
const AGAIN_AFTER = 6 * 60 * 60_000;
const KEY = "ana:offline-ready";

/** This version of the app (its main script), so a new version gets saved again. */
function version() {
  return document.querySelector<HTMLScriptElement>('script[src*="/_next/static/chunks/"]')?.src ?? "";
}

let running = false;

export async function makeReadyOffline(qc: QueryClient, opts: { force?: boolean } = {}) {
  if (running || !navigator.onLine || !isUnlocked() || !("serviceWorker" in navigator)) return;
  const v = version();
  try {
    const last = JSON.parse(localStorage.getItem(KEY) ?? "null") as { at: number; v: string } | null;
    if (!opts.force && last && last.v === v && Date.now() - last.at < AGAIN_AFTER) return;
  } catch {
    /* no record: do it */
  }
  running = true;
  try {
    // Every screen's data, into the cache that's kept on the device.
    for (const s of SCREENS) prefetchScreen(qc, s);
    const [moments, people] = await Promise.all([
      waitFor<MomentsCopy>(qc, ["moments", "all"]),
      waitFor<{ id: string }[]>(qc, ["people"]),
    ]);
    const momentIds = [...(moments?.items ?? [])]
      .sort((a, b) => String(b.occurredAt).localeCompare(String(a.occurredAt)))
      .slice(0, RECENT_MOMENTS)
      .map((m) => `/expressions/${m.id}`);
    const personIds = (Array.isArray(people) ? people : []).slice(0, MAX_PEOPLE).map((p) => `/people/${p.id}`);

    // Every screen saved ahead by the service worker, with its code.
    const reg = await navigator.serviceWorker.ready;
    reg.active?.postMessage({ type: "warm", urls: [...SCREENS, ...momentIds, ...personIds] });
    localStorage.setItem(KEY, JSON.stringify({ at: Date.now(), v }));
  } catch {
    /* tried; it'll be tried again next time */
  } finally {
    running = false;
  }
}

/** A query's data once it has arrived (or what's there after a few seconds). */
function waitFor<T>(qc: QueryClient, key: readonly unknown[], ms = 8000): Promise<T | undefined> {
  const now = qc.getQueryData<T>(key);
  if (now !== undefined && qc.getQueryState(key)?.fetchStatus !== "fetching") return Promise.resolve(now);
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(timer);
      unsub();
      resolve(qc.getQueryData<T>(key));
    };
    const unsub = qc.getQueryCache().subscribe((e) => {
      if (e.query.queryHash === JSON.stringify(key) && e.query.state.fetchStatus !== "fetching" && e.query.state.data !== undefined) done();
    });
    const timer = setTimeout(done, ms);
  });
}
