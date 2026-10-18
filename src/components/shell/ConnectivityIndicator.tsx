"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { usePendingCount } from "@/lib/outbox";
import { usePendingMediaCount } from "@/lib/media-outbox";
import { Glyph } from "@/components/art/Glyphs";
import { TickMark } from "@/components/tracker/FieldInput";
import { useOnline } from "@/lib/online";

/*
 * ana works offline, so being offline isn't an alarm: one quiet note when the connection goes
 * ("You're offline · everything still works here"), and one when it's back, counting down the
 * saves made meanwhile as they're sent ("Saving 7… 6…"), then "All saved". Nothing lingers.
 * Other screens can show a short note in the same place (pull to refresh, offline).
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
  const [notice, setNotice] = useState<Notice | null>(null);
  const seq = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasOnline = useRef<boolean | null>(null);
  const syncing = useRef(false);

  const show = (tone: Notice["tone"], text: string, hideAfter?: number) => {
    if (timer.current) clearTimeout(timer.current);
    setNotice({ key: ++seq.current, tone, text });
    if (hideAfter) timer.current = setTimeout(() => setNotice(null), hideAfter);
  };

  // Going offline (or opening offline): one note. Back online: count the saves down.
  useEffect(() => {
    const before = wasOnline.current;
    wasOnline.current = online;
    if (!online && before !== false) {
      syncing.current = false;
      show("offline", "You're offline · everything still works here", 3800);
    } else if (online && before === false) {
      if (pending > 0) {
        syncing.current = true;
        show("saving", `Back online · saving ${pending}`);
      } else show("done", "Back online", 2200);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online]);

  // While sending: the count goes down as each save lands, then "All saved".
  useEffect(() => {
    if (!online || !syncing.current) return;
    if (pending > 0) show("saving", `Saving ${pending}`);
    else {
      syncing.current = false;
      show("done", "All saved", 2200);
    }
  }, [pending, online]);

  useEffect(() => {
    const note = (text: string) => show("info", text, 3600);
    noteListeners.add(note);
    return () => {
      noteListeners.delete(note);
    };
  }, []);

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  return (
    <div className="pointer-events-none fixed top-[max(8px,var(--safe-top))] inset-x-0 z-[80] flex justify-center px-4">
      <AnimatePresence>
        {notice && (
          <motion.div
            key={notice.tone === "saving" ? "saving" : notice.key}
            role="status"
            aria-live="polite"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -14, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -10, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            className="flex items-center gap-2 min-h-9 max-w-full px-4 py-1.5 rounded-full bg-surface border border-line shadow-[var(--shadow-lift)]"
          >
            {notice.tone === "offline" || notice.tone === "info" ? (
              <Glyph k="offline" size={16} className="text-ink-soft shrink-0" />
            ) : notice.tone === "saving" ? (
              <Glyph k="sync" size={16} className="text-accent shrink-0 animate-spin [animation-duration:1.6s]" />
            ) : (
              <span className="grid place-items-center w-4 h-4 rounded-full bg-accent text-bg shrink-0"><TickMark size={10} /></span>
            )}
            <span className="font-ui text-[12.5px] font-medium text-ink tabular">
              {notice.text}
              {notice.tone === "saving" && "…"}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
