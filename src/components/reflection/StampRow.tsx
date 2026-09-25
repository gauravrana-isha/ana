"use client";

import { StampIcon, type StampKey } from "@/components/art/StampIcon";
import { cn } from "@/lib/utils";

const STAMPS = [
  { key: "growth", label: "Growth" },
  { key: "struggle", label: "Struggle" },
  { key: "insight", label: "Insight" },
  { key: "stillness", label: "Stillness" },
  { key: "devotion", label: "Devotion" },
] as const satisfies readonly { key: StampKey; label: string }[];

interface StampRowProps {
  selected: string[];
  onToggle: (stamp: string) => void;
}

export function StampRow({ selected, onToggle }: StampRowProps) {
  return (
    <div className="grid grid-cols-3 gap-1.5 sm:flex sm:flex-wrap sm:gap-2 mt-2">
      {STAMPS.map((stamp) => {
        const isOn = selected.includes(stamp.key);
        return (
          <button
            key={stamp.key}
            onClick={() => onToggle(stamp.key)}
            className={cn(
              "press flex items-center justify-center sm:justify-start gap-1 sm:gap-1.5 h-8 px-1.5 sm:px-3 min-w-0 rounded-full border transition-colors text-[12px] sm:text-[12.5px] font-medium",
              isOn
                ? "bg-accent-soft border-accent text-accent"
                : "border-line text-ink-soft hover:text-ink hover:border-ink-soft/40"
            )}
            aria-label={stamp.label}
            aria-pressed={isOn}
            title={stamp.label}
          >
            <StampIcon k={stamp.key} size={14} />
            <span className="font-ui truncate">{stamp.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export const STAMP_GUIDE = STAMPS.map((s) => ({ key: s.key, label: s.label }));
