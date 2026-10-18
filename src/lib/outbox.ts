"use client";

import { useSyncExternalStore } from "react";
import { get, set } from "idb-keyval";
import { clearPendingMedia, flushMedia, pendingMediaCount, waitingMediaBytes } from "./media-outbox";

/*
 * Writes that can wait for a connection. A save made offline (or when the network drops
 * mid-request) is kept here, already sealed, and sent in order once ana is back online; the
 * screen shows the change straight away. Creates carry their own id, so a write that did
 * reach the server before the connection dropped is simply applied again, not doubled.
 */

export interface Pending {
  id: string;
  url: string;
  method: string;
  body: string | null;
  at: number;
  /** The server turned it down (kept, to try again or remove). */
  refused?: { status: number; at: number };
}

/** How far the current send has got, by size (bytes), and what's going now. */
export interface SendProgress {
  total: number;
  done: number;
  /** What's going up right now: a save's key, or a file's id. */
  current: string | null;
  /** How far the current file has got (0–100). */
  currentPct: number;
}

const KEY = "ana-outbox";
const HELD_KEY = "ana-outbox-held";
const listeners = new Set<() => void>();
let queue: Pending[] = [];
// Saves the server refused: kept aside (they don't hold up the rest) until tried again or removed.
let held: Pending[] = [];
// Unchanging copies for React (the lists above change in place).
let shown: { queue: Pending[]; held: Pending[] } = { queue: [], held: [] };
let progress: SendProgress | null = null;
const progressListeners = new Set<() => void>();
let loaded: Promise<void> | null = null;
let flushing: Promise<FlushResult> | null = null;
let onSynced: (() => void) | null = null;
let onRejected: ((p: Pending, status: number) => void) | null = null;
let onMediaRefused: ((kind: string, reason: string) => void) | null = null;
const flushedListeners = new Set<(result: FlushResult) => void>();

/** Told after each send of what was waiting (how many went, how many are left). */
export function onFlushed(cb: (result: FlushResult) => void) {
  flushedListeners.add(cb);
  return () => {
    flushedListeners.delete(cb);
  };
}

function emit() {
  shown = { queue: queue.slice(), held: held.slice() };
  listeners.forEach((l) => l());
}

function setProgress(p: SendProgress | null) {
  progress = p;
  progressListeners.forEach((l) => l());
}

function load() {
  loaded ??= Promise.all([get<Pending[]>(KEY), get<Pending[]>(HELD_KEY)])
    .then(([q, h]) => {
      queue = [...(q ?? []), ...queue];
      held = [...(h ?? []), ...held];
      emit();
    })
    .catch(() => {});
  return loaded;
}

async function save() {
  await Promise.all([set(KEY, queue), set(HELD_KEY, held)]).catch(() => {});
  emit();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  void load();
  return () => {
    listeners.delete(cb);
  };
}

/** How many saves are waiting to be sent. */
export function usePendingCount() {
  return useSyncExternalStore(subscribe, () => shown.queue.length, () => 0);
}

const NONE = { queue: [] as Pending[], held: [] as Pending[] };
/** The saves waiting to be sent, and those the server refused (live). */
export function usePendingSaves() {
  return useSyncExternalStore(subscribe, () => shown, () => NONE);
}

/** How far the current send has got (null when nothing is being sent). */
export function useSendProgress() {
  return useSyncExternalStore(
    (cb) => {
      progressListeners.add(cb);
      return () => progressListeners.delete(cb);
    },
    () => progress,
    () => null
  );
}

/** Everything waiting or refused, saves and files (signing out asks first). */
export async function waitingCount() {
  await load();
  return queue.length + held.length + (await pendingMediaCount({ refused: true }));
}

/** Send a refused save again (after whatever stopped it is fixed). */
export async function retrySave(id: string) {
  await load();
  const p = held.find((x) => x.id === id);
  if (!p) return;
  held = held.filter((x) => x !== p);
  queue.push({ ...p, refused: undefined });
  await save();
  if (navigator.onLine) await flush();
}

/** Give up on a refused save. */
export async function removeSave(id: string) {
  await load();
  held = held.filter((x) => x.id !== id);
  await save();
}

