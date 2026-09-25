"use client";

import { useState } from "react";
import { CalendarBlank } from "@phosphor-icons/react";
import { today, addDays, weekStart as getWeekStart } from "@/lib/dates";
import { RoundArrowButton } from "./Arrows";
import { Calendar, PickerPanel } from "./pickers";

interface DatePickerProps {
  value: string; // YYYY-MM-DD (the Monday, in week mode)
  onChange: (date: string) => void;
  mode: "day" | "week";
  disableFuture?: boolean;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Previous / date / next, with the calendar one tap away. */
export function DatePicker({ value, onChange, mode, disableFuture = true }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const todayStr = today();
  const step = mode === "week" ? 7 : 1;
  const canGoNext = !disableFuture || addDays(value, step) <= (mode === "week" ? getWeekStart(todayStr) : todayStr);

  function label() {
    const d = new Date(value + "T12:00:00");
    if (mode === "week") {
      const e = new Date(addDays(value, 6) + "T12:00:00");
      return `${DAY_NAMES[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()} – ${MONTHS[e.getMonth()]} ${e.getDate()}`;
    }
    return `${value === todayStr ? "Today · " : ""}${DAY_NAMES[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
  }

  return (
    <div className="flex items-center justify-between gap-3 mb-4">
      <RoundArrowButton dir="left" aria-label={mode === "week" ? "Previous week" : "Previous day"} onClick={() => onChange(addDays(value, -step))} />
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="press inline-flex items-center gap-2 h-10 px-3 rounded-[12px] font-serif text-[16.5px] text-ink hover:bg-surface tabular"
      >
        {label()}
        <CalendarBlank size={16} className="text-ink-soft" />
      </button>
      <RoundArrowButton dir="right" aria-label={mode === "week" ? "Next week" : "Next day"} disabled={!canGoNext} onClick={() => canGoNext && onChange(addDays(value, step))} />

      <PickerPanel
        open={open}
        onClose={() => setOpen(false)}
        title={mode === "week" ? "Choose a week" : "Choose a day"}
        footer={
          <button
            type="button"
            onClick={() => { onChange(mode === "week" ? getWeekStart(todayStr) : todayStr); setOpen(false); }}
            className="press flex-1 h-11 rounded-[14px] bg-accent-soft text-accent font-ui text-[14px] font-semibold"
          >
            {mode === "week" ? "This week" : "Today"}
          </button>
        }
      >
        <Calendar
          value={value}
          week={mode === "week"}
          max={disableFuture ? todayStr : undefined}
          onChange={(d) => { onChange(d); setOpen(false); }}
        />
      </PickerPanel>
    </div>
  );
}
