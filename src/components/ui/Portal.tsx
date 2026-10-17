"use client";

import { createPortal } from "react-dom";
import { useHydrated } from "@/lib/hydrated";

/**
 * Renders overlays (sheets, panels, viewers) at the end of <body>, outside the page. Then
 * nothing a page does (a transform, a filter, overflow) can clip them or change what
 * "fixed" is measured against.
 */
export function Portal({ children }: { children: React.ReactNode }) {
  const ready = useHydrated();
  return ready ? createPortal(children, document.body) : null;
}
