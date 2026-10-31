"use client";

import { useEffect } from "react";
import { whenRestored } from "@/lib/restored";

const FADE_MS = 300;
/** Never longer than this, whatever is still loading (a locked device, the sign-in page). */
const MAX_MS = 1000;

/**
 * Fades the splash out as soon as the app is ready: the journal kept on this device is back on
 * screen (not a spinner or a skeleton in its place), or a second at most. It used to stay at
 * least 2.5s, so every launch took 3 seconds however quickly the screen was there behind it.
 */
export function SplashController() {
  useEffect(() => {
    const html = document.documentElement;
    if (!html.classList.contains("splash")) return;

    let fade: ReturnType<typeof setTimeout>;
    let frame = 0;
    let gone = false;
    const hide = () => {
      if (gone) return;
      gone = true;
      html.classList.add("splash-out");
      fade = setTimeout(() => html.classList.remove("splash", "splash-out"), FADE_MS);
    };
    const cap = setTimeout(hide, Math.max(0, MAX_MS - performance.now()));
    // Restored, then two frames: the screen has been drawn with it.
    void whenRestored().then(() => {
      frame = requestAnimationFrame(() => (frame = requestAnimationFrame(hide)));
    });

    return () => {
      gone = true;
      clearTimeout(cap);
      clearTimeout(fade);
      cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}
