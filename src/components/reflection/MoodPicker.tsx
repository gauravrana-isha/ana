"use client";

import { useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { MoodBadge, MoodFace, type MoodKey } from "@/components/art/MoodFace";
import { cn } from "@/lib/utils";

const MOODS: { key: MoodKey; label: string }[] = [
  { key: "low", label: "Low" },
  { key: "agitated", label: "Agitated" },
  { key: "neutral", label: "Neutral" },
  { key: "content", label: "Content" },
  { key: "blissful", label: "Blissful" },
];

interface MoodPickerProps {
  value: string | null;
  onChange: (mood: string | null) => void;
  /** Already inside a card (the stepper): no card of its own. */
  bare?: boolean;
}

/**
 * Five faces, spread across the width: tap one, or slide a finger along the row to move
 * between them. The chosen face turns into its coloured badge, with a soft pill gliding
 * behind it. Arrow keys work too (it's a radio group).
 */
export function MoodPicker({ value, onChange, bare = false }: MoodPickerProps) {
  const reduce = useReducedMotion();
  const rowRef = useRef<HTMLDivElement>(null);
  const [sliding, setSliding] = useState(false);
  const current = MOODS.findIndex((m) => m.key === value);

  function pickAt(clientX: number) {
    const r = rowRef.current?.getBoundingClientRect();
    if (!r) return;
    const i = Math.max(0, Math.min(MOODS.length - 1, Math.floor(((clientX - r.left) / r.width) * MOODS.length)));
    if (MOODS[i].key !== value) {
      onChange(MOODS[i].key);
      if (navigator.vibrate && sliding) navigator.vibrate(6);
    }
  }

  function onKey(e: React.KeyboardEvent) {
    const d = e.key === "ArrowRight" || e.key === "ArrowUp" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowDown" ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const next = Math.max(0, Math.min(MOODS.length - 1, (current < 0 ? 2 : current) + (current < 0 ? 0 : d)));
    onChange(MOODS[next].key);
    (rowRef.current?.children[next] as HTMLElement | undefined)?.focus();
  }

  return (
    <div className={bare ? undefined : "rounded-16 p-5 sm:p-6 bg-surface"}>
      <p className="font-serif text-lg text-ink mb-4">How are you feeling?</p>

      <div
        ref={rowRef}
        role="radiogroup"
        aria-label="Mood"
        onKeyDown={onKey}
        // Slide along the row to choose; vertical scrolling still works.
        className="grid grid-cols-5 gap-1 touch-pan-y select-none"
        onPointerDown={(e) => {
          setSliding(true);
          pickAt(e.clientX);
        }}
        onPointerMove={(e) => sliding && pickAt(e.clientX)}
        onPointerUp={() => setSliding(false)}
        onPointerCancel={() => setSliding(false)}
        onPointerLeave={() => setSliding(false)}
      >
        {MOODS.map((m, i) => {
          const on = i === current;
          return (
            <button
              key={m.key}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={m.label}
              tabIndex={on || (current < 0 && i === 2) ? 0 : -1}
              onClick={() => onChange(m.key)}
              className="press relative flex flex-col items-center gap-2 pt-3 pb-2.5 rounded-[18px] outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            >
              {on && (
                <motion.span
                  layoutId="mood-pill"
                  className="absolute inset-0 rounded-[18px] bg-bg shadow-[var(--shadow-soft)]"
                  transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 520, damping: 38 }}
                />
              )}
              <span className="relative grid place-items-center w-11 h-11">
                {on ? (
                  <motion.span key="badge" initial={reduce ? false : { scale: 0.7 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 22 }}>
                    <MoodBadge k={m.key} size={44} />
                  </motion.span>
                ) : (
                  <MoodFace k={m.key} size={32} className="text-ink-soft" />
                )}
              </span>
              <span className={cn("relative font-ui text-[11.5px] leading-none", on ? "text-accent font-semibold" : "text-ink-soft")}>{m.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
