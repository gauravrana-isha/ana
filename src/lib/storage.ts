import "server-only";
import { randomBytes } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { del, get, head } from "@vercel/blob";
import { db } from "./db";

/**
 * Where moment media lives. Production uses a private Vercel Blob store (files are never
 * public; every read goes through /api/media/[id] after an ownership check). Local
 * development without a Blob token falls back to a folder on disk.
 */
export type StorageMode = "blob" | "local";

export function storageMode(): StorageMode {
  if (process.env.BLOB_READ_WRITE_TOKEN) return "blob";
  if (process.env.NODE_ENV === "production") {
    throw new Error("BLOB_READ_WRITE_TOKEN is required in production");
  }
  return "local";
}

export type MediaKind = "audio" | "video" | "photo";

export const MEDIA_RULES: Record<MediaKind, { types: string[]; maxBytes: number; label: string }> = {
  audio: {
    types: ["audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg", "audio/aac", "audio/x-m4a", "audio/wav"],
    maxBytes: 50 * 1024 * 1024,
    label: "50 MB",
  },
  video: {
    types: ["video/webm", "video/mp4", "video/quicktime"],
    maxBytes: 250 * 1024 * 1024,
    label: "250 MB",
  },
  photo: {
    types: ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", "image/gif"],
    maxBytes: 15 * 1024 * 1024,
    label: "15 MB",
  },
};

/** Per-person storage ceiling while approval is the only gate on sign-ups. */
export const USER_QUOTA_BYTES = 2 * 1024 * 1024 * 1024;

export function isMediaKind(v: unknown): v is MediaKind {
  return v === "audio" || v === "video" || v === "photo";
}

/** Strip codec parameters: "audio/webm;codecs=opus" → "audio/webm". */
export function baseType(contentType: string) {
  return contentType.split(";")[0].trim().toLowerCase();
}

export function allowedType(kind: MediaKind, contentType: string) {
  return MEDIA_RULES[kind].types.includes(baseType(contentType));
}

export async function bytesUsed(userId: string) {
  const agg = await db.attachment.aggregate({ where: { userId }, _sum: { size: true } });
  return agg._sum.size ?? 0;
}

/** Every file a person uploads lives under their own prefix. */
export function userPrefix(userId: string) {
  return `u/${userId}/`;
}

const EXT: Record<string, string> = {
  "audio/webm": "webm", "audio/ogg": "ogg", "audio/mp4": "m4a", "audio/mpeg": "mp3", "audio/aac": "aac",
  "audio/x-m4a": "m4a", "audio/wav": "wav", "video/webm": "webm", "video/mp4": "mp4", "video/quicktime": "mov",
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic", "image/heif": "heif",
  "image/gif": "gif",
};

export function newPathname(userId: string, kind: MediaKind, contentType: string) {
  const ext = EXT[baseType(contentType)] ?? "bin";
  return `${userPrefix(userId)}${kind}/${Date.now()}-${randomBytes(8).toString("hex")}.${ext}`;
}

// ---------------------------------------------------------------- local (dev only)

const LOCAL_ROOT = path.join(process.cwd(), ".uploads");

function localPath(pathname: string) {
  const full = path.join(LOCAL_ROOT, pathname);
  if (!full.startsWith(LOCAL_ROOT + path.sep)) throw new Error("Bad path");
  return full;
}

export async function writeLocal(pathname: string, data: Buffer) {
  const full = localPath(pathname);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, data);
}

// ---------------------------------------------------------------- shared

/** Size of an uploaded file, confirming it really exists where the client says it is. */
export async function uploadedSize(storage: StorageMode, pathname: string): Promise<number | null> {
  try {
    if (storage === "blob") return (await head(pathname)).size;
    return (await stat(localPath(pathname))).size;
  } catch {
    return null;
  }
}

export async function removeStored(storage: string, pathname: string) {
  try {
    if (storage === "blob") await del(pathname);
    else await unlink(localPath(pathname));
  } catch {
    /* already gone */
  }
}

/**
 * Stream a stored file, honouring HTTP Range so audio and video can seek.
 * Returns a Response ready to send.
 */
export async function streamStored(
  file: { storage: string; pathname: string; contentType: string; size: number },
  range: string | null
): Promise<Response> {
  const baseHeaders: Record<string, string> = {
    "Content-Type": file.contentType,
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, max-age=3600",
    "X-Content-Type-Options": "nosniff",
  };

  let start = 0;
  let end = file.size - 1;
  const m = range?.match(/bytes=(\d*)-(\d*)/);
  const partial = !!m && file.size > 0;
  if (m) {
    if (m[1] === "" && m[2] !== "") {
      start = Math.max(0, file.size - Number(m[2]));
    } else {
      start = Number(m[1] || 0);
      if (m[2] !== "") end = Math.min(Number(m[2]), file.size - 1);
    }
    if (start > end || start >= file.size) {
      return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${file.size}` } });
    }
  }

  const headers = {
    ...baseHeaders,
    "Content-Length": String(end - start + 1),
    ...(partial ? { "Content-Range": `bytes ${start}-${end}/${file.size}` } : {}),
  };

  if (file.storage === "blob") {
    const res = await get(file.pathname, {
      access: "private",
      headers: partial ? { Range: `bytes=${start}-${end}` } : undefined,
    });
    if (!res || res.statusCode !== 200) return new Response("Not found", { status: 404 });
    return new Response(res.stream, { status: partial ? 206 : 200, headers });
  }

  const node = createReadStream(localPath(file.pathname), { start, end });
  return new Response(Readable.toWeb(node) as ReadableStream, { status: partial ? 206 : 200, headers });
}
