"use client";

import { encryptFile, putOnDevice } from "./vault/files";
import { isUnlocked } from "./vault/vault";
import { reportError } from "./report";
import { newId } from "./outbox";
import { queueMedia } from "./media-outbox";

export type MediaKind = "audio" | "video" | "photo";

export interface AttachmentDTO {
  id: string;
  kind: MediaKind;
  contentType: string;
  size: number;
  durationSec: number | null;
}

const EXT: Record<string, string> = {
  "audio/webm": "webm", "audio/ogg": "ogg", "audio/mp4": "m4a", "audio/mpeg": "mp3", "audio/aac": "aac",
  "audio/x-m4a": "m4a", "audio/wav": "wav", "video/webm": "webm", "video/mp4": "mp4", "video/quicktime": "mov",
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic", "image/heif": "heif",
  "image/gif": "gif",
};

export const MAX_BYTES: Record<MediaKind, number> = {
  audio: 50 * 1024 * 1024,
  video: 100 * 1024 * 1024,
  photo: 15 * 1024 * 1024,
};

export function mediaUrl(id: string) {
  return `/api/media/${id}`;
}

/**
 * Store a file: encrypted on the device first (once the journal has a key), then straight to
 * private R2 storage in production, so large videos never touch our server, or to the
 * dev server's disk locally. Returns where it landed.
 */
type Storage = "r2" | "local";

/** Where uploads go right now, straight from the server (the app's copy can be out of date). */
async function currentStorage(): Promise<Storage | null> {
  const res = await fetch("/api/me", { cache: "no-store" }).catch(() => null);
  return res?.ok ? ((await res.json()).storage ?? null) : null;
}

export async function storeFile(
  file: Blob,
  kind: MediaKind,
  opts: { userId: string; storage: Storage; onProgress?: (pct: number) => void; replacing?: string }
): Promise<{ pathname: string; contentType: string; sealed: boolean; body: Blob }> {
  try {
    return await storeAt(file, kind, opts);
  } catch (err) {
    reportError("upload", err, `storage=${opts.storage} kind=${kind} type=${file.type} size=${file.size} online=${navigator.onLine}`);
    // If storage moved (say, to R2) since the app loaded, go where it is now.
    const now = await currentStorage();
    if (now && now !== opts.storage) return storeAt(file, kind, { ...opts, storage: now });
    throw err;
  }
}

async function storeAt(
  file: Blob,
  kind: MediaKind,
  opts: { userId: string; storage: Storage; onProgress?: (pct: number) => void; replacing?: string }
) {
  const contentType = (file.type || "application/octet-stream").split(";")[0];
  if (file.size > MAX_BYTES[kind]) throw new Error(`That file is too large (up to ${MAX_BYTES[kind] / 1024 / 1024} MB).`);
  const sealed = isUnlocked();
  const body = sealed ? await encryptFile(file) : file;
  const pathname = await putStored(body, kind, contentType, opts.storage, opts.onProgress, opts.replacing);
  return { pathname, contentType, sealed, body };
}

/** Upload bytes as they are (already encrypted, when they should be). Returns where they landed. */
export async function putStored(
  body: Blob,
  kind: MediaKind,
  contentType: string,
  storage: Storage,
  onProgress?: (pct: number) => void,
  replacing?: string
): Promise<string> {
  const ext = EXT[contentType] ?? "bin";
  const opts = { storage, onProgress, replacing };
  let pathname: string;
  if (opts.storage === "r2") {
    const res = await fetch("/api/uploads/r2", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, contentType, size: body.size, replacing: opts.replacing }),
    });
    const data = await res.json().catch(() => ({}));
    // A refusal (no space left, a type that isn't allowed) won't change by waiting.
    if (!res.ok) throw Object.assign(new Error(`${data.error ?? "Upload refused"} (link ${res.status})`), { refused: res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429 });
    await putWithProgress(data.url, body, body.type || contentType, opts.onProgress);
    pathname = data.pathname;
  } else {
    const form = new FormData();
    form.set("kind", kind);
    form.set("type", contentType);
    if (opts.replacing) form.set("replacing", opts.replacing);
    form.set("file", new File([body], `upload.${ext}`, { type: body.type || contentType }));
    opts.onProgress?.(10);
    const res = await fetch("/api/uploads/local", { method: "POST", body: form });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Upload failed");
    pathname = data.pathname;
    opts.onProgress?.(100);
  }
  return pathname;
}

