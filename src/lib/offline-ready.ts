"use client";

import type { QueryClient } from "@tanstack/react-query";
import { prefetchScreen } from "./prefetch";
import { OFFLINE_SCREENS } from "./offline-screens";
import { isUnlocked } from "./vault/vault";
import { preloadMomentComposer } from "@/components/moments/LazyMomentComposer";
import type { MomentsCopy } from "./journal";

/*
 * Makes the whole journal open offline. Once it's unlocked and online, every screen's data is
 * fetched (and kept on the device, sealed, with the rest of the cache) and the service worker
 * is asked to save every screen ahead, with the code it needs, plus each person's page and the
 * most recent moments. Done again after each new version of the app, or every few hours.
 */

const RECENT_MOMENTS = 40;
const MAX_PEOPLE = 150;
const AGAIN_AFTER = 6 * 60 * 60_000;
const KEY = "ana:offline-ready";

/** This version of the app (its main script), so a new version gets saved again. */
function version() {
  return document.querySelector<HTMLScriptElement>('script[src*="/_next/static/chunks/"]')?.src ?? "";
}

let running = false;

/** When everything was last saved for offline use (ms), if it has been. */
export function lastReadyAt(): number | null {
  try {
    return (JSON.parse(localStorage.getItem(KEY) ?? "null") as { at: number } | null)?.at ?? null;
  } catch {
    return null;
  }
}

/** Save everything for offline use. True once the service worker has saved the screens. */
export async function makeReadyOffline(qc: QueryClient, opts: { force?: boolean } = {}): Promise<boolean> {
  if (running || !navigator.onLine || !isUnlocked() || !("serviceWorker" in navigator)) return false;
  const v = version();
  try {
    const last = JSON.parse(localStorage.getItem(KEY) ?? "null") as { at: number; v: string } | null;
    if (!opts.force && last && last.v === v && Date.now() - last.at < AGAIN_AFTER) return true;
  } catch {
    /* no record: do it */
  }
  running = true;
  // Ask the browser to keep ana's storage for good: otherwise a phone short on space may clear
  // it (the journal kept on the device, saves waiting to be sent, the saved screens).
  void navigator.storage?.persist?.().catch(() => false);
  try {
    // Every screen's data, into the cache that's kept on the device, and the code loaded only
    // when it's needed (the moment form), so it opens offline too.
    for (const s of OFFLINE_SCREENS) prefetchScreen(qc, s);
    void preloadMomentComposer().catch(() => {});
    const [moments, people] = await Promise.all([
      waitFor<MomentsCopy>(qc, ["moments", "all"]),
      waitFor<{ id: string }[]>(qc, ["people"]),
    ]);
    const momentIds = [...(moments?.items ?? [])]
      .sort((a, b) => String(b.occurredAt).localeCompare(String(a.occurredAt)))
      .slice(0, RECENT_MOMENTS)
      .map((m) => `/moments/${m.id}`);
    const personIds = (Array.isArray(people) ? people : []).slice(0, MAX_PEOPLE).map((p) => `/presence/${p.id}`);

    // Every screen saved ahead by the service worker, with its code. Counted done only once
    // the worker says so (an older worker, mid-update, can't, and then it's asked again).
    const reg = await navigator.serviceWorker.ready;
    const saved = await askWorker(reg.active, { type: "warm", urls: [...momentIds, ...personIds] });
    if (saved > 0) localStorage.setItem(KEY, JSON.stringify({ at: Date.now(), v }));
    return saved > 0;
  } catch {
    return false; // tried; it'll be tried again next time
  } finally {
    running = false;
  }
}

/** Send the worker a request and wait for its answer (0 if it doesn't answer in time). */
function askWorker(worker: ServiceWorker | null, message: unknown, ms = 90_000): Promise<number> {
  if (!worker) return Promise.resolve(0);
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    const timer = setTimeout(() => resolve(0), ms);
    channel.port1.onmessage = (e) => {
      clearTimeout(timer);
      resolve(Number(e.data?.saved) || 0);
    };
    worker.postMessage(message, [channel.port2]);
  });
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
