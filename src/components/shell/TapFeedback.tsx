"use client";

import { useEffect } from "react";

/** Elements that also give a tiny vibration (Android; iPhone doesn't allow it from the web). */
const HAPTIC = "[aria-pressed], [role=switch], [role=tab], .ana-tabbar a, [data-haptic]";
/** Long enough to see on a quick tap; short enough not to feel sticky. */
const MIN_PRESS_MS = 140;
/** On touch, wait this long before showing a press: a scroll usually declares itself sooner. */
const TOUCH_DELAY_MS = 90;
/** A finger that moves this far is scrolling, not tapping. */
const SLOP_PX = 8;

/**
 * Makes taps feel like taps. A `.press` element gets `.is-pressed` while it's being pressed and
 * keeps it for at least a beat after release (a quick tap is otherwise too fast to see, and
 * iPhone Safari skips :active entirely). With a mouse that's instant. With a finger it waits a
 * moment and gives up as soon as the finger moves, so starting a scroll on a card or a photo
 * never makes it shrink and spring back. Toggles, tabs and the tab bar also give a short
 * vibration where the device allows it.
 */
export function TapFeedback() {
  useEffect(() => {
    let el: HTMLElement | null = null;
    let start = { x: 0, y: 0 };
    let shownAt = 0;
    let showTimer: number | undefined;
    let hideTimer: number | undefined;

    const show = (t: HTMLElement) => {
      shownAt = performance.now();
      t.classList.add("is-pressed");
    };
    const hide = (t: HTMLElement) => {
      const wait = Math.max(0, MIN_PRESS_MS - (performance.now() - shownAt));
      window.clearTimeout(hideTimer);
      hideTimer = window.setTimeout(() => t.classList.remove("is-pressed"), wait);
    };
    // Not a tap after all: drop it without any visible change.
    const cancel = () => {
      window.clearTimeout(showTimer);
      el?.classList.remove("is-pressed");
      el = null;
    };

    const down = (e: PointerEvent) => {
      if (e.button !== 0) return;
      const t = (e.target as Element | null)?.closest?.<HTMLElement>(".press");
      if (!t || t.matches(":disabled, [aria-disabled=true]")) return;
      cancel();
      el = t;
      start = { x: e.clientX, y: e.clientY };
      if (e.pointerType === "touch") {
        showTimer = window.setTimeout(() => el === t && show(t), TOUCH_DELAY_MS);
      } else show(t);
    };
    const move = (e: PointerEvent) => {
      if (el && e.pointerType === "touch" && Math.hypot(e.clientX - start.x, e.clientY - start.y) > SLOP_PX) cancel();
    };
    const up = (e: PointerEvent) => {
      const t = el;
      if (!t) return;
      el = null;
      window.clearTimeout(showTimer);
      // A quick tap lifts before the delay: show the press briefly so it still feels like one.
      if (!t.classList.contains("is-pressed")) show(t);
      if (e.pointerType === "touch" && t.closest(HAPTIC)) navigator.vibrate?.(8);
      hide(t);
    };

    document.addEventListener("pointerdown", down, { capture: true, passive: true });
    document.addEventListener("pointermove", move, { capture: true, passive: true });
    document.addEventListener("pointerup", up, { capture: true, passive: true });
    document.addEventListener("pointercancel", cancel, { capture: true, passive: true });
    window.addEventListener("scroll", cancel, { capture: true, passive: true });
    return () => {
      document.removeEventListener("pointerdown", down, true);
      document.removeEventListener("pointermove", move, true);
      document.removeEventListener("pointerup", up, true);
      document.removeEventListener("pointercancel", cancel, true);
      window.removeEventListener("scroll", cancel, true);
      window.clearTimeout(showTimer);
      window.clearTimeout(hideTimer);
    };
  }, []);
  return null;
}
