"use client";

import type { ImgHTMLAttributes, VideoHTMLAttributes } from "react";
import { useMediaSrc } from "@/lib/vault/files";
import { cn } from "@/lib/utils";
import { AudioPlayer } from "./Media";

/*
 * Stored photos, videos and voice notes. Files are encrypted on the device before upload, so
 * each is fetched, opened here, and shown from memory; until then a quiet placeholder holds
 * its place.
 */

export function StoredImg({ id, alt = "", className, ...rest }: { id: string } & Omit<ImgHTMLAttributes<HTMLImageElement>, "src">) {
  const src = useMediaSrc(id);
  if (!src) return <span aria-hidden="true" className={cn("block bg-surface-2 min-h-24 animate-pulse", className)} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={className} {...rest} />;
}

export function StoredVideo({ id, className, ...rest }: { id: string } & Omit<VideoHTMLAttributes<HTMLVideoElement>, "src">) {
  const src = useMediaSrc(id);
  if (!src) return <span aria-hidden="true" className={cn("block bg-black/80 aspect-video animate-pulse", className)} />;
  return <video src={src} className={className} {...rest} />;
}

export function StoredAudio({ id, duration, className }: { id: string; duration?: number | null; className?: string }) {
  const src = useMediaSrc(id);
  return <AudioPlayer src={src ?? ""} duration={duration} className={cn(!src && "opacity-60 pointer-events-none", className)} />;
}
