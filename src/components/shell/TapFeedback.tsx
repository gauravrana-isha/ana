"use client";

import { useEffect } from "react";

/** Elements that also give a tiny vibration (Android; iPhone doesn't allow it from the web). */
const HAPTIC = "[aria-pressed], [role=switch], [role=tab], .ana-tabbar a, [data-haptic]";
/** Long enough to see on a quick tap; short enough not to feel sticky. */
const MIN_PRESS_MS = 140;

/**
 * Makes taps feel like taps. A `.press` element gets `.is-pressed` the instant a finger
 * lands and keeps it for at least a beat after release (a quick tap is otherwise too fast
 * for :active to show, and iPhone Safari skips :active entirely). Toggles, tabs and the tab
 * bar also give a short vibration where the device allows it.
 */
export function TapFeedback() {
  useEffect(() => {
    let el: HTMLElement | null = null;
    let since = 0;
    let timer: number | undefined;

    const release = () => {
      const target = el;
      el = null;
      if (!target) return;
      const wait = Math.max(0, MIN_PRESS_MS - (performance.now() - since));
      window.clearTimeout(timer);
      timer = window.setTimeout(() => target.classList.remove("is-pressed"), wait);
    };
    const down = (e: PointerEvent) => {
      if (e.button !== 0) return;
      const t = (e.target as Element | null)?.closest?.<HTMLElement>(".press");
      if (!t || t.matches(":disabled, [aria-disabled=true]")) return;
      if (el && el !== t) el.classList.remove("is-pressed");
      el = t;
      since = performance.now();
      t.classList.add("is-pressed");
      if (e.pointerType === "touch" && t.closest(HAPTIC)) navigator.vibrate?.(8);
    };

    document.addEventListener("pointerdown", down, { capture: true, passive: true });
    document.addEventListener("pointerup", release, { capture: true, passive: true });
    document.addEventListener("pointercancel", release, { capture: true, passive: true });
    // A scroll that starts on a card shouldn't leave it looking pressed.
    window.addEventListener("scroll", release, { capture: true, passive: true });
    return () => {
      document.removeEventListener("pointerdown", down, true);
      document.removeEventListener("pointerup", release, true);
      document.removeEventListener("pointercancel", release, true);
      window.removeEventListener("scroll", release, true);
      window.clearTimeout(timer);
    };
  }, []);
  return null;
}
