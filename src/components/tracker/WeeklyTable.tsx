"use client";

import { Check, X, ForkKnife, BowlFood, CookingPot } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type { Practice, DayLogEntries } from "@/lib/types";

interface WeeklyTableProps {
  practices: Practice[];
  weekDays: string[];
  dayLogs: Record<string, DayLogEntries>;
  onCellTap?: (practice: Practice, date: string) => void;
}

const DAY_LABELS = ["Su", "M", "Tu", "W", "Th", "F", "Sa"];

export function WeeklyTable({ practices, weekDays, dayLogs, onCellTap }: WeeklyTableProps) {
  const headers = weekDays.map((d) => {
    const date = new Date(d + "T12:00:00");
    return DAY_LABELS[date.getDay()];
  });

  return (
    <div className="overflow-x-auto -mx-2">
      <table className="w-full text-sm min-w-[520px]">
        <thead>
          <tr>
            <th className="sticky left-0 z-[2] bg-bg text-left font-ui text-[11px] text-ink-soft uppercase tracking-wider py-2 pr-3 pl-2 min-w-[120px]">
              Practice
            </th>
            {headers.map((label, i) => (
              <th key={i} className="text-center font-ui text-[11px] text-ink-soft uppercase tracking-wider py-2 w-[52px]">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {practices.filter((p) => p.name !== "Mood").map((practice) => (
            <tr key={practice.id} className="border-t border-line">
              <td className="sticky left-0 z-[1] bg-bg font-serif text-[13px] text-ink py-3 pr-3 pl-2 truncate max-w-[120px]">
                {practice.name}
              </td>
              {weekDays.map((day) => {
                const entry = dayLogs[day]?.[practice.id];
                return (
                  <td
                    key={day}
                    className="text-center py-3 cursor-pointer hover:bg-surface-2 rounded transition-colors"
                    onClick={() => onCellTap?.(practice, day)}
                  >
                    <CellValue practice={practice} entry={entry} />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CellValue({ practice, entry }: {
  practice: Practice;
  entry?: { done?: boolean; values?: Record<string, string | number> };
}) {
  if (!entry) {
    return <span className="text-ink-soft opacity-20">·</span>;
  }

  const values = entry.values ?? {};
  const name = practice.name;

  switch (name) {
    case "Wake up":
    case "Bedtime": {
      const t = values.time;
      if (!t) return <span className="text-ink-soft opacity-20">·</span>;
      // Show just HH:MM
      return <span className="font-ui text-[11px] text-ink">{String(t).slice(0, 5)}</span>;
    }

    case "Shambhavi": {
      const count = typeof values.count === "number" ? values.count : 0;
      if (!count) return <span className="text-ink-soft opacity-20">·</span>;
      return <span className="font-hand text-base text-accent">{count}/2</span>;
    }

    case "Shakti Chalana": {
      const times = typeof values.times === "number" ? values.times : 0;
      const kapal = typeof values.kapal === "number" ? values.kapal : 0;
      if (!times && !kapal) return <span className="text-ink-soft opacity-20">·</span>;
      return (
        <span className="font-ui text-[11px] text-ink">
          {times > 0 && <span className="text-accent">{times}×</span>}
          {kapal > 0 && <span className="text-ink-soft ml-0.5">{kapal}</span>}
        </span>
      );
    }

    case "Shoonya": {
      const count = typeof values.count === "number" ? values.count : 0;
      if (!count) return <span className="text-ink-soft opacity-20">·</span>;
      return <span className="font-hand text-base text-accent">{count}/2</span>;
    }

    case "Surya Kriya":
    case "Yogasanas":
    case "Breath Watching":
    case "Samyama":
    case "Dhyanalinga":
    case "Lingabhairavi": {
      const min = typeof values.min === "number" ? values.min : 0;
      if (!entry.done && !min) return <X size={12} weight="thin" className="text-ink-soft inline opacity-40" />;
      if (entry.done && min) return <span className="font-hand text-base text-accent">{min}m</span>;
      if (entry.done) return <Check size={13} weight="bold" className="text-good inline" />;
      return <span className="font-ui text-[11px] text-ink-soft">{min}m</span>;
    }

    case "Eating consciously": {
      const level = values.level;
      if (!level) return <span className="text-ink-soft opacity-20">·</span>;
      if (level === "low") return <ForkKnife size={14} weight="thin" className="text-accent inline" />;
      if (level === "steady") return <BowlFood size={14} weight="thin" className="text-accent inline" />;
      if (level === "high") return <CookingPot size={14} weight="thin" className="text-accent inline" />;
      return <span className="text-ink-soft">·</span>;
    }

    case "Mood": {
      const mood = values.mood as string | undefined;
      if (!mood) return <span className="text-ink-soft opacity-20">·</span>;
      const moodMap: Record<string, string> = {
        blissful: "😊",
        content: "🙂",
        neutral: "😐",
        agitated: "😤",
        low: "😔",
      };
      // Use text symbols instead of emoji to match our no-emoji rule
      const symbolMap: Record<string, string> = {
        blissful: "●●●●●",
        content: "●●●●○",
        neutral: "●●●○○",
        agitated: "●●○○○",
        low: "●○○○○",
      };
      return <span className="font-ui text-[8px] text-accent tracking-tight">{symbolMap[mood] ?? "·"}</span>;
    }

    default: {
      // Generic: show done state or first value
      if (entry.done) return <Check size={13} weight="bold" className="text-good inline" />;
      const firstVal = Object.values(values)[0];
      if (firstVal !== undefined && firstVal !== "" && firstVal !== 0) {
        return <span className="font-ui text-[11px] text-ink">{String(firstVal)}</span>;
      }
      return <X size={12} weight="thin" className="text-ink-soft inline opacity-40" />;
    }
  }
}
