"use client";

import { cn } from "@/lib/utils";

/*
 * What every bundle's Insights section shares: the data (worked out on the device from
 * /api/insights), a titled block, and a cell that names itself on hover or focus.
 */

export interface InsightsData {
  month: { label: string; days: string[]; todayIndex: number };
  practices: { id: string; name: string; iconName: string; catalogId: string | null; days: (boolean | null)[] }[];
  rhythm: { id: string; name: string; iconName: string; catalogId: string | null; kind: string; usual: string | null; days: number }[];
  mood: { date: string; level: number | null }[];
  together: { name: string; withAvg: number; withoutAvg: number; withDays: number; withoutDays: number }[];
  people: { id: string; name: string; photoId: string | null; count: number }[];
  has: { tracker: boolean; daily: boolean; people: boolean };
}

export const MOODS = ["Low", "Agitated", "Neutral", "Content", "Blissful"];
// One hue, light → dark: the theme's teal mixed into the card surface. Lightness steps
// monotonically in both themes (in dark mode more teal reads lighter, the flipped anchor).
export const MOOD_FILL = [20, 40, 60, 80, 100].map((p) => `color-mix(in srgb, var(--accent) ${p}%, var(--surface-2))`);

export function fmtDay(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}


export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-[20px] font-semibold text-ink">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** A cell with a hover/focus tooltip. */
export function Cell({ label, className, style }: { label: string; className?: string; style?: React.CSSProperties }) {
  return (
    <span tabIndex={0} role="img" aria-label={label} className={cn("group relative block outline-none focus-visible:ring-2 focus-visible:ring-accent", className)} style={style}>
      {/* Kept out of layout until shown, so edge cells never widen the page. */}
      <span className="ana-tip pointer-events-none absolute bottom-[calc(100%+6px)] left-1/2 -translate-x-1/2 z-10 hidden group-hover:block group-focus-visible:block whitespace-nowrap rounded-[8px] bg-ink text-bg px-2 py-1 font-ui text-[12px] font-medium">
        {label}
      </span>
    </span>
  );
}