/** PUT a file to a signed link, reporting progress (fetch can't report upload progress). */
function putWithProgress(url: string, body: Blob, type: string, onProgress?: (pct: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", type);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(Math.round((e.loaded / e.total) * 100));
    // The storage's own reason (e.g. an expired or refused link) goes into the error report.
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`Upload failed (storage said ${xhr.status}: ${(xhr.responseText.match(/<Code>([^<]+)/)?.[1] ?? xhr.responseText).slice(0, 120)}). Please try again.`));
    // Status 0: the request never got an answer (connection, or the storage refusing this site).
    xhr.onerror = () => reject(new Error(`Upload failed (no answer from storage, status ${xhr.status}). Check your connection and try again.`));
    xhr.ontimeout = () => reject(new Error("Upload took too long. Please try again."));
    xhr.send(body);
  });
}

/** Photos are stored at most this size on their longest side, plus a small copy for lists. */
const PHOTO_MAX = 2048;
const THUMB_MAX = 720;

/**
 * Upload a recording or photo (encrypted, once the journal has a key) and register it. A photo
 * is scaled down to PHOTO_MAX first and gets a small copy for lists and grids, unless
 * `thumbnail: false` (profile and people pictures are already small).
 */
export async function uploadMedia(
  file: Blob,
  kind: MediaKind,
  opts: { userId: string; storage: Storage; durationSec?: number; onProgress?: (pct: number) => void; thumbnail?: boolean }
): Promise<AttachmentDTO> {
  const photo = kind === "photo" && file.type !== "image/gif";
  const [full, small] = await Promise.all([
    photo ? scalePhoto(file, PHOTO_MAX) : file,
    photo && opts.thumbnail !== false ? scalePhoto(file, THUMB_MAX, 0.8) : null,
  ]);
  // Its id is chosen here, so a moment saved offline can name it before it's up.
  const id = newId();

  // Offline (or the connection drops on the way): kept on this device, encrypted, and sent
  // with the rest of the outbox once ana is back online. It shows from here meanwhile.
  const later = () => queueMedia({ id, kind, file: full ?? file, thumb: small, durationSec: opts.durationSec });
  if (!navigator.onLine) return later();

  try {
    // The small copy goes up alongside the photo, not after it.
    const [stored, thumb] = await Promise.all([
      storeFile(full ?? file, kind, opts),
      small ? storeFile(small, kind, { ...opts, onProgress: undefined }).catch(() => null) : null,
    ]);
    const reg = await fetch("/api/attachments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, kind, pathname: stored.pathname, contentType: stored.contentType, durationSec: opts.durationSec, sealed: stored.sealed, thumbPathname: thumb?.pathname }),
    });
    const data = await reg.json().catch(() => ({}));
    if (!reg.ok) {
      const err = new Error(data.error ?? "Couldn't save the upload");
      reportError("upload-register", err, `status=${reg.status} kind=${kind}`);
      throw Object.assign(err, { refused: true });
    }
    // Kept here too, so it opens offline later without fetching it back.
    void putOnDevice(id, "full", stored.body, stored.contentType);
    if (thumb) void putOnDevice(id, "thumb", thumb.body, thumb.contentType);
    return data as AttachmentDTO;
  } catch (err) {
    // The storage or the server said no (too large, wrong type): that won't change later.
    if ((err as { refused?: boolean }).refused || /too large/i.test(String((err as Error)?.message))) throw err;
    return later();
  }
}

export function formatDuration(sec: number | null | undefined) {
  if (!sec || !isFinite(sec)) return "0:00";
  const s = Math.round(sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/**
 * A photo scaled down to `max` px on its longest side, as JPEG (turned upright, as the camera
 * meant it). Null when the browser can't open the format (e.g. HEIC outside Safari): the
 * original is then stored as it is, without a small copy.
 */
async function scalePhoto(file: Blob, max: number, quality = 0.86): Promise<Blob | null> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const out = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    // Already small enough: keep the original rather than a larger re-encode.
    return out && (scale < 1 || out.size < file.size) ? out : file;
  } catch {
    return null;
  }
}
