"use client";

import { StampChip, type StampKey } from "@/components/art/StampIcon";

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
      {STAMPS.map((stamp) => (
        <StampChip key={stamp.key} k={stamp.key} selected={selected.includes(stamp.key)} onToggle={() => onToggle(stamp.key)} className="max-sm:px-1.5 max-sm:gap-1 max-sm:text-[12px]" />
      ))}
    </div>
  );
}

export const STAMP_GUIDE = STAMPS.map((s) => ({ key: s.key, label: s.label }));
