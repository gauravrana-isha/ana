"use client";

import { useEffect, useState } from "react";
import { journalKeyForFiles } from "./vault";

/*
 * Photos, voice notes and videos, encrypted on the device before they're uploaded.
 *
 * Format: "ANA1" ‖ chunk size (uint32) ‖ base IV (12 bytes) ‖ chunks. Each chunk of the
 * file is sealed on its own (AES-GCM, IV = base IV with the chunk number in its last four
 * bytes), so a large video never needs one huge buffer and a cut-off file can't pass as whole.
 */

const MAGIC = [0x41, 0x4e, 0x41, 0x31]; // "ANA1"
const CHUNK = 1024 * 1024;
const TAG = 16;

function chunkIv(base: Uint8Array, n: number) {
  const iv = new Uint8Array(new ArrayBuffer(12));
  iv.set(base);
  const view = new DataView(iv.buffer);
  view.setUint32(8, view.getUint32(8) ^ n);
  return iv;
}

export async function encryptFile(file: Blob): Promise<Blob> {
  const key = journalKeyForFiles();
  const base = crypto.getRandomValues(new Uint8Array(new ArrayBuffer(12)));
  const header = new Uint8Array(new ArrayBuffer(20));
  header.set(MAGIC);
  new DataView(header.buffer).setUint32(4, CHUNK);
  header.set(base, 8);
  const parts: BlobPart[] = [header];
  const chunks = Math.max(1, Math.ceil(file.size / CHUNK));
  for (let n = 0; n < chunks; n++) {
    const plain = new Uint8Array(await file.slice(n * CHUNK, (n + 1) * CHUNK).arrayBuffer());
    parts.push(await crypto.subtle.encrypt({ name: "AES-GCM", iv: chunkIv(base, n) }, key, plain));
  }
  return new Blob(parts, { type: "application/octet-stream" });
}

export function isEncryptedFile(head: Uint8Array) {
  return head.length >= 4 && MAGIC.every((b, i) => head[i] === b);
}

export async function decryptFile(data: ArrayBuffer, type: string): Promise<Blob> {
  const key = journalKeyForFiles();
  const bytes = new Uint8Array(data);
  const size = new DataView(data).getUint32(4);
  const base = bytes.slice(8, 20);
  const parts: BlobPart[] = [];
  for (let at = 20, n = 0; at < bytes.length; at += size + TAG, n++) {
    const sealed = bytes.slice(at, Math.min(at + size + TAG, bytes.length));
    parts.push(await crypto.subtle.decrypt({ name: "AES-GCM", iv: chunkIv(base, n) }, key, sealed));
  }
  return new Blob(parts, { type });
}

// ---------- showing them ----------

const urls = new Map<string, Promise<string>>();

/** A displayable URL for a stored file: decrypted on the device when it was encrypted. */
export function mediaSrc(id: string): Promise<string> {
  let p = urls.get(id);
  if (!p) {
    p = (async () => {
      const res = await fetch(`/api/media/${id}`);
      if (!res.ok) throw new Error("Couldn't load");
      const type = res.headers.get("content-type") ?? "application/octet-stream";
      const data = await res.arrayBuffer();
      const blob = isEncryptedFile(new Uint8Array(data, 0, Math.min(4, data.byteLength)))
        ? await decryptFile(data, type)
        : new Blob([data], { type });
      return URL.createObjectURL(blob);
    })();
    p.catch(() => urls.delete(id));
    urls.set(id, p);
  }
  return p;
}

/** Forget decrypted copies (sign out / lock). */
export function dropMediaCache() {
  for (const p of urls.values()) p.then((u) => URL.revokeObjectURL(u)).catch(() => {});
  urls.clear();
}

/** React: the src for a stored file, once ready (null until then, or without an id). */
export function useMediaSrc(id: string | null | undefined) {
  const [src, setSrc] = useState<{ id: string; url: string } | null>(null);
  useEffect(() => {
    if (!id) return;
    let live = true;
    mediaSrc(id)
      .then((url) => live && setSrc({ id, url }))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [id]);
  return id && src?.id === id ? src.url : null;
}
