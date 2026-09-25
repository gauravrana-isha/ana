"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { today } from "@/lib/dates";
import { cellSummary, specFor } from "@/lib/practiceSpec";
import type { Practice, DayLogEntries } from "@/lib/types";
import { PracticeIcon } from "./PracticeIcon";

interface WeeklyTableProps {
  practices: Practice[];
  weekDays: string[];
  dayLogs: Record<string, DayLogEntries>;
  onCellTap?: (practice: Practice, date: string) => void;
}

const DAY_LABELS = ["Su", "M", "Tu", "W", "Th", "F", "Sa"];

/** The week at a glance: each cell shows what matters for that practice. */
export function WeeklyTable({ practices, weekDays, dayLogs, onCellTap }: WeeklyTableProps) {
  const todayStr = today();
  const rows = useMemo(() => practices.filter((p) => p.name !== "Mood").map((p) => ({ p, spec: specFor(p) })), [practices]);

  return (
    <div className="overflow-x-auto -mx-2 px-2">
      <table className="w-full min-w-[560px] border-separate border-spacing-0">
        <thead>
          <tr>
            <th className="sticky left-0 z-[2] bg-bg text-left font-ui text-[12px] font-semibold text-ink-soft py-2 pr-3 min-w-[150px]">Practice</th>
            {weekDays.map((d) => {
              const date = new Date(d + "T12:00:00");
              const isToday = d === todayStr;
              return (
                <th key={d} className="text-center py-2 w-[60px]">
                  <span className={cn("block font-ui text-[12px] font-semibold", isToday ? "text-accent" : "text-ink-soft")}>{DAY_LABELS[date.getDay()]}</span>
                  <span className={cn("block font-ui text-[11px] tabular", isToday ? "text-accent" : "text-ink-soft/70")}>{date.getDate()}</span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ p, spec }) => (
            <tr key={p.id}>
              <td className="sticky left-0 z-[1] bg-bg border-t border-line py-2.5 pr-3">
                <span className="flex items-center gap-2 min-w-0">
                  <PracticeIcon name={p.name} iconName={p.iconName} catalogId={p.catalogId} size={24} />
                  <span className="font-serif text-[14px] text-ink truncate max-w-[150px]">{p.name}</span>
                </span>
              </td>
              {weekDays.map((day) => {
                const future = day > todayStr;
                const summary = future ? null : cellSummary(spec, dayLogs[day]?.[p.id]);
                return (
                  <td key={day} className="border-t border-line p-1 text-center">
                    <button
                      type="button"
                      disabled={future}
                      onClick={() => onCellTap?.(p, day)}
                      aria-label={`${p.name}, ${new Date(day + "T12:00:00").toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" })}: ${summary?.text ?? "nothing logged"}`}
                      className={cn(
                        "press w-full h-10 rounded-[10px] font-ui text-[12.5px] tabular transition-colors",
                        future ? "cursor-default" : "hover:bg-surface",
                        day === todayStr && "bg-accent-soft/50"
                      )}
                    >
                      {summary ? (
                        <span className={cn("font-semibold", summary.muted ? "text-ink-soft/70 font-medium" : summary.text === "✓" ? "text-good text-[15px]" : "text-accent")}>{summary.text}</span>
                      ) : (
                        <span className="text-ink-soft/30">·</span>
                      )}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 font-ui text-[12px] text-ink-soft">
        Faded values are defaults, used on days you didn&rsquo;t change them. Tap a day to edit.
      </p>
    </div>
  );
}
