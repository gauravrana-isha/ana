"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Camera, CameraRotate, Images, Microphone, Pause, Play, Stop, UploadSimple, VideoCamera, X, ArrowCounterClockwise } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { formatDuration, mediaUrl, type AttachmentDTO } from "@/lib/media-client";
import { useRecorder } from "./useRecorder";
import { prefersNativeCapture, useCamera } from "./useCamera";
import type { UploadState } from "./useEagerUploads";

// ---------------------------------------------------------------- playback

export function AudioPlayer({ src, duration, className }: { src: string; duration?: number | null; className?: string }) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [total, setTotal] = useState(duration ?? 0);

  return (
    <div className={cn("flex items-center gap-3 rounded-[14px] bg-surface-2 px-3 py-2.5", className)}>
      <audio
        ref={ref}
        src={src}
        preload="metadata"
        onLoadedMetadata={(e) => isFinite(e.currentTarget.duration) && setTotal(e.currentTarget.duration)}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      />
      <button
        type="button"
        onClick={() => (playing ? ref.current?.pause() : ref.current?.play())}
        aria-label={playing ? "Pause" : "Play"}
        className="press grid place-items-center w-10 h-10 rounded-full bg-accent text-bg shrink-0"
      >
        {playing ? <Pause size={16} weight="fill" /> : <Play size={16} weight="fill" className="translate-x-[1px]" />}
      </button>
      <input
        type="range"
        min={0}
        max={total || 1}
        step={0.1}
        value={time}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (ref.current) ref.current.currentTime = v;
          setTime(v);
        }}
        aria-label="Seek"
        className="flex-1 accent-[var(--accent)] h-1"
      />
      <span className="font-ui text-[12.5px] text-ink-soft tabular w-[76px] text-right">
        {formatDuration(time)} / {formatDuration(total)}
      </span>
    </div>
  );
}

