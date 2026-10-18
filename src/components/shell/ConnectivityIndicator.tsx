"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { onFlushed, usePendingCount, useSendProgress } from "@/lib/outbox";
import { usePendingMediaCount } from "@/lib/media-outbox";
import { Glyph } from "@/components/art/Glyphs";
import { DoneMark } from "@/components/art/PenMarks";
import { SnakeLoader } from "@/components/ui/Loader";
import { useOnline } from "@/lib/online";
import { openWaiting, useWaiting } from "@/lib/waiting";

export const OFFLINE_NOTE = "Kept on your phone · no connection needed";
export const ALL_SENT = "Everything\u2019s in your journal";

/*
 * ana works offline, so being offline isn't an alarm: one quiet note when the connection goes
 * ("Kept on your phone"), and one when it's back, counting down what was kept meanwhile as it's
 * sent ("Sending 7… 6…", the snake turning, a thin line filling by size), then "Everything's in
 * your journal", with a light buzz. Nothing lingers. Tapping it shows what's waiting. Other
 * screens can show a short note in the same place (pull to refresh, offline).
 */

type Notice = { key: number; tone: "offline" | "saving" | "done" | "info"; text: string };

// Notes from elsewhere (e.g. pull to refresh while offline).
const noteListeners = new Set<(text: string) => void>();
export function showConnectivityNote(text: string) {
  noteListeners.forEach((l) => l(text));
}

export function ConnectivityIndicator() {
  const online = useOnline();
  const pending = usePendingCount() + usePendingMediaCount();
  const reduce = useReducedMotion();
  const progress = useSendProgress();
  const { items } = useWaiting();
  const [notice, setNotice] = useState<Notice | null>(null);
  const seq = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasOnline = useRef<boolean | null>(null);
  const syncing = useRef(false);
  // Saves were counted down while syncing (so "All saved" is earned, not just "Back online").
  const sent = useRef(false);
  const pendingRef = useRef(pending);
  useEffect(() => {
    pendingRef.current = pending;
  });

  const show = (tone: Notice["tone"], text: string, hideAfter?: number) => {
    if (timer.current) clearTimeout(timer.current);
    setNotice({ key: ++seq.current, tone, text });
    if (hideAfter) timer.current = setTimeout(() => setNotice(null), hideAfter);
  };

  // All sent: said, and felt (a light buzz, where phones allow it).
  const done = () => {
    show("done", ALL_SENT, 2400);
    navigator.vibrate?.(12);
  };

  // Going offline (or opening offline): one note. Back online: count the saves down.
  useEffect(() => {
    const before = wasOnline.current;
    wasOnline.current = online;
    if (!online && before !== false) {
      syncing.current = false;
      show("offline", OFFLINE_NOTE, 3800);
    } else if (online && before === false) {
      // Keep watching for a moment even if nothing seems to be waiting: just after a page load
      // the waiting saves may still be being read from the device.
      syncing.current = true;
      if (pending > 0) {
        sent.current = true;
        show("saving", `Back online · sending ${pending}`);
      }
      else {
        show("done", "Back online", 2200);
        setTimeout(() => {
          if (syncing.current && pendingRef.current === 0) syncing.current = false;
        }, 3000);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online]);

  // While sending: the count goes down as each save lands, then "All saved".
  useEffect(() => {
    if (!online || !syncing.current) return;
    if (pending > 0) {
      sent.current = true;
      show("saving", `Sending ${pending}`);
    } else if (sent.current) {
      syncing.current = false;
      sent.current = false;
      done();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending, online]);

  // Everything waiting has gone out: "Everything's in your journal" (also when it went too fast to count down).
  useEffect(
    () =>
      onFlushed(({ sent: count, left }) => {
        if (count > 0 && left === 0 && navigator.onLine) {
          syncing.current = false;
          sent.current = false;
          done();
        }
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useEffect(() => {
    const note = (text: string) => show("info", text, 3600);
    noteListeners.add(note);
    return () => {
      noteListeners.delete(note);
    };
  }, []);

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  const pct = progress && progress.total ? Math.min(100, (progress.done / progress.total) * 100) : 0;
  const current = progress?.current ? items.find((i) => i.key === progress.current) : undefined;

  return (
    <div className="pointer-events-none fixed top-[max(8px,var(--safe-top))] inset-x-0 z-[80] flex justify-center px-4">
      <AnimatePresence>
        {notice && (
          <motion.button
            type="button"
            key={notice.tone === "saving" ? "saving" : notice.key}
            role="status"
            aria-live="polite"
            onClick={() => openWaiting()}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -14, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -10, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            className="pointer-events-auto relative overflow-hidden flex items-center gap-2 min-h-9 max-w-full px-4 py-1.5 rounded-full bg-surface border border-line shadow-[var(--shadow-lift)]"
          >
            {notice.tone === "offline" || notice.tone === "info" ? (
              <Glyph k="offline" size={16} className="text-ink-soft shrink-0 ana-draw-in" />
            ) : notice.tone === "saving" ? (
              <SnakeLoader size={15} className="-my-1" />
            ) : (
              <DoneMark size={17} className="text-accent shrink-0 ana-draw-in" />
            )}
            <span className="font-ui text-[12.5px] font-medium text-ink tabular truncate">
              {notice.text}
              {notice.tone === "saving" && (current ? ` · ${current.label.toLowerCase()}` : "…")}
            </span>
            {notice.tone === "saving" && progress && (
              <span aria-hidden="true" className="absolute left-3 right-3 bottom-[3px] h-[2px] rounded-full bg-line overflow-hidden">
                <span className="block h-full bg-accent transition-[width] duration-300 ease-out" style={{ width: `${pct}%` }} />
              </span>
            )}
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
