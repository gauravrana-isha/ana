"use client";

import { upload } from "@vercel/blob/client";
import { encryptFile } from "./vault/files";
import { isUnlocked } from "./vault/vault";

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
 * the private Blob store in production (so large videos never touch our server), or to the
 * dev server's disk locally. Returns where it landed.
 */
export async function storeFile(
  file: Blob,
  kind: MediaKind,
  opts: { userId: string; storage: "blob" | "local"; onProgress?: (pct: number) => void; replacing?: string }
) {
  const contentType = (file.type || "application/octet-stream").split(";")[0];
  if (file.size > MAX_BYTES[kind]) throw new Error(`That file is too large (up to ${MAX_BYTES[kind] / 1024 / 1024} MB).`);
  const sealed = isUnlocked();
  const body = sealed ? await encryptFile(file) : file;
  const ext = EXT[contentType] ?? "bin";

  let pathname: string;
  if (opts.storage === "blob") {
    const res = await upload(`u/${opts.userId}/${kind}/${Date.now()}.${ext}`, body, {
      access: "private",
      handleUploadUrl: "/api/uploads",
      clientPayload: JSON.stringify({ kind, replacing: opts.replacing }),
      contentType: body.type || contentType,
      multipart: body.size > 16 * 1024 * 1024,
      onUploadProgress: (e) => opts.onProgress?.(Math.round(e.percentage)),
    });
    pathname = res.pathname;
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
  return { pathname, contentType, sealed };
}

/** Upload a recording or photo (encrypted, once the journal has a key) and register it. */
export async function uploadMedia(
  file: Blob,
  kind: MediaKind,
  opts: { userId: string; storage: "blob" | "local"; durationSec?: number; onProgress?: (pct: number) => void }
): Promise<AttachmentDTO> {
  const { pathname, contentType, sealed } = await storeFile(file, kind, opts);
  const reg = await fetch("/api/attachments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind, pathname, contentType, durationSec: opts.durationSec, sealed }),
  });
  const data = await reg.json();
  if (!reg.ok) throw new Error(data.error ?? "Couldn't save the upload");
  return data as AttachmentDTO;
}

export function formatDuration(sec: number | null | undefined) {
  if (!sec || !isFinite(sec)) return "0:00";
  const s = Math.round(sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/**
 * Scale a portrait photo down before upload (longest side `max` px, JPEG). Avatars show at
 * 80px at most, so a phone camera's 4000px original is wasted on every load. If the browser
 * can't decode the format (e.g. HEIC outside Safari), the original is sent unchanged.
 */
export async function shrinkPhoto(file: Blob, max = 640): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 400_000) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const out = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.86));
    return out && out.size < file.size ? out : file;
  } catch {
    return file;
  }
}
