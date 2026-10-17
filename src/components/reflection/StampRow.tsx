"use client";

import { useState } from "react";
import { StampBadge, StampChip, type StampKey } from "@/components/art/StampIcon";
import { Sheet } from "@/components/ui/Sheet";
import { InfoMark } from "@/components/art/PenMarks";

const STAMPS = [
  { key: "growth", label: "Growth", meaning: "Something shifted upward" },
  { key: "struggle", label: "Struggle", meaning: "Resistance, difficulty" },
  { key: "insight", label: "Insight", meaning: "A realization landed" },
  { key: "stillness", label: "Stillness", meaning: "Peace, no movement needed" },
  { key: "devotion", label: "Devotion", meaning: "Gratitude, offering" },
] as const satisfies readonly { key: StampKey; label: string; meaning: string }[];

interface StampRowProps {
  selected: string[];
  onToggle: (stamp: string) => void;
}

/** The five stamps, with a small ⓘ that says what each one means. */
export function StampRow({ selected, onToggle }: StampRowProps) {
  const [guide, setGuide] = useState(false);
  return (
    <div className="grid grid-cols-3 gap-1.5 sm:flex sm:flex-wrap sm:items-center sm:gap-2 mt-2">
      {STAMPS.map((stamp) => (
        <StampChip key={stamp.key} k={stamp.key} selected={selected.includes(stamp.key)} onToggle={() => onToggle(stamp.key)} className="max-sm:px-1.5 max-sm:gap-1 max-sm:text-[12px]" />
      ))}
      <button
        type="button"
        onClick={() => setGuide(true)}
        aria-label="What the stamps mean"
        className="press inline-flex items-center justify-center gap-1 h-9 px-2.5 rounded-full font-ui text-[12.5px] font-semibold text-ink-soft hover:text-ink hover:bg-surface-2"
      >
        <InfoMark size={17} /> <span className="sm:hidden">Meaning</span>
      </button>
      <Sheet open={guide} onClose={() => setGuide(false)} title="Stamps">
        <ul className="flex flex-col gap-3 pb-2">
          {STAMPS.map((s) => (
            <li key={s.key} className="flex items-center gap-3">
              <StampBadge k={s.key} size={38} />
              <span>
                <span className="block font-ui text-[14.5px] font-semibold text-ink">{s.label}</span>
                <span className="block font-ui text-[13px] text-ink-soft">{s.meaning}</span>
              </span>
            </li>
          ))}
        </ul>
      </Sheet>
    </div>
  );
}

export const STAMP_GUIDE = STAMPS.map((s) => ({ key: s.key, label: s.label }));
