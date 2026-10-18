"use client";

import { useSyncExternalStore } from "react";
import { createStore, del, entries, get, keys, set } from "idb-keyval";
import { encryptFile } from "./vault/files";
import { isUnlocked } from "./vault/vault";
import { putStored, type AttachmentDTO, type MediaKind } from "./media-client";

/*
 * Photos, voice notes and videos added offline. Each is encrypted on the device straight away
 * (like every upload) and kept here until ana is back online; then it goes up to storage and
 * is recorded under the id it was given here, before any save that names it (a moment, a
 * person's photo, your own) is sent. Meanwhile it shows from here.
 */

interface PendingMedia {
  id: string;
  kind: MediaKind;
  /** The file's real type (the kept bytes are encrypted). */
  contentType: string;
  sealed: boolean;
  durationSec?: number;
  full: Blob;
  thumb: Blob | null;
  at: number;
  /** Turned down by storage or the server (kept, to try again or remove). */
  refused?: string;
}

/** A file waiting here, without its bytes (for the list of what's waiting). */
export interface WaitingFile {
  id: string;
  kind: MediaKind;
  bytes: number;
  at: number;
  refused?: string;
}

const store = typeof indexedDB === "undefined" ? undefined : createStore("ana-media", "pending");

// The files waiting (without their bytes), for the "saving 3…" count and the list.
let files: WaitingFile[] = [];
let waiting = 0;
const listeners = new Set<() => void>();
async function recount() {
  const all = (await entries<string, PendingMedia>(store).catch(() => [])).map(([, m]) => m).filter(Boolean);
  files = all
    .map((m) => ({ id: m.id, kind: m.kind, bytes: m.full.size + (m.thumb?.size ?? 0), at: m.at, refused: m.refused }))
    .sort((a, b) => a.at - b.at);
  waiting = files.filter((f) => !f.refused).length;
  listeners.forEach((l) => l());
}
let counted = false;
function subscribe(cb: () => void) {
  listeners.add(cb);
  if (!counted) {
    counted = true;
    void recount();
  }
  return () => {
    listeners.delete(cb);
  };
}

/** How many photos, voice notes and videos are waiting to go up (live; not those refused). */
export function usePendingMediaCount() {
  return useSyncExternalStore(subscribe, () => waiting, () => 0);
}

const NO_FILES: WaitingFile[] = [];
/** Every file waiting here, refused ones too (live). */
export function useWaitingFiles() {
  return useSyncExternalStore(subscribe, () => files, () => NO_FILES);
}

/** Bytes waiting to go up (not counting refused files). */
export async function waitingMediaBytes() {
  await recount();
  return files.filter((f) => !f.refused).reduce((n, f) => n + f.bytes, 0);
}

/** Send a refused file again. */
export async function retryMedia(id: string) {
  const item = await get<PendingMedia>(id, store).catch(() => undefined);
  if (!item) return;
  await set(id, { ...item, refused: undefined }, store);
  await recount();
}

/** Keep a file for later; returns it as if it were already up. */
export async function queueMedia(m: { id: string; kind: MediaKind; file: Blob; thumb: Blob | null; durationSec?: number }): Promise<AttachmentDTO> {
  const contentType = (m.file.type || "application/octet-stream").split(";")[0];
  const sealed = isUnlocked();
  const [full, thumb] = await Promise.all([sealed ? encryptFile(m.file) : m.file, m.thumb ? (sealed ? encryptFile(m.thumb) : m.thumb) : null]);
  const item: PendingMedia = { id: m.id, kind: m.kind, contentType, sealed, durationSec: m.durationSec, full, thumb, at: Date.now() };
  await set(m.id, item, store);
  void recount();
  return { id: m.id, kind: m.kind, contentType, size: m.file.size, durationSec: m.durationSec ?? null };
}

/** A file still waiting here (its kept bytes and real type), to show it before it's up. */
export async function pendingMedia(id: string, variant: "full" | "thumb") {
  const item = await get<PendingMedia>(id, store).catch(() => undefined);
  if (!item) return null;
  return { blob: variant === "thumb" && item.thumb ? item.thumb : item.full, contentType: item.contentType };
}

/** A file removed before it went up: just forget it. True when it was waiting here. */
export async function dropPendingMedia(id: string) {
  if (!(await get(id, store).catch(() => undefined))) return false;
  await del(id, store).catch(() => {});
  void recount();
  return true;
}

/** How many files are waiting to go up (with `refused`, those turned down as well). */
export async function pendingMediaCount(opts: { refused?: boolean } = {}) {
  await recount();
  return opts.refused ? files.length : waiting;
}

/**
 * Send the waiting files, oldest first. Stops (throws) at the first network failure, so the
 * saves that name them wait too. A file the server refuses is kept aside (marked refused) and
 * reported. `onProgress` hears how far each file has got (0–100) and its size.
 */
export async function flushMedia(
  onRefused?: (kind: MediaKind, reason: string) => void,
  onProgress?: (id: string, pct: number, bytes: number) => void
): Promise<number> {
  const ids = (await keys(store).catch(() => [])) as string[];
  if (!ids.length) return 0;
  let sent = 0;
  const items = (await Promise.all(ids.map((id) => get<PendingMedia>(id, store))))
    .filter((x): x is PendingMedia => !!x && !x.refused)
    .sort((a, b) => a.at - b.at);
  if (!items.length) return 0;
  const storage = await currentStorage();
  const refuse = async (m: PendingMedia, reason: string) => {
    await set(m.id, { ...m, refused: reason }, store).catch(() => {});
    onRefused?.(m.kind, reason);
    void recount();
  };
  for (const m of items) {
    const bytes = m.full.size + (m.thumb?.size ?? 0);
    let pathname: string, thumbPathname: string | undefined;
    try {
      onProgress?.(m.id, 0, bytes);
      pathname = await putStored(m.full, m.kind, m.contentType, storage, (pct) => onProgress?.(m.id, Math.min(pct, 99), bytes));
      thumbPathname = m.thumb ? await putStored(m.thumb, m.kind, m.contentType, storage).catch(() => undefined) : undefined;
    } catch (e) {
      if ((e as { refused?: boolean }).refused) {
        await refuse(m, e instanceof Error ? e.message : "refused");
        onProgress?.(m.id, 100, bytes);
        continue;
      }
      throw e;
    }
    const res = await fetch("/api/attachments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: m.id, kind: m.kind, pathname, contentType: m.contentType, durationSec: m.durationSec, sealed: m.sealed, thumbPathname }),
    });
    if (res.ok) {
      await del(m.id, store).catch(() => {});
      sent++;
      void recount();
    } else if (res.status >= 400 && res.status < 500 && ![401, 408, 429].includes(res.status)) await refuse(m, `server said ${res.status}`);
    else throw new Error(`Couldn't record an upload (${res.status})`);
    onProgress?.(m.id, 100, bytes);
  }
  return sent;
}

/** Forget every waiting file (signing out). */
export async function clearPendingMedia() {
  const ids = (await keys(store).catch(() => [])) as string[];
  await Promise.all(ids.map((id) => del(id, store).catch(() => {})));
  void recount();
}

/** Where uploads go right now. */
async function currentStorage(): Promise<"r2" | "local"> {
  const res = await fetch("/api/me", { cache: "no-store" });
  if (!res.ok) throw new Error("Couldn't reach ana");
  return (await res.json()).storage === "local" ? "local" : "r2";
}
