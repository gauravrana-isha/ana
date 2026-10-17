"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/*
 * The one switch for choosing between a few options (Daily / Weekly, Light / Dark, the kind
 * of moment…). A pill glides behind the chosen option with a soft spring. Its place is
 * measured inside the switch itself, so page scrolling, sheets and resizing never throw it
 * off. Arrow keys move the choice; phones get a light tap.
 */

export interface SegmentOption<T extends string> {
  value: T;
  label: React.ReactNode;
  /** Shown before the label (or alone, with `iconOnly`). */
  icon?: React.ReactNode;
  /** Accessible name when the label isn't plain text (or with `iconOnly`). */
  name?: string;
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  size = "md",
  fill = false,
  iconOnly = false,
  tone = "plain",
  className,
}: {
  value: T | null;
  onChange: (v: T) => void;
  options: SegmentOption<T>[];
  /** What the choice is about, for screen readers. */
  label: string;
  size?: "sm" | "md";
  /** Stretch to the full width, every option the same width (`"mobile"`: on phones only). */
  fill?: boolean | "mobile";
  iconOnly?: boolean;
  /** "plain": a light pill. "accent": a teal pill. "outline": a teal pill on a hairline track (small icon toggles). */
  tone?: "plain" | "accent" | "outline";
  className?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [pill, setPill] = useState<{ x: number; w: number } | null>(null);
  const [ready, setReady] = useState(false);
  const index = options.findIndex((o) => o.value === value);

  // Measure the chosen option (and again whenever the switch changes size).
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => {
      const btn = el.children[index + 1] as HTMLElement | undefined; // child 0 is the pill
      setPill(btn && index >= 0 ? { x: btn.offsetLeft, w: btn.offsetWidth } : null);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    // The first placement doesn't animate; changes after it do.
    const t = requestAnimationFrame(() => setReady(true));
    return () => {
      ro.disconnect();
      cancelAnimationFrame(t);
    };
  }, [index, options.length]);

  function choose(i: number) {
    const o = options[i];
    if (!o || o.value === value) return;
    onChange(o.value);
    if (typeof navigator !== "undefined" && "vibrate" in navigator && matchMedia("(pointer: coarse)").matches) navigator.vibrate(6);
  }

  function onKey(e: React.KeyboardEvent) {
    const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const next = Math.max(0, Math.min(options.length - 1, (index < 0 ? 0 : index) + d));
    choose(next);
    (box.current?.children[next + 1] as HTMLElement | undefined)?.focus();
  }

  const h = size === "sm" ? "h-8" : "h-9";
  return (
    <div
      ref={box}
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKey}
      className={cn(
        "relative p-1 rounded-full",
        tone === "outline" ? "border border-line" : "bg-surface",
        fill === true ? "grid" : fill === "mobile" ? "max-sm:grid inline-flex" : "inline-flex",
        className
      )}
      style={fill ? { gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` } : undefined}
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute top-1 bottom-1 left-0 rounded-full pointer-events-none",
          tone === "plain" ? "bg-bg shadow-[var(--shadow-soft)]" : "bg-accent",
          !pill && "opacity-0"
        )}
        style={{
          width: pill?.w ?? 0,
          transform: `translateX(${pill?.x ?? 0}px)`,
          transition: ready ? "transform 0.42s cubic-bezier(0.32, 1.25, 0.5, 1), width 0.42s cubic-bezier(0.32, 1.25, 0.5, 1), opacity 0.2s" : "none",
        }}
      />
      {options.map((o, i) => {
        const on = i === index;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={iconOnly ? o.name ?? (typeof o.label === "string" ? o.label : undefined) : o.name}
            title={iconOnly ? o.name ?? (typeof o.label === "string" ? o.label : undefined) : undefined}
            tabIndex={on || (index < 0 && i === 0) ? 0 : -1}
            onClick={() => choose(i)}
            className={cn(
              "press relative z-[1] inline-flex items-center justify-center gap-1.5 rounded-full font-ui font-semibold whitespace-nowrap outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-accent/40",
              h,
              iconOnly ? (size === "sm" ? "w-8" : "w-9") : size === "sm" ? "px-3 text-[12.5px]" : "px-4 text-[13.5px]",
              on ? (tone === "plain" ? "text-ink" : "text-bg") : "text-ink-soft hover:text-ink"
            )}
          >
            {o.icon}
            {!iconOnly && o.label}
          </button>
        );
      })}
    </div>
  );
}
