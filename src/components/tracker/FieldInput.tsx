"use client";

import { useState } from "react";
import {
  ForkKnife,
  CookingPot,
  BowlFood,
  SmileyMelting,
  Smiley,
  SmileyMeh,
  SmileyNervous,
  SmileySad,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { NumberInputModal } from "./NumberInputModal";
import { TimePicker } from "./TimePicker";
import type { PracticeField } from "@/lib/types";

interface FieldInputProps {
  field: PracticeField;
  value: string | number | undefined;
  onChange: (key: string, val: string | number) => void;
  practiceName?: string;
}

export function FieldInput({ field, value, onChange, practiceName }: FieldInputProps) {
  const [modalOpen, setModalOpen] = useState(false);

  switch (field.kind) {
    case "COUNT":
    case "MINUTES":
    case "NUMBER": {
      const numVal = typeof value === "number" ? value : (typeof value === "string" ? parseInt(value) || 0 : 0);
      const displayVal = numVal > 0 ? String(numVal) + (field.kind === "MINUTES" ? "m" : "") : "–";
      const label = field.kind === "MINUTES"
        ? `${practiceName ?? field.key} (minutes)`
        : `${practiceName ?? field.key}`;

      return (
        <>
          <button
            onClick={() => setModalOpen(true)}
            className="min-w-[48px] px-3 py-1.5 rounded-[10px] border border-line bg-surface-2 text-ink font-ui text-sm text-center hover:border-accent transition-colors"
          >
            {displayVal}
          </button>
          <NumberInputModal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            onSubmit={(v) => onChange(field.key, v)}
            label={label}
            defaultValue={numVal}
            min={field.min ?? 0}
            max={field.max ?? 9999}
          />
        </>
      );
    }

    case "TIME": {
      const timeVal = typeof value === "string" ? value : "";
      return (
        <TimePicker
          value={timeVal}
          onChange={(t) => onChange(field.key, t)}
          label={practiceName}
        />
      );
    }

    case "ICONSCALE": {
      // Eating consciously: undereating / balanced / overeating
      const levels = [
        { key: "low", icon: ForkKnife, label: "Under-eating" },
        { key: "steady", icon: BowlFood, label: "Balanced" },
        { key: "high", icon: CookingPot, label: "Over-eating" },
      ];
      return (
        <div className="flex gap-1.5">
          {levels.map((lvl) => {
            const isOn = value === lvl.key;
            const Icon = lvl.icon;
            return (
              <button
                key={lvl.key}
                className={cn(
                  "w-9 h-9 rounded-[10px] grid place-items-center border transition-all",
                  isOn
                    ? "bg-accent text-bg border-accent"
                    : "border-line text-ink-soft hover:border-accent hover:text-accent"
                )}
                onClick={() => onChange(field.key, lvl.key)}
                aria-label={lvl.label}
                aria-pressed={isOn}
                title={lvl.label}
              >
                <Icon size={18} weight="thin" />
              </button>
            );
          })}
        </div>
      );
    }

    case "MOOD": {
      // Continuous progress bar with mood icons
      const moods = [
        { key: "low", icon: SmileySad, label: "Low" },
        { key: "agitated", icon: SmileyNervous, label: "Agitated" },
        { key: "neutral", icon: SmileyMeh, label: "Neutral" },
        { key: "content", icon: Smiley, label: "Content" },
        { key: "blissful", icon: SmileyMelting, label: "Blissful" },
      ];
      const currentIdx = moods.findIndex((m) => m.key === value);
      const progress = currentIdx >= 0 ? ((currentIdx + 1) / moods.length) * 100 : 0;
      const SelectedIcon = currentIdx >= 0 ? moods[currentIdx].icon : null;

      return (
        <div className="flex items-center gap-3 min-w-[160px]">
          {/* Continuous progress bar */}
          <div
            className="relative flex-1 h-3 rounded-full bg-surface-2 border border-line cursor-pointer overflow-hidden"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const pct = x / rect.width;
              const idx = Math.min(moods.length - 1, Math.floor(pct * moods.length));
              onChange(field.key, moods[idx].key);
            }}
          >
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-accent transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
          {/* Selected mood icon */}
          {SelectedIcon ? (
            <SelectedIcon size={28} weight="thin" className="text-accent shrink-0" />
          ) : (
            <SmileyMeh size={28} weight="thin" className="text-ink-soft shrink-0 opacity-30" />
          )}
        </div>
      );
    }

    default:
      return null;
  }
}

// Numbered checkbox buttons (1, 2, etc.)
export function CountCheckboxes({
  value,
  max,
  onChange,
}: {
  value: number;
  max: number;
  onChange: (val: number) => void;
}) {
  return (
    <div className="flex gap-1.5">
      {Array.from({ length: max }).map((_, i) => {
        const num = i + 1;
        const isOn = value >= num;
        return (
          <button
            key={num}
            onClick={() => onChange(isOn && value === num ? num - 1 : num)}
            className={cn(
              "w-[30px] h-[30px] rounded-full grid place-items-center transition-all text-xs font-ui font-medium",
              isOn
                ? "bg-good border-[1.6px] border-good text-white"
                : "border-[1.6px] border-line text-ink-soft"
            )}
            aria-label={`${num}`}
            aria-pressed={isOn}
          >
            {num}
          </button>
        );
      })}
    </div>
  );
}

// Done checkbox matching the demo: 30px circle, 1.6px line border, green fill + white ✓
export function DoneCheckbox({
  done,
  onToggle,
}: {
  done: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "w-[30px] h-[30px] rounded-full grid place-items-center transition-all duration-250",
        done
          ? "bg-good border-[1.6px] border-good text-white"
          : "border-[1.6px] border-line text-transparent hover:border-ink-soft"
      )}
      aria-pressed={done}
      aria-label="Done"
    >
      <span className="text-[16px] leading-none font-serif">✓</span>
    </button>
  );
}
