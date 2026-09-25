"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { uploadMedia, type AttachmentDTO, type MediaKind } from "@/lib/media-client";
import type { CapturedMedia } from "./Media";

export type UploadState =
  | { status: "uploading"; pct: number }
  | { status: "done"; attachment: AttachmentDTO }
  | { status: "error"; message: string };

interface Item {
  kind: MediaKind;
  media: CapturedMedia;
}

interface Job {
  kind: MediaKind;
  promise: Promise<AttachmentDTO | null>;
}

async function discard(id: string) {
  await fetch(`/api/attachments/${id}`, { method: "DELETE" }).catch(() => {});
}

/**
 * Start uploading each recording or photo the moment it's added, like posting on Instagram:
 * by the time you've written a title and tagged people, the file is usually already up.
 * Removed items are deleted (or cancelled), and `discardAll` cleans up if the moment is abandoned.
 */
export function useEagerUploads(items: Item[], me: { id: string; storage: "blob" | "local" } | undefined) {
  const [states, setStates] = useState<Record<string, UploadState>>({});
  const jobs = useRef(new Map<string, Job>());
  /** Jobs whose item was removed (or the sheet closed) before the upload finished. */
  const cancelled = useRef(new WeakSet<Job>());

  const start = useCallback(
    (item: Item) => {
      if (!me) return;
      const key = item.media.url;
      const job: Job = { kind: item.kind, promise: Promise.resolve(null) };
      const isCancelled = () => cancelled.current.has(job);
      setStates((s) => ({ ...s, [key]: { status: "uploading", pct: 0 } }));
      job.promise = uploadMedia(item.media.blob, item.kind, {
        userId: me.id,
        storage: me.storage,
        durationSec: item.media.seconds,
        onProgress: (pct) => !isCancelled() && setStates((s) => ({ ...s, [key]: { status: "uploading", pct } })),
      })
        .then(async (attachment) => {
          if (isCancelled()) {
            await discard(attachment.id);
            return null;
          }
          setStates((s) => ({ ...s, [key]: { status: "done", attachment } }));
          return attachment;
        })
        .catch((e: unknown) => {
          if (!isCancelled()) setStates((s) => ({ ...s, [key]: { status: "error", message: e instanceof Error ? e.message : "Upload failed" } }));
          return null;
        });
      jobs.current.set(key, job);
    },
    [me]
  );

  // Start new items; cancel or delete removed ones.
  const keys = items.map((i) => i.media.url).join("|");
  useEffect(() => {
    const present = new Set(items.map((i) => i.media.url));
    for (const item of items) if (!jobs.current.has(item.media.url)) start(item);
    for (const [key, job] of jobs.current) {
      if (present.has(key)) continue;
      cancelled.current.add(job);
      jobs.current.delete(key);
      job.promise.then((a) => a && discard(a.id));
      setStates((s) => {
        const next = { ...s };
        delete next[key];
        return next;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keys, start]);

  const retry = useCallback(
    (url: string) => {
      const item = items.find((i) => i.media.url === url);
      if (!item) return;
      jobs.current.delete(url);
      start(item);
    },
    [items, start]
  );

  /** Wait for everything still uploading; returns the attachments, or throws if any failed. */
  const finish = useCallback(async (onProgress?: (pending: number) => void) => {
    const list = [...jobs.current.values()];
    let left = list.length;
    onProgress?.(left);
    const results = await Promise.all(list.map((j) => j.promise.finally(() => onProgress?.(--left))));
    if (results.some((r) => !r)) throw new Error("Some uploads didn't finish. Tap retry on them, or remove them.");
    return results as AttachmentDTO[];
  }, []);

  /** The moment was abandoned: remove everything uploaded for it. */
  const discardAll = useCallback(() => {
    for (const job of jobs.current.values()) {
      cancelled.current.add(job);
      job.promise.then((a) => a && discard(a.id));
    }
    jobs.current.clear();
    setStates({});
  }, []);

  /** The moment was saved: forget the jobs without deleting anything. */
  const settle = useCallback(() => {
    jobs.current.clear();
    setStates({});
  }, []);

  const uploading = Object.values(states).filter((s) => s.status === "uploading");
  const progress = uploading.length ? Math.round(uploading.reduce((a, s) => a + (s.status === "uploading" ? s.pct : 0), 0) / uploading.length) : 100;
  const failed = Object.values(states).some((s) => s.status === "error");

  return { states, retry, finish, discardAll, settle, uploadingCount: uploading.length, progress, failed };
}
