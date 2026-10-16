"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

type Phase = "idle" | "start" | "crawl" | "done";

/**
 * A thin accent line along the top edge while a page change is under way, as native apps
 * and browsers show: it starts on the tap (or back/forward), creeps toward the end while
 * the page loads, completes when the new page is on screen, then fades.
 */
export function NavProgress() {
  const pathname = usePathname();
  const [phase, setPhase] = useState<Phase>("idle");
  const [shownFor, setShownFor] = useState(pathname);
  const safety = useRef<number | undefined>(undefined);

  // The new page is here: finish the line (adjusting state during render, keyed on the path).
  if (pathname !== shownFor) {
    setShownFor(pathname);
    if (phase !== "idle") setPhase("done");
  }

  useEffect(() => {
    const begin = () => {
      setPhase("start");
      // Only creep if the page hasn't already arrived: pages reused from the cache can land
      // before the next frame, and a late "crawl" would leave the line stuck part-way.
      requestAnimationFrame(() => requestAnimationFrame(() => setPhase((p) => (p === "start" ? "crawl" : p))));
      window.clearTimeout(safety.current);
      safety.current = window.setTimeout(() => setPhase("done"), 10_000);
    };
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || url.pathname === location.pathname) return;
      begin();
    };
    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", begin);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", begin);
      window.clearTimeout(safety.current);
    };
  }, []);

  useEffect(() => {
    if (phase !== "done") return;
    window.clearTimeout(safety.current);
    const t = window.setTimeout(() => setPhase("idle"), 420);
    return () => window.clearTimeout(t);
  }, [phase]);

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
