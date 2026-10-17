"use client";

import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useMediaSrc } from "@/lib/vault/files";
import { Portal } from "@/components/ui/Portal";
import { CloseButton } from "@/components/ui/CloseButton";
import { BackMark } from "@/components/art/PenMarks";
import { lockScroll } from "@/lib/scroll-lock";

/** One photo in the viewer, opened on the device. */
function ViewerPhoto({ id }: { id: string }) {
  const src = useMediaSrc(id);
  if (!src) return <span className="w-10 h-10 rounded-full border-2 border-white/30 border-t-white animate-spin" />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" draggable={false} className="max-w-full max-h-full object-contain select-none" />;
}

/**
 * Photos fullscreen, as a native swipe: each photo is a page that follows the finger and
 * snaps into place (the counter follows). Arrows and the keyboard move too; Escape or ✕ closes.
 */
export function PhotoViewer({ photos, index, onIndex }: { photos: string[]; index: number | null; onIndex: (i: number | null) => void }) {
  const track = useRef<HTMLDivElement>(null);
  const open = index !== null;

  // Opening at a photo: jump straight to it.
  useLayoutEffect(() => {
    if (!open || !track.current) return;
    track.current.scrollTo({ left: (index ?? 0) * track.current.clientWidth, behavior: "instant" });
    // Only when it opens; later moves come from the swipe itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const go = useCallback((d: number) => {
    const el = track.current;
    if (!el) return;
    const next = Math.min(photos.length - 1, Math.max(0, Math.round(el.scrollLeft / el.clientWidth) + d));
    el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
  }, [photos.length]);

  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onIndex(null);
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    const unlock = lockScroll();
    window.addEventListener("keydown", key);
    return () => {
      unlock();
      window.removeEventListener("keydown", key);
    };
  }, [open, go, onIndex]);

  return (
    <Portal>
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Photo"
          className="fixed inset-0 z-[90] bg-black/95"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div
            ref={track}
            onScroll={(e) => {
              const el = e.currentTarget;
              const i = Math.round(el.scrollLeft / el.clientWidth);
              if (i !== index) onIndex(i);
            }}
            className="absolute inset-0 flex overflow-x-auto overflow-y-hidden snap-x snap-mandatory overscroll-contain no-scrollbar"
          >
            {photos.map((id, i) => (
              <div key={id} className="relative shrink-0 w-full h-full snap-center snap-always grid place-items-center" aria-hidden={i !== index}>
                {/* This photo and its neighbours are opened; the rest wait until you get near. */}
                {Math.abs(i - (index ?? 0)) <= 1 ? <ViewerPhoto id={id} /> : null}
              </div>
            ))}
          </div>
          <CloseButton onClick={() => onIndex(null)} onDark className="absolute z-10 top-[calc(var(--safe-top)+10px)] right-3" />
          {photos.length > 1 && (
            <>
              <span className="absolute bottom-[max(18px,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 font-ui text-[13px] text-white/80 tabular pointer-events-none">{(index ?? 0) + 1} / {photos.length}</span>
              {(index ?? 0) > 0 && (
                <button type="button" onClick={() => go(-1)} aria-label="Previous photo" className="press hidden sm:grid absolute left-4 top-1/2 -translate-y-1/2 place-items-center w-11 h-11 rounded-full bg-white/15 text-white"><BackMark size={20} /></button>
              )}
              {(index ?? 0) < photos.length - 1 && (
                <button type="button" onClick={() => go(1)} aria-label="Next photo" className="press hidden sm:grid absolute right-4 top-1/2 -translate-y-1/2 place-items-center w-11 h-11 rounded-full bg-white/15 text-white"><BackMark size={20} className="-scale-x-100" /></button>
              )}
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
    </Portal>
  );
}