export function MediaView({ attachments, compact = false }: { attachments: AttachmentDTO[]; compact?: boolean }) {
  const photos = attachments.filter((a) => a.kind === "photo");
  const others = attachments.filter((a) => a.kind !== "photo");
  return (
    <div className="flex flex-col gap-2">
      {others.map((a) =>
        a.kind === "audio" ? (
          <AudioPlayer key={a.id} src={mediaUrl(a.id)} duration={a.durationSec} />
        ) : (
          <video
            key={a.id}
            src={mediaUrl(a.id)}
            controls
            playsInline
            preload="metadata"
            className={cn("w-full rounded-[14px] bg-black", compact ? "max-h-[320px]" : "max-h-[520px]")}
          />
        )
      )}
      {photos.length > 0 && (
        <div className={cn("grid gap-1.5", photos.length === 1 ? "grid-cols-1" : "grid-cols-2 sm:grid-cols-3")}>
          {photos.map((a) => (
            <a key={a.id} href={mediaUrl(a.id)} target="_blank" rel="noopener" className="block overflow-hidden rounded-[12px] bg-surface-2">
              {/* Private files are served through our own API, so a plain img is right here. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={mediaUrl(a.id)}
                alt=""
                loading="lazy"
                className={cn("w-full object-cover", photos.length === 1 ? "max-h-[420px]" : "aspect-square")}
              />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- capture

export interface CapturedMedia {
  blob: Blob;
  url: string;
  seconds?: number;
}

const EASE = [0.16, 1, 0.3, 1] as const;

/** Each capture step fades and settles into the next; the area resizes smoothly. */
function Stage({ step, children }: { step: string; children: React.ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <motion.div layout transition={{ layout: { duration: 0.35, ease: EASE } }} className="relative">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={step}
          initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.98, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.98, y: -4 }}
          transition={{ duration: 0.22, ease: EASE }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}

function Hint({ children, tone = "soft" }: { children: React.ReactNode; tone?: "soft" | "warn" }) {
  return <p className={cn("font-ui text-[13px] text-center max-w-[300px] mx-auto", tone === "warn" ? "text-danger" : "text-ink-soft")}>{children}</p>;
}

function ActionButton({ children, onClick, primary, className }: { children: React.ReactNode; onClick: () => void; primary?: boolean; className?: string }) {
  return (
    <button type="button" onClick={onClick} className={cn("press inline-flex items-center justify-center gap-2 h-11 px-4 rounded-[14px] font-ui text-[14px] font-semibold", primary ? "bg-accent text-bg shadow-[var(--shadow-soft)]" : "bg-surface-2 text-ink hover:bg-[color-mix(in_srgb,var(--surface-2)_85%,var(--ink)_6%)]", className)}>
      {children}
    </button>
  );
}

/** A rolling bar waveform from the live mic level. */
function LiveWave({ level, active }: { level: number; active: boolean }) {
  const [bars, setBars] = useState<number[]>(() => Array(28).fill(0.08));
  const levelRef = useRef(level);
  useEffect(() => {
    levelRef.current = level;
  }, [level]);
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setBars((b) => [...b.slice(1), Math.max(0.08, Math.min(1, levelRef.current * 1.4))]), 70);
    return () => window.clearInterval(id);
  }, [active]);
  return (
    <div className="flex items-center justify-center gap-[3px] h-14" aria-hidden="true">
      {bars.map((v, i) => (
        <span key={i} className="w-[4px] rounded-full bg-accent transition-[height] duration-75" style={{ height: `${Math.round(v * 100)}%`, opacity: 0.35 + (i / bars.length) * 0.65 }} />
      ))}
    </div>
  );
}

export function AudioCapture({ value, onChange }: { value: CapturedMedia | null; onChange: (m: CapturedMedia | null) => void }) {
  const rec = useRecorder("audio");

  useEffect(() => {
    if (rec.result) onChange(rec.result);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rec.result]);

  const recording = rec.state === "recording";
  const step = value ? "done" : recording ? "recording" : "idle";

  return (
    <Stage step={step}>
      {value ? (
        <div className="flex flex-col gap-2">
          <AudioPlayer src={value.url} duration={value.seconds} />
          <button type="button" onClick={() => { rec.reset(); onChange(null); }} className="press self-center inline-flex items-center gap-1.5 h-9 px-3 rounded-[11px] font-ui text-[13px] font-semibold text-accent hover:bg-accent-soft">
            <ArrowCounterClockwise size={15} /> Record again
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-[20px] bg-surface py-7 px-4 text-center">
          {recording ? <LiveWave level={rec.level} active /> : <div className="h-14 grid place-items-center"><Microphone size={28} className="text-accent/70" /></div>}
          <button
            type="button"
            onClick={recording ? rec.stop : () => rec.start()}
            aria-label={recording ? "Stop recording" : "Start recording"}
            className="press relative grid place-items-center w-[76px] h-[76px] rounded-full text-bg shadow-[var(--shadow-lift)]"
            style={{ background: recording ? "var(--danger)" : "var(--accent)" }}
          >
            {recording && <span className="absolute inset-0 rounded-full animate-ping bg-[var(--danger)] opacity-25" aria-hidden="true" />}
            <span className="relative">{recording ? <Stop size={26} weight="fill" /> : <Microphone size={30} weight="fill" />}</span>
          </button>
          <div className="font-display text-[22px] font-semibold text-ink tabular" aria-live="polite">
            {recording ? formatDuration(rec.elapsed) : rec.state === "asking" ? "Allow the microphone…" : "Tap to record"}
          </div>
          {rec.state === "denied" ? (
            <Hint tone="warn">The microphone is blocked. Allow it in your browser&rsquo;s site settings, then tap again.</Hint>
          ) : rec.state === "unsupported" ? (
            <Hint tone="warn">This browser can&rsquo;t record audio. Try Chrome or Safari.</Hint>
          ) : (
            <Hint>{recording ? `Up to ${rec.maxSeconds / 60} minutes. Tap to stop.` : "Speak it as it is. You can listen before keeping it."}</Hint>
          )}
        </div>
      )}
    </Stage>
  );
}

export function VideoCapture({ value, onChange }: { value: CapturedMedia | null; onChange: (m: CapturedMedia | null) => void }) {
  const rec = useRecorder("video");
  const bindLive = (el: HTMLVideoElement | null) => {
    if (el && rec.stream && el.srcObject !== rec.stream) el.srcObject = rec.stream;
  };
  const fileRef = useRef<HTMLInputElement>(null);
  const nativeRef = useRef<HTMLInputElement>(null);
  const [native] = useState(prefersNativeCapture);


  useEffect(() => {
    if (rec.result) onChange(rec.result);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rec.result]);

  const recording = rec.state === "recording";
  const cameraOn = rec.state === "ready" || recording;
  const step = value ? "done" : cameraOn ? "camera" : "idle";
  const pick = (f: File | undefined) => f && (rec.close(), onChange({ blob: f, url: URL.createObjectURL(f) }));

  return (
    <>
      <Stage step={step}>
        {value ? (
          <div className="flex flex-col gap-2">
            <video src={value.url} controls playsInline className="w-full max-h-[380px] rounded-[18px] bg-black" />
            <button type="button" onClick={() => { rec.reset(); onChange(null); }} className="press self-center inline-flex items-center gap-1.5 h-9 px-3 rounded-[11px] font-ui text-[13px] font-semibold text-accent hover:bg-accent-soft">
              <ArrowCounterClockwise size={15} /> Choose again
            </button>
          </div>
        ) : cameraOn ? (
          <div className="relative aspect-[4/3] sm:aspect-video rounded-[20px] overflow-hidden bg-black">
            <video ref={bindLive} autoPlay muted playsInline className={cn("absolute inset-0 w-full h-full object-cover", rec.facing === "user" && "-scale-x-100")} />
            <div className="absolute top-3 inset-x-3 flex items-center justify-between">
              {recording ? (
                <span className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-black/55 text-white font-ui text-[13px] font-semibold tabular">
                  <span className="w-2 h-2 rounded-full bg-[#e5484d] animate-pulse" /> {formatDuration(rec.elapsed)}
                </span>
              ) : (
                <span className="h-8 px-3 rounded-full bg-black/40 text-white/90 font-ui text-[12.5px] grid place-items-center">Up to 5 minutes</span>
              )}
              {!recording && (
                <button type="button" onClick={rec.close} aria-label="Close camera" className="press grid place-items-center w-9 h-9 rounded-full bg-black/45 text-white"><X size={16} weight="bold" /></button>
              )}
            </div>
            <div className="absolute bottom-4 inset-x-0 flex items-center justify-center gap-6">
              <span className="w-11" />
              <button
                type="button"
                onClick={recording ? rec.stop : () => rec.start()}
                aria-label={recording ? "Stop" : "Record"}
                className="press grid place-items-center w-[68px] h-[68px] rounded-full border-[4px] border-white/90 bg-white/10 backdrop-blur-sm"
              >
                <span className={cn("block bg-[#e5484d] transition-all duration-200", recording ? "w-6 h-6 rounded-[6px]" : "w-12 h-12 rounded-full")} />
              </button>
              {rec.canFlip && !recording ? (
                <button type="button" onClick={rec.flip} aria-label="Switch camera" className="press grid place-items-center w-11 h-11 rounded-full bg-black/45 text-white"><CameraRotate size={20} /></button>
              ) : (
                <span className="w-11" />
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-[20px] bg-surface py-8 px-4 text-center">
            <span className="grid place-items-center w-14 h-14 rounded-full bg-accent-soft text-accent"><VideoCamera size={26} /></span>
            <div className="font-display text-[20px] font-semibold text-ink">{rec.state === "asking" ? "Allow the camera…" : "Record a short video"}</div>
            {rec.state === "denied" ? (
              <Hint tone="warn">The camera is blocked. Allow it in site settings, or choose a video you already have.</Hint>
            ) : rec.state === "unsupported" ? (
              <Hint tone="warn">This browser can&rsquo;t record here. Choose a video instead.</Hint>
            ) : (
              <Hint>Up to 5 minutes. You can watch it before keeping it.</Hint>
            )}
            <div className="mt-1 flex flex-wrap justify-center gap-2">
              <ActionButton primary onClick={() => (native ? nativeRef.current?.click() : rec.prepare())}>
                <Camera size={18} /> {native ? "Record video" : "Open camera"}
              </ActionButton>
              <ActionButton onClick={() => fileRef.current?.click()}>
                <UploadSimple size={18} /> Choose a video
              </ActionButton>
            </div>
          </div>
        )}
      </Stage>
      <input ref={nativeRef} type="file" accept="video/*" capture="environment" hidden onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
      <input ref={fileRef} type="file" accept="video/*" hidden onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
    </>
  );
}

export function PhotoCapture({ value, onChange, statusOf, onRetry }: { value: CapturedMedia[]; onChange: (m: CapturedMedia[]) => void; statusOf?: (url: string) => UploadState | undefined; onRetry?: (url: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const nativeRef = useRef<HTMLInputElement>(null);
  const cam = useCamera();
  const viewfinder = useRef<HTMLVideoElement | null>(null);
  // Attach the stream whenever the viewfinder mounts (the step animation mounts it a moment later).
  const bindViewfinder = (el: HTMLVideoElement | null) => {
    viewfinder.current = el;
    if (el && cam.stream && el.srcObject !== cam.stream) el.srcObject = cam.stream;
  };
  const [native] = useState(prefersNativeCapture);
  const [flash, setFlash] = useState(0);
  const [dragging, setDragging] = useState(false);
  const room = 9 - value.length;


  const add = (files: (File | Blob)[]) => {
    const images = files.filter((f) => f.type.startsWith("image/")).slice(0, room);
    if (images.length) onChange([...value, ...images.map((f) => ({ blob: f, url: URL.createObjectURL(f) }))]);
  };
  const takePhoto = () => (native ? nativeRef.current?.click() : cam.open());
  async function shoot() {
    if (!viewfinder.current) return;
    const blob = await cam.snap(viewfinder.current);
    if (!blob) return;
    setFlash((n) => n + 1);
    add([blob]);
    if (room <= 1) cam.stop();
  }

  const cameraOn = cam.state === "live" || cam.state === "asking";

  return (
    <div
      className="flex flex-col gap-3"
      onDragOver={(e) => { if (e.dataTransfer.types.includes("Files")) { e.preventDefault(); setDragging(true); } }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); add(Array.from(e.dataTransfer.files)); }}
    >
      <Stage step={cameraOn ? "camera" : value.length ? "grid" : "empty"}>
        {cameraOn ? (
          <div className="relative aspect-[4/3] rounded-[20px] overflow-hidden bg-black">
            <video ref={bindViewfinder} autoPlay muted playsInline className={cn("absolute inset-0 w-full h-full object-cover", cam.facing === "user" && "-scale-x-100")} />
            {cam.state === "asking" && <div className="absolute inset-0 grid place-items-center text-white/80 font-ui text-[14px]">Allow the camera…</div>}
            <AnimatePresence>
              {flash > 0 && (
                <motion.span key={flash} className="absolute inset-0 bg-white pointer-events-none" initial={{ opacity: 0.85 }} animate={{ opacity: 0 }} transition={{ duration: 0.35 }} />
              )}
            </AnimatePresence>
            <div className="absolute top-3 inset-x-3 flex items-center justify-between">
              <span className="h-8 px-3 rounded-full bg-black/45 text-white font-ui text-[12.5px] font-semibold grid place-items-center tabular">
                {value.length ? `${value.length} taken · ${room} more` : "Up to 9 photos"}
              </span>
              <button type="button" onClick={cam.stop} className="press h-9 px-3.5 rounded-full bg-white text-ink font-ui text-[13px] font-semibold">Done</button>
            </div>
            <div className="absolute bottom-4 inset-x-0 flex items-center justify-center gap-6">
              <span className="w-11 h-11 rounded-[12px] overflow-hidden border-2 border-white/80 bg-black/30">
                {value.length > 0 && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={value[value.length - 1].url} alt="" className="w-full h-full object-cover" />
                )}
              </span>
              <button type="button" onClick={shoot} disabled={cam.state !== "live" || room <= 0} aria-label="Take photo" className="press grid place-items-center w-[68px] h-[68px] rounded-full border-[4px] border-white/90 bg-white/10 backdrop-blur-sm disabled:opacity-50">
                <span className="block w-[52px] h-[52px] rounded-full bg-white" />
              </button>
              {cam.canFlip ? (
                <button type="button" onClick={cam.flip} aria-label="Switch camera" className="press grid place-items-center w-11 h-11 rounded-full bg-black/45 text-white"><CameraRotate size={20} /></button>
              ) : (
                <span className="w-11" />
              )}
            </div>
          </div>
        ) : value.length === 0 ? (
          <div className={cn("flex flex-col items-center gap-3 rounded-[20px] border-[1.5px] border-dashed py-8 px-4 text-center transition-colors", dragging ? "border-accent bg-accent-soft" : "border-line bg-surface")}>
            <span className="grid place-items-center w-14 h-14 rounded-full bg-accent-soft text-accent"><Camera size={26} /></span>
            <div className="font-display text-[20px] font-semibold text-ink">{dragging ? "Drop to add" : "Add photos"}</div>
            {cam.state === "denied" ? (
              <Hint tone="warn">The camera is blocked. Allow it in site settings, or choose photos instead.</Hint>
            ) : (
              <Hint>Take one now, or choose up to 9 from your {native ? "gallery" : "computer"}{native ? "" : ". You can also drop them here"}.</Hint>
            )}
            <div className="mt-1 flex flex-wrap justify-center gap-2">
              <ActionButton primary onClick={takePhoto}><Camera size={18} /> Take a photo</ActionButton>
              <ActionButton onClick={() => fileRef.current?.click()}><Images size={18} /> Choose photos</ActionButton>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            <AnimatePresence initial={false}>
              {value.map((p) => (
                <motion.div
                  key={p.url}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.22, ease: EASE }}
                  className="relative aspect-square rounded-[14px] overflow-hidden bg-surface-2"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt="" className="w-full h-full object-cover" />
                  <button type="button" aria-label="Remove photo" onClick={() => onChange(value.filter((x) => x.url !== p.url))} className="press absolute top-1.5 right-1.5 grid place-items-center w-7 h-7 rounded-full bg-black/55 text-white">
                    <X size={13} weight="bold" />
                  </button>
                  <UploadBadge state={statusOf?.(p.url)} onRetry={() => onRetry?.(p.url)} />
                </motion.div>
              ))}
            </AnimatePresence>
            {room > 0 && (
              <motion.div layout className={cn("aspect-square rounded-[14px] border-[1.5px] border-dashed grid grid-rows-2 overflow-hidden transition-colors", dragging ? "border-accent bg-accent-soft" : "border-line")}>
                <button type="button" onClick={takePhoto} className="press flex items-center justify-center gap-1.5 font-ui text-[12.5px] font-semibold text-accent hover:bg-accent-soft border-b border-dashed border-line">
                  <Camera size={17} /> Take
                </button>
                <button type="button" onClick={() => fileRef.current?.click()} className="press flex items-center justify-center gap-1.5 font-ui text-[12.5px] font-semibold text-ink-soft hover:text-ink hover:bg-surface">
                  <Images size={17} /> Choose
                </button>
              </motion.div>
            )}
          </div>
        )}
      </Stage>
      <input ref={nativeRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { add(Array.from(e.target.files ?? [])); e.target.value = ""; }} />
      <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => { add(Array.from(e.target.files ?? [])); e.target.value = ""; }} />
    </div>
  );
}

// ---------------------------------------------------------------- upload status

/** Small ring for a thumbnail: progress while uploading, a tick when done, retry on failure. */
export function UploadBadge({ state, onRetry }: { state: UploadState | undefined; onRetry?: () => void }) {
  if (!state) return null;
  if (state.status === "error") {
    return (
      <button type="button" onClick={onRetry} aria-label="Upload failed, retry" className="press absolute bottom-1.5 left-1.5 inline-flex items-center gap-1 h-7 px-2 rounded-full bg-danger text-white font-ui text-[11.5px] font-semibold">
        Retry
      </button>
    );
  }
  if (state.status === "done") {
    return (
      <span aria-label="Uploaded" className="absolute bottom-1.5 left-1.5 grid place-items-center w-6 h-6 rounded-full bg-good text-white text-[12px] font-serif leading-none shadow">✓</span>
    );
  }
  const r = 9, c = 2 * Math.PI * r;
  return (
    <span aria-label={`Uploading ${state.pct}%`} className="absolute bottom-1.5 left-1.5 grid place-items-center w-7 h-7 rounded-full bg-black/55">
      <svg width="22" height="22" viewBox="0 0 24 24" className="-rotate-90">
        <circle cx="12" cy="12" r={r} fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
        <circle cx="12" cy="12" r={r} fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - state.pct / 100)} style={{ transition: "stroke-dashoffset 200ms linear" }} />
      </svg>
    </span>
  );
}

/** A line under a recording: "Uploading · 42%", "Uploaded", or an error with retry. */
export function UploadStrip({ state, onRetry }: { state: UploadState | undefined; onRetry?: () => void }) {
  if (!state) return null;
  return (
    <div className="flex items-center gap-3 rounded-[12px] bg-surface px-3 py-2" aria-live="polite">
      {state.status === "uploading" && (
        <>
          <span className="font-ui text-[13px] text-ink-soft tabular w-[112px] shrink-0">Uploading · {state.pct}%</span>
          <span className="flex-1 h-1.5 rounded-full bg-surface-2 overflow-hidden">
            <span className="block h-full rounded-full bg-accent transition-[width] duration-200" style={{ width: `${state.pct}%` }} />
          </span>
        </>
      )}
      {state.status === "done" && <span className="font-ui text-[13px] font-semibold text-good">✓ Uploaded. It&rsquo;s safe to keep writing.</span>}
      {state.status === "error" && (
        <>
          <span className="flex-1 font-ui text-[13px] text-danger">{state.message}</span>
          <button type="button" onClick={onRetry} className="press h-8 px-3 rounded-[10px] bg-danger text-white font-ui text-[12.5px] font-semibold">Retry</button>
        </>
      )}
    </div>
  );
}
