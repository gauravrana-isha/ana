"use client";

import { useEffect } from "react";

const MIN_MS = 2500;
const FADE_MS = 500;

/** Fades the splash out once the app is ready and it has shown for at least 2.5s. */
export function SplashController() {
  useEffect(() => {
    const html = document.documentElement;
    if (!html.classList.contains("splash")) return;

    const wait = Math.max(0, MIN_MS - performance.now());
    let fade: ReturnType<typeof setTimeout>;
    const hide = setTimeout(() => {
      html.classList.add("splash-out");
      fade = setTimeout(() => html.classList.remove("splash", "splash-out"), FADE_MS);
    }, wait);

    return () => {
      clearTimeout(hide);
      clearTimeout(fade);
    };
  }, []);

  return null;
}
