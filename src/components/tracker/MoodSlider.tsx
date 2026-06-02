"use client";

import { useRef } from "react";
import {
  SmileyMelting,
  Smiley,
  SmileyMeh,
  SmileyNervous,
  SmileySad,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

const MOODS = [
  { key: "low", icon: SmileySad, label: "Low", color: "text-ink-soft" },
  { key: "agitated", icon: SmileyNervous, label: "Agitated", color: "text-ink-soft" },
  { key: "neutral", icon: SmileyMeh, label: "Neutral", color: "text-ink" },
  { key: "content", icon: Smiley, label: "Content", color: "text-accent" },
  { key: "blissful", icon: SmileyMelting, label: "Blissful", color: "text-accent" },
];

interface MoodSliderProps {
  value: string | undefined;
  onChange: (mood: string) => void;
}

export function MoodSlider({ value, onChange }: MoodSliderProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const currentIdx = MOODS.findIndex((m) => m.key === value);
  const progress = currentIdx >= 0 ? ((currentIdx + 1) / MOODS.length) * 100 : 0;
  const SelectedIcon = currentIdx >= 0 ? MOODS[currentIdx].icon : null;
  const selectedLabel = currentIdx >= 0 ? MOODS[currentIdx].label : null;

  function handleBarClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = x / rect.width;
    const idx = Math.min(MOODS.length - 1, Math.max(0, Math.floor(pct * MOODS.length)));
    onChange(MOODS[idx].key);
  }

  function handleBarTouch(e: React.TouchEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    const pct = x / rect.width;
    const idx = Math.min(MOODS.length - 1, Math.max(0, Math.floor(pct * MOODS.length)));
    onChange(MOODS[idx].key);
  }

  return (
    <div className="rounded-16 p-5 bg-surface">
      <p className="font-serif text-base text-ink mb-4">How are you feeling?</p>

      <div className="flex items-center gap-4">
        {/* Continuous progress bar */}
        <div
          ref={barRef}
          className="relative flex-1 h-4 rounded-full bg-surface-2 border border-line cursor-pointer overflow-hidden"
          onClick={handleBarClick}
          onTouchMove={handleBarTouch}
          role="slider"
          aria-label="Mood"
          aria-valuemin={0}
          aria-valuemax={4}
          aria-valuenow={currentIdx >= 0 ? currentIdx : undefined}
          aria-valuetext={selectedLabel ?? "Not set"}
          tabIndex={0}
        >
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-accent transition-all duration-200 ease-out"
            style={{ width: `${progress}%` }}
          />
          {/* Thumb indicator */}
          {currentIdx >= 0 && (
            <div
              className="absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-accent border-2 border-bg shadow-md transition-all duration-200"
              style={{ left: `calc(${progress}% - 10px)` }}
            />
          )}
        </div>

        {/* Mood icon */}
        <div className="flex flex-col items-center gap-0.5 min-w-[48px]">
          {SelectedIcon ? (
            <SelectedIcon size={32} weight="thin" className="text-accent" />
          ) : (
            <SmileyMeh size={32} weight="thin" className="text-ink-soft opacity-30" />
          )}
          {selectedLabel && (
            <span className="font-ui text-[10px] text-accent">{selectedLabel}</span>
          )}
        </div>
      </div>

      {/* Mood labels under the bar */}
      <div className="flex justify-between mt-2 px-0.5">
        {MOODS.map((m) => (
          <button
            key={m.key}
            onClick={() => onChange(m.key)}
            className={cn(
              "font-ui text-[9px] transition-colors",
              value === m.key ? "text-accent font-medium" : "text-ink-soft"
            )}
          >
            {m.label}
          </button>
        ))}
      </div>
    </div>
  );
}
