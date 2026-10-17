"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

type Phase = "idle" | "start" | "crawl" | "done";

/**
 * A thin accent line along the top edge while a page change is under way, as native apps
 * and browsers show: it starts on the tap (or back/forward), creeps toward the end while
 * the page loads, completes when the new page is on screen, then fades.
 *
 * Driven by explicit timers rather than reacting to its own state, so rapid taps (a new trip
 * starting the moment the last one ends, or a tap back to the page already showing) can't
 * leave it stuck.
 */
export function NavProgress() {
  const pathname = usePathname();
  const [phase, setPhase] = useState<Phase>("idle");
  const active = useRef(false);
  const timers = useRef<{ hide?: number; safety?: number; frame?: number }>({});

  // Kept in a ref so the listeners (attached once) always call the same functions.
  const api = useRef({
    clear() {
      const t = timers.current;
      window.clearTimeout(t.hide);
      window.clearTimeout(t.safety);
      if (t.frame) cancelAnimationFrame(t.frame);
      timers.current = {};
    },
    begin() {
      api.current.clear();
      active.current = true;
      setPhase("start");
      timers.current.frame = requestAnimationFrame(() => {
        timers.current.frame = requestAnimationFrame(() => setPhase((p) => (p === "start" ? "crawl" : p)));
      });
      // Never hang around: if no page change is seen, let the line go after a few seconds.
      timers.current.safety = window.setTimeout(() => api.current.finish(), 6_000);
    },
    finish() {
      if (!active.current) return;
      api.current.clear();
      active.current = false;
      setPhase("done");
      timers.current.hide = window.setTimeout(() => setPhase("idle"), 420);
    },
  });

  // The new page is on screen.
  const shown = useRef(pathname);
  useEffect(() => {
    shown.current = pathname;
    api.current.finish();
  }, [pathname]);

  useEffect(() => {
    const ctl = api.current;
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      // A tap back to the page already on screen cancels the trip (the address won't change).
      if (url.pathname === location.pathname) ctl.finish();
      else ctl.begin();
    };
    // Back and forward to a page that's still in memory: Next swaps it in before this runs,
    // so the change it waits for has already happened. If what's shown already matches the
    // address a moment later, finish instead of waiting for the safety timeout.
    const onPop = () => {
      ctl.begin();
      requestAnimationFrame(() => requestAnimationFrame(() => shown.current === location.pathname && ctl.finish()));
    };
    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPop);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPop);
      ctl.clear();
    };
  }, []);

  if (phase === "idle") return null;
  const scale = phase === "start" ? 0.08 : phase === "crawl" ? 0.86 : 1;
  return (
    <div
      aria-hidden="true"
      className="ana-progress"
      style={{
        transform: `scaleX(${scale})`,
        opacity: phase === "done" ? 0 : 1,
        transition:
          phase === "crawl"
            ? "transform 6s cubic-bezier(0.1, 0.7, 0.2, 1)"
            : phase === "done"
              ? "transform 0.2s ease-out, opacity 0.3s ease 0.15s"
              : "none",
      }}
    />
  );
}
