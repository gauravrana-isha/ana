"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { flush } from "@/lib/outbox";
import { showConnectivityNote } from "./ConnectivityIndicator";
import { cn } from "@/lib/utils";

const READY = 72; // how far to pull (after damping) before letting go refreshes
const MAX = 110;

/**
 * ana's own pull-to-refresh (phones): pull down at the top of a page and the coiled snake
 * winds as you pull, settling (with a light buzz) at the mark; let go past it and it turns
 * while the page's data is fetched fresh (no full reload, so
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
  const armed = useRef(false);

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
      // Crossing the mark: a light buzz, once each way.
      if (damped >= READY !== armed.current) {
        armed.current = damped >= READY;
        if (armed.current) navigator.vibrate?.(6);
      }
    };
    const onEnd = async () => {
      if (!start.current) return;
      start.current = null;
      setDragging(false);
      armed.current = false;
      const ready = live.current >= READY;
      if (!ready) {
        setPull((live.current = 0));
        return;
      }
      refreshing.current = true;
      setBusy(true);
      setPull(READY);
      const minimum = new Promise((r) => setTimeout(r, 650));
      try {
        if (!navigator.onLine) {
          // Offline the page can't be fetched again (trying would reload it from the phone's
          // saved copy): what's shown is already everything on this phone.
          await minimum;
          showConnectivityNote("Offline · this is everything on your phone");
          return;
        }
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

  // The page follows the pull (and springs back), opening room for the coil above it.
  // Only while pulling (a transform on the page would unpin anything fixed inside it); after
  // springing back, the page is left untransformed again.
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--ptr", `${pull}px`);
    root.classList.toggle("ptr-drag", dragging);
    if (pull > 0) {
      root.classList.add("ptr-on");
      return;
    }
    const t = setTimeout(() => root.classList.remove("ptr-on"), 320);
    return () => clearTimeout(t);
  }, [pull, dragging]);

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
          transform: `translate(-50%, ${Math.max(0, (pull - 48) / 2)}px)`,
          transition: dragging ? "none" : "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* No bubble: the page slides down as you pull, and the coil sits in the space that opens above it. */}
        <span className="grid place-items-center w-12 h-12 text-accent">
          {/* Turning: with the pull while dragging (a full turn by the mark), on its own while refreshing. */}
          <span
            aria-hidden="true"
            className={cn("block", busy ? "ana-coil" : "ana-coil-shape")}
            style={{
              width: 32,
              height: 40,
              ...(busy ? {} : { transform: `rotate(${Math.round(pull * 4)}deg) scale(${amount >= 1 ? 1.08 : 0.85 + amount * 0.15})`}),
            }}
          />
        </span>
      </div>
    </>
  );
}
