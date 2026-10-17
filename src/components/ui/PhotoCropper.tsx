"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Portal } from "./Portal";
import { MinusMark, PlusMark } from "@/components/art/PenMarks";

/*
 * Choose what part of a photo shows, the way phones do it: the photo sits behind a round
 * frame; drag to move it, pinch (or scroll, or the slider) to zoom. The photo always covers
 * the frame. "Use photo" hands back a square JPEG of just the framed part.
 */

const OUT = 640; // pixels on each side of the saved square
const MAX_ZOOM = 5;

type View = { z: number; x: number; y: number };

export function PhotoCropper({ file, onCancel, onDone }: { file: Blob | null; onCancel: () => void; onDone: (cropped: Blob) => void }) {
  return (
    <Portal>
      <AnimatePresence>{file && <Cropper key={String(file.size) + file.type} file={file} onCancel={onCancel} onDone={onDone} />}</AnimatePresence>
    </Portal>
  );
}

function Cropper({ file, onCancel, onDone }: { file: Blob; onCancel: () => void; onDone: (cropped: Blob) => void }) {
  const stage = useRef<HTMLDivElement>(null);
  const [url] = useState(() => URL.createObjectURL(file));
  const [img, setImg] = useState<{ w: number; h: number } | null>(null);
  const [size, setSize] = useState(320);
  const [view, setView] = useState<View>({ z: 1, x: 0, y: 0 });
  const [moving, setMoving] = useState(false);
  const [saving, setSaving] = useState(false);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ view: View; dist: number; mid: { x: number; y: number } } | null>(null);

  useEffect(() => () => URL.revokeObjectURL(url), [url]);

  // The frame fills the width on phones, up to a comfortable size on larger screens.
  useLayoutEffect(() => {
    const el = stage.current;
    if (!el) return;
    const measure = () => setSize(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Escape cancels this, not the form underneath.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      onCancel();
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [onCancel]);

  const cover = img ? Math.max(size / img.w, size / img.h) : 1;

  /** Keep the photo covering the frame at this zoom. */
  function clamp(v: View): View {
    if (!img) return v;
    const z = Math.min(MAX_ZOOM, Math.max(1, v.z));
    const s = cover * z;
    const mx = Math.max(0, (img.w * s - size) / 2);
    const my = Math.max(0, (img.h * s - size) / 2);
    return { z, x: Math.min(mx, Math.max(-mx, v.x)), y: Math.min(my, Math.max(-my, v.y)) };
  }

  /** Zoom to `z` keeping the point `at` (relative to the frame's centre) where it is. */
  function zoomTo(from: View, z: number, at = { x: 0, y: 0 }) {
    const k = Math.min(MAX_ZOOM, Math.max(1, z)) / from.z;
    return clamp({ z: from.z * k, x: at.x - (at.x - from.x) * k, y: at.y - (at.y - from.y) * k });
  }

  function local(e: { clientX: number; clientY: number }) {
    const r = stage.current!.getBoundingClientRect();
    return { x: e.clientX - r.left - r.width / 2, y: e.clientY - r.top - r.height / 2 };
  }

  function startGesture() {
    const pts = [...pointers.current.values()];
    const mid = pts.length > 1 ? { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 } : pts[0];
    const dist = pts.length > 1 ? Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) : 0;
    gesture.current = { view, dist, mid };
  }

  function onDown(e: React.PointerEvent) {
    stage.current?.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, local(e));
    setMoving(true);
    startGesture();
  }

  function onMove(e: React.PointerEvent) {
    if (!pointers.current.has(e.pointerId) || !gesture.current) return;
    pointers.current.set(e.pointerId, local(e));
    const g = gesture.current;
    const pts = [...pointers.current.values()];
    if (pts.length > 1 && g.dist) {
      const mid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const zoomed = zoomTo(g.view, g.view.z * (dist / g.dist), g.mid);
      setView(clamp({ ...zoomed, x: zoomed.x + mid.x - g.mid.x, y: zoomed.y + mid.y - g.mid.y }));
    } else {
      setView(clamp({ ...g.view, x: g.view.x + pts[0].x - g.mid.x, y: g.view.y + pts[0].y - g.mid.y }));
    }
  }

  function onUp(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size) startGesture();
    else {
      gesture.current = null;
      setMoving(false);
    }
  }

  function onWheel(e: React.WheelEvent) {
    setView((v) => zoomTo(v, v.z * Math.exp(-e.deltaY * 0.0022), local(e)));
  }

  async function use() {
    if (!img) return;
    setSaving(true);
    try {
      const bitmap = await createImageBitmap(file);
      const s = cover * view.z;
      const side = size / s; // the frame, in the photo's own pixels
      const sx = img.w / 2 - (size / 2 + view.x) / s;
      const sy = img.h / 2 - (size / 2 + view.y) / s;
      const out = Math.min(OUT, Math.round(side));
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = out;
      const ctx = canvas.getContext("2d")!;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, out, out);
      bitmap.close();
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
      if (blob) onDone(blob);
    } finally {
      setSaving(false);
    }
  }

  const s = cover * view.z;
  return (
    <motion.div
      className="fixed inset-0 z-[90] flex flex-col bg-[#0f0e0b] text-white select-none touch-none"
      style={{ paddingTop: "var(--safe-top)", paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}
      role="dialog"
      aria-modal="true"
      aria-label="Move and scale"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
    >
      <header className="flex items-center justify-between gap-3 px-4 h-14 shrink-0">
        <button type="button" onClick={onCancel} className="press h-10 px-3 -ml-1 rounded-full font-ui text-[15px] font-semibold text-white/80 hover:text-white">
          Cancel
        </button>
        <p className="font-ui text-[15px] font-semibold">Move and scale</p>
        <button type="button" onClick={use} disabled={!img || saving} className="press h-10 px-4 rounded-full bg-accent font-ui text-[14.5px] font-semibold text-bg disabled:opacity-50">
          {saving ? "Saving…" : "Use photo"}
        </button>
      </header>

      <div className="flex-1 grid place-items-center px-4 min-h-0">
        <div
          ref={stage}
          className="relative w-full max-w-[420px] aspect-square cursor-grab active:cursor-grabbing"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onWheel={onWheel}
          onDoubleClick={(e) => setView((v) => (v.z > 1.05 ? clamp({ z: 1, x: 0, y: 0 }) : zoomTo(v, 2, local(e))))}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt=""
            draggable={false}
            onLoad={(e) => setImg({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
            onError={onCancel}
            className="absolute left-1/2 top-1/2 max-w-none pointer-events-none"
            style={{
              width: img ? img.w * s : "100%",
              height: img ? img.h * s : "auto",
              transform: `translate(calc(-50% + ${view.x}px), calc(-50% + ${view.y}px))`,
              opacity: img ? 1 : 0,
              transition: moving ? "none" : "transform 0.25s cubic-bezier(0.16,1,0.3,1), width 0.25s cubic-bezier(0.16,1,0.3,1), height 0.25s cubic-bezier(0.16,1,0.3,1), opacity 0.2s",
            }}
          />
          {/* Outside the circle is dimmed; while moving, a light grid helps line things up. */}
          <span aria-hidden="true" className="absolute inset-0 rounded-full shadow-[0_0_0_100vmax_rgba(15,14,11,0.62)] ring-1 ring-white/70 pointer-events-none" />
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-full overflow-hidden pointer-events-none transition-opacity duration-200"
            style={{
              opacity: moving ? 1 : 0,
              backgroundImage: "linear-gradient(to right, transparent calc(33.33% - 0.5px), rgba(255,255,255,0.35) 33.33%, transparent calc(33.33% + 0.5px), transparent calc(66.66% - 0.5px), rgba(255,255,255,0.35) 66.66%, transparent calc(66.66% + 0.5px)), linear-gradient(to bottom, transparent calc(33.33% - 0.5px), rgba(255,255,255,0.35) 33.33%, transparent calc(33.33% + 0.5px), transparent calc(66.66% - 0.5px), rgba(255,255,255,0.35) 66.66%, transparent calc(66.66% + 0.5px))",
            }}
          />
        </div>
      </div>

      <div className="shrink-0 px-6 pt-4 pb-2 flex flex-col items-center gap-3">
        <div className="w-full max-w-[360px] flex items-center gap-3">
          <button type="button" aria-label="Zoom out" onClick={() => setView((v) => zoomTo(v, v.z - 0.4))} className="press grid place-items-center w-9 h-9 rounded-full text-white/75 hover:text-white">
            <MinusMark size={18} />
          </button>
          <input
            type="range"
            min={1}
            max={MAX_ZOOM}
            step={0.01}
            value={view.z}
            aria-label="Zoom"
            onChange={(e) => setView((v) => zoomTo(v, Number(e.target.value)))}
            className="ana-zoom flex-1"
            style={{ "--fill": `${((view.z - 1) / (MAX_ZOOM - 1)) * 100}%` } as React.CSSProperties}
          />
          <button type="button" aria-label="Zoom in" onClick={() => setView((v) => zoomTo(v, v.z + 0.4))} className="press grid place-items-center w-9 h-9 rounded-full text-white/75 hover:text-white">
            <PlusMark size={18} />
          </button>
        </div>
        <p className="font-ui text-[12.5px] text-white/55">Drag to move · pinch or slide to zoom</p>
      </div>
    </motion.div>
  );
}
