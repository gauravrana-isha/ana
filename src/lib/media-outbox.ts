"use client";

import { useSyncExternalStore } from "react";
import { createStore, del, get, keys, set } from "idb-keyval";
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
}

const store = typeof indexedDB === "undefined" ? undefined : createStore("ana-media", "pending");

// How many files are waiting, for the "saving 3…" count.
let waiting = 0;
const listeners = new Set<() => void>();
async function recount() {
  waiting = (await keys(store).catch(() => [])).length;
  listeners.forEach((l) => l());
}
let counted = false;

/** How many photos, voice notes and videos are waiting to go up (live). */
export function usePendingMediaCount() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      if (!counted) {
        counted = true;
        void recount();
      }
      return () => listeners.delete(cb);
    },
    () => waiting,
    () => 0
  );
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

/** How many files are waiting to go up. */
export async function pendingMediaCount() {
  return (await keys(store).catch(() => [])).length;
}

/**
 * Send the waiting files, oldest first. Stops (throws) at the first network failure, so the
 * saves that name them wait too. A file the server refuses is dropped and reported.
 */
export async function flushMedia(onRefused?: (kind: MediaKind, reason: string) => void): Promise<number> {
  const ids = (await keys(store).catch(() => [])) as string[];
  if (!ids.length) return 0;
  let sent = 0;
  const items = (await Promise.all(ids.map((id) => get<PendingMedia>(id, store)))).filter((x): x is PendingMedia => !!x).sort((a, b) => a.at - b.at);
  const storage = await currentStorage();
  for (const m of items) {
    let pathname: string, thumbPathname: string | undefined;
    try {
      pathname = await putStored(m.full, m.kind, m.contentType, storage);
      thumbPathname = m.thumb ? await putStored(m.thumb, m.kind, m.contentType, storage).catch(() => undefined) : undefined;
    } catch (e) {
      if ((e as { refused?: boolean }).refused) {
        await del(m.id, store).catch(() => {});
        onRefused?.(m.kind, e instanceof Error ? e.message : "refused");
        void recount();
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
    }
    else if (res.status >= 400 && res.status < 500) {
      await del(m.id, store).catch(() => {});
      onRefused?.(m.kind, `server said ${res.status}`);
      void recount();
    } else throw new Error(`Couldn't record an upload (${res.status})`);
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
