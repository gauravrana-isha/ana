"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, type ComponentProps } from "react";
import type { MomentComposer as Composer } from "./MomentComposer";

/*
 * The moment form carries the rich-text editor (~130 KB compressed). Screens that offer it
 * (Today, Moments, a person's page) shouldn't pay for it until someone writes, so it's
 * fetched quietly once the page is idle and only mounted the first time it opens.
 */
const load = () => import("./MomentComposer");

/** Fetch the form's code now (so it's on the device for offline use). */
export const preloadMomentComposer = () => load().then(() => undefined);
const MomentComposer = dynamic(() => load().then((m) => m.MomentComposer), { ssr: false });

export function LazyMomentComposer(props: ComponentProps<typeof Composer>) {
  const [mounted, setMounted] = useState(false);
  if (props.open && !mounted) setMounted(true);

  useEffect(() => {
    // Safari has no requestIdleCallback; a short delay does the same job there.
    if (typeof window.requestIdleCallback === "function") window.requestIdleCallback(() => void load(), { timeout: 3000 });
    else setTimeout(() => void load(), 1500);
  }, []);

  return mounted ? <MomentComposer {...props} /> : null;
}
