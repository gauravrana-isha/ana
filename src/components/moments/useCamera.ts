"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type Facing = "user" | "environment";

/** A live camera for stills: open, flip, snap to a JPEG, always released on close. */
export function useCamera() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [state, setState] = useState<"idle" | "asking" | "live" | "denied" | "unsupported">("idle");
  const [facing, setFacing] = useState<Facing>("environment");
  const [canFlip, setCanFlip] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStream(null);
    setState("idle");
  }, []);

  const open = useCallback(async (want: Facing = facing) => {
    if (!navigator.mediaDevices?.getUserMedia) return setState("unsupported");
    setState("asking");
    streamRef.current?.getTracks().forEach((t) => t.stop());
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: want, width: { ideal: 1920 }, height: { ideal: 1440 } }, audio: false });
      streamRef.current = s;
      setStream(s);
      setFacing(want);
      setState("live");
      const cams = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === "videoinput");
      setCanFlip(cams.length > 1);
    } catch {
      setState("denied");
    }
  }, [facing]);

  const flip = useCallback(() => open(facing === "user" ? "environment" : "user"), [facing, open]);

  /** Grab the current frame. Front camera is un-mirrored so the photo reads as the world does. */
  const snap = useCallback(async (video: HTMLVideoElement): Promise<Blob | null> => {
    const w = video.videoWidth, h = video.videoHeight;
    if (!w || !h) return null;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d")!.drawImage(video, 0, 0, w, h);
    return new Promise((res) => canvas.toBlob((b) => res(b), "image/jpeg", 0.9));
  }, []);

  useEffect(() => () => streamRef.current?.getTracks().forEach((t) => t.stop()), []);

  return { stream, state, facing, canFlip, open, flip, stop, snap };
}

/** Phones and tablets: hand capture to the device's own camera app, which is the smoothest there. */
export function prefersNativeCapture() {
  return typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
}
