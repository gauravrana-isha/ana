"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type RecorderKind = "audio" | "video";
export type RecorderState = "idle" | "asking" | "ready" | "recording" | "done" | "denied" | "unsupported";

const TYPES: Record<RecorderKind, string[]> = {
  audio: ["audio/webm;codecs=opus", "audio/mp4", "audio/webm", "audio/ogg;codecs=opus"],
  video: ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/mp4", "video/webm"],
};

const MAX_SECONDS: Record<RecorderKind, number> = { audio: 30 * 60, video: 5 * 60 };

function pickType(kind: RecorderKind) {
  if (typeof MediaRecorder === "undefined") return null;
  return TYPES[kind].find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
}

/** Record voice or video in the browser. Exposes the live stream, a level meter and the result. */
export function useRecorder(kind: RecorderKind) {
  const [state, setState] = useState<RecorderState>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [level, setLevel] = useState(0);
  const [result, setResult] = useState<{ blob: Blob; url: string; seconds: number } | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [canFlip, setCanFlip] = useState(false);

  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const startedAt = useRef(0);
  const tick = useRef<number | null>(null);
  const raf = useRef<number | null>(null);
  const audioCtx = useRef<AudioContext | null>(null);

  const stopTracks = useCallback(() => {
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
    if (raf.current) cancelAnimationFrame(raf.current);
    audioCtx.current?.close().catch(() => {});
    audioCtx.current = null;
  }, [stream]);

  const prepare = useCallback(async (want: "user" | "environment" = facing) => {
    if (pickType(kind) === null || !navigator.mediaDevices?.getUserMedia) {
      setState("unsupported");
      return null;
    }
    setState("asking");
    try {
      const s = await navigator.mediaDevices.getUserMedia(
        kind === "audio"
          ? { audio: { echoCancellation: true, noiseSuppression: true } }
          : { audio: true, video: { facingMode: want, width: { ideal: 1280 }, height: { ideal: 720 } } }
      );
      setStream(s);
      setFacing(want);
      if (kind === "video") {
        const cams = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === "videoinput");
        setCanFlip(cams.length > 1);
      }
      // A soft level meter so you can see the mic is hearing you.
      try {
        const ctx = new AudioContext();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        ctx.createMediaStreamSource(s).connect(analyser);
        audioCtx.current = ctx;
        const data = new Uint8Array(analyser.frequencyBinCount);
        const loop = () => {
          analyser.getByteTimeDomainData(data);
          let peak = 0;
          for (const v of data) peak = Math.max(peak, Math.abs(v - 128));
          setLevel(Math.min(1, peak / 64));
          raf.current = requestAnimationFrame(loop);
        };
        loop();
      } catch {
        /* level meter is a nicety */
      }
      setState("ready");
      return s;
    } catch {
      setState("denied");
      return null;
    }
  }, [kind, facing]);

  /** Switch front/back camera before recording. */
  const flip = useCallback(async () => {
    stream?.getTracks().forEach((t) => t.stop());
    await prepare(facing === "user" ? "environment" : "user");
  }, [stream, facing, prepare]);

  /** Close the camera/mic without recording. */
  const close = useCallback(() => {
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
    setState("idle");
  }, [stream]);

  const start = useCallback(async () => {
    const s = stream ?? (await prepare());
    if (!s) return;
    const mimeType = pickType(kind) || undefined;
    const rec = new MediaRecorder(s, mimeType ? { mimeType } : undefined);
    chunks.current = [];
    rec.ondataavailable = (e) => {
      if (e.data.size) chunks.current.push(e.data);
    };
    rec.onstop = () => {
      const type = (rec.mimeType || mimeType || (kind === "audio" ? "audio/webm" : "video/webm")).split(";")[0];
      const blob = new Blob(chunks.current, { type });
      const seconds = (performance.now() - startedAt.current) / 1000;
      setResult((old) => {
        if (old) URL.revokeObjectURL(old.url);
        return { blob, url: URL.createObjectURL(blob), seconds };
      });
      setState("done");
    };
    recorder.current = rec;
    startedAt.current = performance.now();
    setElapsed(0);
    rec.start(1000);
    setState("recording");
    tick.current = window.setInterval(() => {
      const secs = (performance.now() - startedAt.current) / 1000;
      setElapsed(secs);
      if (secs >= MAX_SECONDS[kind] && rec.state === "recording") rec.stop();
    }, 250);
  }, [kind, prepare, stream]);

  const stop = useCallback(() => {
    if (tick.current) clearInterval(tick.current);
    if (recorder.current?.state === "recording") recorder.current.stop();
    stopTracks();
  }, [stopTracks]);

  const reset = useCallback(() => {
    setResult((old) => {
      if (old) URL.revokeObjectURL(old.url);
      return null;
    });
    setElapsed(0);
    setState("idle");
  }, []);

  // Release the camera and mic if the composer closes mid-recording.
  useEffect(
    () => () => {
      if (tick.current) clearInterval(tick.current);
      if (raf.current) cancelAnimationFrame(raf.current);
      if (recorder.current?.state === "recording") recorder.current.stop();
      recorder.current?.stream.getTracks().forEach((t) => t.stop());
      audioCtx.current?.close().catch(() => {});
    },
    []
  );

  return { state, elapsed, level, result, stream, facing, canFlip, prepare, flip, close, start, stop, reset, maxSeconds: MAX_SECONDS[kind] };
}