/** What to do after a flush: refresh what's on screen; tell about a save the server refused. */
export function configureOutbox(opts: { onSynced: () => void; onRejected: (p: Pending, status: number) => void; onMediaRefused?: (kind: string, reason: string) => void }) {
  onSynced = opts.onSynced;
  onRejected = opts.onRejected;
  onMediaRefused = opts.onMediaRefused ?? null;
}

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

/** A new id for something made on this device (accepted by the server for creates). */
export function newId() {
  const bytes = crypto.getRandomValues(new Uint8Array(15));
  return "c" + Array.from(bytes, (b) => (b % 36).toString(36)).join("") + Date.now().toString(36).slice(-4);
}

/**
 * Send a write. With `queue`, a network failure (or being offline) keeps it for later and
 * resolves as `{ queued: true }`; otherwise errors throw. Server refusals always throw.
 */
export async function send<T = unknown>(
  url: string,
  method: string,
  body?: unknown,
  opts: { queue?: boolean } = {}
): Promise<{ queued: true; data: null } | { queued: false; data: T }> {
  const payload = body === undefined ? null : JSON.stringify(body);
  await load();
  // Keep order: while earlier saves are waiting, later ones wait behind them.
  if (opts.queue && (queue.length > 0 || !navigator.onLine)) {
    await enqueue(url, method, payload);
    if (navigator.onLine) void flush();
    return { queued: true, data: null };
  }
  let res: Response;
  try {
    res = await fetch(url, { method, headers: payload ? { "Content-Type": "application/json" } : undefined, body: payload });
  } catch (e) {
    if (!opts.queue) throw e;
    await enqueue(url, method, payload);
    return { queued: true, data: null };
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new HttpError(res.status, (data as { error?: string }).error ?? "Something went wrong. Please try again.");
  return { queued: false, data: data as T };
}

async function enqueue(url: string, method: string, body: string | null) {
  queue.push({ id: newId(), url, method, body, at: Date.now() });
  await save();
}

type FlushResult = { sent: number; left: number };

/** Send what's waiting, oldest first. Stops at the first network failure (tries again later). */
export function flush(): Promise<FlushResult> {
  flushing ??= (async () => {
    await load();
    let sent = 0;
    // Progress is by size: a video counts for far more than a tick.
    const total = (await waitingMediaBytes()) + queue.reduce((n, p) => n + sizeOf(p), 0);
    let done = 0;
    if (total > 0) setProgress({ total, done, current: null, currentPct: 0 });
    // Photos, voice notes and videos first: the saves below may name them.
    try {
      sent += await flushMedia((kind, reason) => onMediaRefused?.(kind, reason), (id, pct, bytes) => {
        setProgress({ total, done: done + (bytes * pct) / 100, current: id, currentPct: pct });
        if (pct >= 100) done += bytes;
      });
    } catch {
      setProgress(null);
      return { sent: 0, left: queue.length }; // still offline: everything waits
    }
    while (queue.length) {
      const p = queue[0];
      setProgress({ total, done, current: p.id, currentPct: 0 });
      let status: number;
      try {
        const res = await fetch(p.url, { method: p.method, headers: p.body ? { "Content-Type": "application/json" } : undefined, body: p.body });
        status = res.status;
      } catch {
        break; // still offline
      }
      // Signed out, rate-limited or the server is struggling: keep it and try later.
      if (status === 401 || status === 408 || status === 429 || status >= 500) break;
      queue.shift();
      done += sizeOf(p);
      // Deleting something already gone is done, not refused.
      if (status >= 400 && !(p.method === "DELETE" && status === 404)) {
        held.push({ ...p, refused: { status, at: Date.now() } });
        await save();
        onRejected?.(p, status);
      } else {
        await save();
        sent++;
      }
    }
    setProgress(null);
    if (sent) onSynced?.();
    const result = { sent, left: queue.length };
    flushedListeners.forEach((l) => l(result));
    return result;
  })().finally(() => {
    flushing = null;
  });
  return flushing;
}

/** A save's size, for progress (a little for the request itself). */
const sizeOf = (p: Pending) => (p.body?.length ?? 0) + 200;

/** Forget everything waiting (signing out). */
export async function clearOutbox() {
  queue = [];
  held = [];
  await save();
  await clearPendingMedia();
}

if (typeof window !== "undefined") {
  window.addEventListener("online", () => void flush());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && navigator.onLine) void flush();
  });
}
