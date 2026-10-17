"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { flush } from "@/lib/outbox";

const PETALS = [
  "M24 9c4.6 4.4 6.6 9.2 6 14.6-.4 3.8-2.4 7-6 9.4-3.6-2.4-5.6-5.6-6-9.4-.6-5.4 1.4-10.2 6-14.6z",
  "M17.6 20.6c-3.6-.6-7-.2-10.2 1.4 1 5.2 4.4 9 10 10.8 2 .6 4.2.8 6.6.2",
  "M30.4 20.6c3.6-.6 7-.2 10.2 1.4-1 5.2-4.4 9-10 10.8-2 .6-4.2.8-6.6.2",
  "M12.2 31.6c-2.6.6-4.8 1.8-6.6 3.6 4.8 3.4 11 4.6 18.4 4.6s13.6-1.2 18.4-4.6c-1.8-1.8-4-3-6.6-3.6",
];
const READY = 72; // how far to pull (after damping) before letting go refreshes
const MAX = 110;

/**
 * ana's own pull-to-refresh (phones): pull down at the top of a page and a lotus draws itself
 * as you pull; let go past the mark and the page's data is fetched fresh (no full reload, so
 * the journal stays unlocked), with the accent line along the top. The browser's own
 * pull-to-refresh is switched off, so there's only ever this one.
 */
export function PullToRefresh() {
  const qc = useQueryClient();
  const router = useRouter();
  const [pull, setPull] = useState(0);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const start = useRef<{ y: number; x: number } | null>(null);
  const live = useRef(0);
  const refreshing = useRef(false);

  useEffect(() => {
    // Not while a sheet or dialog is open (they lock the page), or inside one.
    const blocked = (t: EventTarget | null) =>
      document.body.style.overflow === "hidden" || !!(t as Element | null)?.closest?.('[role="dialog"], [role="alertdialog"], textarea, [contenteditable="true"]');

    const onStart = (e: TouchEvent) => {
      if (refreshing.current || e.touches.length !== 1 || window.scrollY > 0 || blocked(e.target)) return;
      start.current = { y: e.touches[0].clientY, x: e.touches[0].clientX };
    };
    const onMove = (e: TouchEvent) => {
      if (!start.current) return;
      const dy = e.touches[0].clientY - start.current.y;
      const dx = Math.abs(e.touches[0].clientX - start.current.x);
      if (dy <= 0 || window.scrollY > 0 || dx > dy) {
        if (live.current) setPull((live.current = 0));
        if (dy < 0 || dx > dy) start.current = null;
        return;
      }
      // Ours instead of the browser's (and no rubber band while pulling).
      e.preventDefault();
      setDragging(true);
      const damped = Math.min(MAX, dy * 0.5);
      live.current = damped;
      setPull(damped);
    };
    const onEnd = async () => {
      if (!start.current) return;
      start.current = null;
      setDragging(false);
      const ready = live.current >= READY;
      if (!ready) {
        setPull((live.current = 0));
        return;
      }
      refreshing.current = true;
      setBusy(true);
      setPull(READY);
      navigator.vibrate?.(8);
      const minimum = new Promise((r) => setTimeout(r, 650));
      try {
        await flush().catch(() => {});
        router.refresh();
        await Promise.all([qc.invalidateQueries(), minimum]);
      } finally {
        refreshing.current = false;
        setBusy(false);
        setPull((live.current = 0));
      }
    };

    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchmove", onMove, { passive: false });
    document.addEventListener("touchend", onEnd);
    document.addEventListener("touchcancel", onEnd);
    return () => {
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onEnd);
      document.removeEventListener("touchcancel", onEnd);
    };
  }, [qc, router]);

  if (!pull && !busy) return null;
  const amount = Math.min(1, pull / READY);
  return (
    <>
      {busy && <div aria-hidden="true" className="ana-progress ana-ptr-line" />}
      <div
        role="status"
        aria-label={busy ? "Refreshing" : amount >= 1 ? "Release to refresh" : "Pull to refresh"}
        className="lg:hidden fixed left-1/2 z-[70] pointer-events-none"
        style={{
          top: "var(--safe-top)",
          transform: `translate(-50%, ${Math.max(0, pull - 28)}px)`,
          transition: dragging ? "none" : "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        <span className="grid place-items-center w-11 h-11 rounded-full bg-bg border border-line shadow-[var(--shadow-lift)] text-accent">
          <svg width="26" height="26" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={busy ? "ana-draw" : undefined}>
            {PETALS.map((d, i) => (
              <path
                key={i}
                d={d}
                pathLength={1}
                // While pulling, each petal draws in turn as the pull grows.
                style={busy ? { animationDelay: `${i * 0.14}s` } : { strokeDasharray: 1, strokeDashoffset: 1 - Math.max(0, Math.min(1, amount * PETALS.length - i)) }}
              />
            ))}
          </svg>
        </span>
      </div>
    </>
  );
}
