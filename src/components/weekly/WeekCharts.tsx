"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const SHORT = ["Su", "M", "Tu", "W", "Th", "F", "Sa"];
const dow = (iso: string) => new Date(iso + "T12:00:00").getDay();

/**
 * Seven thin bars, one hue. Recessive baseline, the peak labelled directly, the average as a
 * dashed guide, and a tooltip on hover/focus. Future days are an empty outline.
 */
export function WeekBars({
  days,
  today,
  values,
  format,
  label,
  average = false,
}: {
  days: string[];
  today: string;
  values: (number | null)[];
  format: (v: number) => string;
  label: string;
  average?: boolean;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const H = 112;
  const logged = values.filter((v): v is number => v !== null && v > 0);
  const max = Math.max(1, ...logged);
  const peak = logged.length ? values.indexOf(Math.max(...logged)) : -1;
  const avg = logged.length ? logged.reduce((a, b) => a + b, 0) / logged.length : 0;

  return (
    <figure aria-label={label}>
      <div className="relative mt-5" style={{ height: H + 22 }}>
        {/* average guide */}
        {average && avg > 0 && (
          <div className="absolute inset-x-0 border-t border-dashed border-ink-soft/40" style={{ bottom: 22 + (avg / max) * H }}>
            <span className="absolute right-0 -top-[9px] -translate-y-full font-ui text-[11px] text-ink-soft tabular">avg {format(avg)}</span>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-[22px] border-t border-line" />
        <div className="absolute inset-0 grid grid-cols-7 gap-2">
          {days.map((d, i) => {
            const v = values[i];
            const future = d > today;
            const h = v ? Math.max(4, (v / max) * H) : 0;
            return (
              <button
                key={d}
                type="button"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                aria-label={`${DAY[dow(d)]}: ${future ? "still to come" : v ? format(v) : "nothing logged"}`}
                className="group relative flex flex-col items-center justify-end outline-none"
              >
                {/* hit area is the whole column */}
                <span className="relative w-full flex justify-center" style={{ height: H }}>
                  {i === peak && hover === null && !average && v ? (
                    <span className="absolute font-ui text-[11.5px] font-semibold text-ink tabular whitespace-nowrap" style={{ bottom: h + 4 }}>{format(v)}</span>
                  ) : null}
                  {future ? (
                    <span className="absolute bottom-0 w-[min(28px,70%)] h-3 rounded-t-[4px] border border-dashed border-line border-b-0" />
                  ) : (
                    <span
                      className={cn("absolute bottom-0 w-[min(28px,70%)] rounded-t-[4px] transition-[height,opacity] duration-300", hover !== null && hover !== i ? "opacity-50" : "opacity-100")}
                      style={{ height: h, background: "var(--accent)" }}
                    />
                  )}
                </span>
                <span className={cn("h-[22px] pt-1.5 font-ui text-[11.5px] font-semibold", d === today ? "text-accent" : "text-ink-soft")}>{SHORT[dow(d)]}</span>
                {hover === i && (
                  <span className="pointer-events-none absolute z-10 bottom-[calc(100%-6px)] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-[8px] bg-ink text-bg px-2 py-1 font-ui text-[12px] font-medium ana-tip">
                    {DAY[dow(d)]} · {future ? "to come" : v ? format(v) : "none"}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </figure>
  );
}

/** Practice × day grid: filled when kept, the day's value on hover. Fits a phone. */
export function WeekGrid({
  days,
  today,
  rows,
  renderIcon,
}: {
  days: string[];
  today: string;
  rows: { id: string; name: string; cells: (string | null)[]; kept: number }[];
  renderIcon: (id: string) => React.ReactNode;
}) {
  const past = days.filter((d) => d <= today).length;
  return (
    <div role="table" aria-label="Practices this week" className="flex flex-col gap-2">
      <div role="row" className="hidden sm:grid grid-cols-[minmax(0,1fr)_repeat(7,34px)_40px] gap-1.5 items-end">
        <span />
        {days.map((d) => (
          <span key={d} role="columnheader" className={cn("text-center font-ui text-[11px] font-semibold", d === today ? "text-accent" : "text-ink-soft")}>{SHORT[dow(d)]}</span>
        ))}
        <span role="columnheader" className="text-right font-ui text-[11px] font-semibold text-ink-soft">Days</span>
      </div>
      {rows.map((r) => (
        <div role="row" key={r.id} className="grid grid-cols-[repeat(7,minmax(0,1fr))_40px] sm:grid-cols-[minmax(0,1fr)_repeat(7,34px)_40px] gap-1.5 items-center pb-2 sm:pb-0 border-b border-line/60 sm:border-0 last:border-0">
          <span role="rowheader" className="col-span-8 sm:col-span-1 flex items-center gap-2 min-w-0">
            {renderIcon(r.id)}
            <span className="font-serif text-[14px] text-ink truncate">{r.name}</span>
          </span>
          {r.cells.map((c, i) => {
            const d = days[i];
            const kept = !!c;
            return (
              <span
                key={d}
                role="cell"
                tabIndex={0}
                aria-label={`${r.name}, ${DAY[dow(d)]}: ${c === null ? "still to come" : kept ? (c === "✓" ? "done" : c) : "not logged"}`}
                className={cn(
                  "group relative rounded-[7px] outline-none focus-visible:ring-2 focus-visible:ring-accent",
                  "h-8 sm:h-auto sm:aspect-square",
                  c === null ? "border border-dashed border-line" : kept ? "bg-accent" : "bg-bg",
                  d === today && !kept && "border border-accent/50"
                )}
              >
                <span aria-hidden="true" className={cn("sm:hidden absolute inset-0 grid place-items-center font-ui text-[10.5px] font-semibold", kept ? "text-bg/80" : d === today ? "text-accent" : "text-ink-soft/60")}>{SHORT[dow(d)]}</span>
                {kept && (
                  <span className="pointer-events-none absolute z-10 bottom-[calc(100%+6px)] left-1/2 -translate-x-1/2 hidden group-hover:block group-focus-visible:block whitespace-nowrap rounded-[8px] bg-ink text-bg px-2 py-1 font-ui text-[12px] font-medium ana-tip">
                    {DAY[dow(d)]} · {c === "✓" ? "done" : c}
                  </span>
                )}
              </span>
            );
          })}
          <span className="text-right font-ui text-[12.5px] text-ink-soft tabular">
            {r.kept}/{past}
          </span>
        </div>
      ))}
    </div>
  );
}
