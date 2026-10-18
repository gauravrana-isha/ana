"use client";

import { useSyncExternalStore } from "react";
import { get, set } from "idb-keyval";
import { clearPendingMedia, flushMedia } from "./media-outbox";

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
}

const KEY = "ana-outbox";
const listeners = new Set<() => void>();
let queue: Pending[] = [];
let loaded: Promise<void> | null = null;
let flushing: Promise<FlushResult> | null = null;
let onSynced: (() => void) | null = null;
let onRejected: ((p: Pending, status: number) => void) | null = null;
let onMediaRefused: ((kind: string, reason: string) => void) | null = null;

function emit() {
  listeners.forEach((l) => l());
}

function load() {
  loaded ??= get<Pending[]>(KEY)
    .then((q) => {
      queue = [...(q ?? []), ...queue];
      emit();
    })
    .catch(() => {});
  return loaded;
}

async function save() {
  await set(KEY, queue).catch(() => {});
  emit();
}

/** How many saves are waiting to be sent. */
export function usePendingCount() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      void load();
      return () => listeners.delete(cb);
    },
    () => queue.length,
    () => 0
  );
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
    // Photos, voice notes and videos first: the saves below may name them.
    try {
      sent += await flushMedia((kind, reason) => onMediaRefused?.(kind, reason));
    } catch {
      return { sent: 0, left: queue.length }; // still offline: everything waits
    }
    while (queue.length) {
      const p = queue[0];
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
      await save();
      // Deleting something already gone is done, not refused.
      if (status >= 400 && !(p.method === "DELETE" && status === 404)) onRejected?.(p, status);
      else sent++;
    }
    if (sent) onSynced?.();
    return { sent, left: queue.length };
  })().finally(() => {
    flushing = null;
  });
  return flushing;
}

/** Forget everything waiting (signing out). */
export async function clearOutbox() {
  queue = [];
  await save();
  await clearPendingMedia();
}

if (typeof window !== "undefined") {
  window.addEventListener("online", () => void flush());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && navigator.onLine) void flush();
  });
}
