"use client";

import { useSyncExternalStore } from "react";

/*
 * The part of the screen not covered by the on-screen keyboard. On iPhone the keyboard
 * overlays the page instead of shrinking it, so a sheet pinned to the bottom of the window
 * ends up behind the keyboard; sizing it to this area keeps its fields and buttons in view.
 */
type Area = { top: number; height: number } | null;

let current: Area = null;
function read(): Area {
  const vv = window.visualViewport;
  if (!vv) return null;
  const next = { top: Math.round(vv.offsetTop), height: Math.round(vv.height) };
  if (!current || current.top !== next.top || current.height !== next.height) current = next;
  return current;
}
function subscribe(cb: () => void) {
  const vv = window.visualViewport;
  vv?.addEventListener("resize", cb);
  vv?.addEventListener("scroll", cb);
  return () => {
    vv?.removeEventListener("resize", cb);
    vv?.removeEventListener("scroll", cb);
  };
}

/** Style for a fixed overlay so it fills only the visible area (falls back to the window). */
export function useVisibleArea(active: boolean): React.CSSProperties | undefined {
  const area = useSyncExternalStore(subscribe, read, () => null);
  if (!active || !area) return undefined;
  return { top: area.top, height: area.height, bottom: "auto" };
}
