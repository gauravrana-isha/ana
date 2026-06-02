"use client";

import {
  Rocket,
  Mountains,
  Lightbulb,
  Leaf,
  Flame,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

const STAMPS = [
  { key: "growth", label: "Growth", icon: Rocket },
  { key: "struggle", label: "Struggle", icon: Mountains },
  { key: "insight", label: "Insight", icon: Lightbulb },
  { key: "stillness", label: "Stillness", icon: Leaf },
  { key: "devotion", label: "Devotion", icon: Flame },
];

interface StampRowProps {
  selected: string[];
  onToggle: (stamp: string) => void;
}

export function StampRow({ selected, onToggle }: StampRowProps) {
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {STAMPS.map((stamp) => {
        const isOn = selected.includes(stamp.key);
        const Icon = stamp.icon;
        return (
          <button
            key={stamp.key}
            onClick={() => onToggle(stamp.key)}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border transition-all text-xs",
              isOn
                ? "bg-accent-soft border-accent text-accent"
                : "border-line text-ink-soft opacity-50 hover:opacity-80"
            )}
            aria-label={stamp.label}
            aria-pressed={isOn}
            title={stamp.label}
          >
            <Icon size={14} weight={isOn ? "fill" : "thin"} />
            <span className="font-ui">{stamp.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export const STAMP_GUIDE = STAMPS.map((s) => ({ key: s.key, label: s.label }));
